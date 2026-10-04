"""Auth router — matches frontend/src/stores/auth.ts:

  GET  /auth/config   -> {google_enabled}
  GET  /auth/me       -> User
  POST /auth/register {email,name,password} -> User (sets cookies)
  POST /auth/login    {email,password}      -> User (sets cookies)
  POST /auth/refresh  -> 204 (rotates cookies)
  POST /auth/logout   -> 204 (clears cookies)
  GET  /auth/google, /auth/google/callback  -> Google OAuth (when configured)
"""

import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import ai
from ..config import settings
from ..db import get_db
from ..models import RefreshToken, User
from ..rate_limit import client_ip, limiter
from ..security import (
    clear_auth_cookies,
    get_current_user,
    hash_password,
    set_auth_cookies,
    user_id_and_jti_from_refresh_cookie,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# A page that fires several API calls right as the access token expires sends
# several /auth/refresh requests carrying the same refresh token. Only the
# first wins the rotation; the others present a just-revoked jti. Within this
# window that's a benign race, not token theft, so don't nuke the session.
REFRESH_REUSE_GRACE = timedelta(seconds=30)


def _as_utc(dt: datetime) -> datetime:
    # SQLite hands back naive datetimes even for timezone=True columns.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class RegisterBody(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


@router.get("/config")
def config():
    return {"google_enabled": settings.google_enabled, **ai.configured_provider_info()}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user.to_public()


@router.post("/register")
def register(body: RegisterBody, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    if not limiter.try_consume("auth.register", ip):
        raise HTTPException(status_code=429, detail="Too many accounts created from this IP recently.")
    email = body.email.lower()
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    set_auth_cookies(response, user.id, db=db)
    return user.to_public()


@router.post("/login")
def login(body: LoginBody, request: Request, response: Response, db: Session = Depends(get_db)):
    """Login with per-IP rate limiting.

    Important: rate limits are consumed *before* credential verification so a
    single IP can't hammer the verify_password work loop. The same cap applies
    whether the email exists or not — prevents account enumeration timing
    attacks from using rate-limit side-channels as a signal.
    """
    ip = client_ip(request)
    if not limiter.try_consume("auth.login", ip):
        raise HTTPException(status_code=429, detail="Too many login attempts — please wait a minute and try again.")
    email = body.email.lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_auth_cookies(response, user.id, db=db)
    return user.to_public()


@router.post("/refresh", status_code=204)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Refresh-token rotation.

    Valid refresh jti → mark old jti as revoked; issue brand new jti (brand
    new refresh token + brand new access token). If the incoming jti is
    already revoked we detect token-reuse (theft) and invalidate *all* the
    user's refresh tokens as a safety measure.
    """
    decoded = user_id_and_jti_from_refresh_cookie(request)
    if decoded is None:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Session expired — please sign in again")
    user_id, jti = decoded
    user = db.get(User, user_id)
    if user is None:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Session expired — please sign in again")

    row = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if row is None:
        # Old-style (pre-rotation) cookie that doesn't exist in the table —
        # accept once, migrate to a rotation token. Don't invalidate others.
        set_auth_cookies(response, user_id, db=db)
        return

    # Reuse / theft detection: if the row is already revoked, the holder is
    # presenting a stale jti — invalidate the user's whole token family.
    if row.revoked:
        if row.revoked_at and datetime.now(timezone.utc) - _as_utc(row.revoked_at) < REFRESH_REUSE_GRACE:
            set_auth_cookies(response, user_id, db=db)
            return
        db.query(RefreshToken).filter(RefreshToken.user_id == user_id).update(
            {RefreshToken.revoked: True}, synchronize_session=False
        )
        db.commit()
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Session expired — please sign in again")

    row.revoked = True
    row.revoked_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    set_auth_cookies(response, user_id, db=db)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    # Revoke server-side too, so a copied refresh cookie stops working.
    # revoked_at stays NULL on purpose: the reuse grace window is only for
    # rotation races, never for a token the user explicitly signed out of.
    decoded = user_id_and_jti_from_refresh_cookie(request)
    if decoded is not None:
        db.query(RefreshToken).filter(RefreshToken.jti == decoded[1]).update(
            {RefreshToken.revoked: True}, synchronize_session=False
        )
        db.commit()
    clear_auth_cookies(response)


# ---------------------------------------------------------------- Google OAuth

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


@router.get("/google")
def google_start(response: Response):
    if not settings.google_enabled:
        raise HTTPException(status_code=404, detail="Google sign-in is not configured")
    state = secrets.token_urlsafe(24)
    params = httpx.QueryParams(
        client_id=settings.google_client_id,
        redirect_uri=settings.google_redirect_uri,
        response_type="code",
        scope="openid email profile",
        state=state,
    )
    redirect = RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")
    redirect.set_cookie(
        "oauth_state", state, max_age=600, httponly=True, samesite="lax",
        secure=settings.is_production, path="/",
    )
    return redirect


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    if not settings.google_enabled:
        raise HTTPException(status_code=404, detail="Google sign-in is not configured")
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    saved_state = request.cookies.get("oauth_state")
    if not code or not state or not saved_state or not secrets.compare_digest(state, saved_state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.google_redirect_uri,
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=502, detail="Google token exchange failed")
        access_token = token_res.json().get("access_token")
        info_res = await client.get(
            GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        if info_res.status_code != 200:
            raise HTTPException(status_code=502, detail="Could not fetch Google profile")
        info = info_res.json()

    sub = info.get("sub")
    email = (info.get("email") or "").lower()
    if not sub or not email:
        raise HTTPException(status_code=502, detail="Google profile missing id/email")

    user = db.query(User).filter(User.google_sub == sub).first()
    if not user:
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if user:
            user.google_sub = sub  # link Google to existing email account
        else:
            user = User(
                email=email,
                name=info.get("name") or email.split("@")[0],
                google_sub=sub,
                avatar_url=info.get("picture"),
            )
            db.add(user)
    if info.get("picture") and not user.avatar_url:
        user.avatar_url = info["picture"]
    db.commit()
    db.refresh(user)

    redirect = RedirectResponse(settings.frontend_url)
    redirect.delete_cookie("oauth_state", path="/")
    set_auth_cookies(redirect, user.id, db=db)
    return redirect
