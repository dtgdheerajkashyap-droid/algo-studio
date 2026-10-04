"""Auth primitives: password hashing (PBKDF2), JWT cookies, CSRF double-submit.

Cookie scheme (all set by set_auth_cookies):
  access_token  — httpOnly, JWT, short-lived; identifies the user on every request
  refresh_token — httpOnly, JWT (type=refresh), longer-lived; only used by /auth/refresh
  csrf_token    — NOT httpOnly; frontend echoes it back as X-CSRF-Token on non-GET

Refresh token rotation (§C5): every refresh JWT carries a unique jti. Each
refresh cycle revokes the presented jti and issues a brand new jti. Reusing a
revoked jti invalidates ALL refresh tokens for the user (token theft signal).
"""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import RefreshToken, User

ALGORITHM = "HS256"
PBKDF2_ITERATIONS = 260_000
_PASSWORD_SCHEME = "pbkdf2_sha256"
_PASSWORD_SEPARATOR = "$"


# ---------------------------------------------------------------- passwords


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS
    ).hex()
    parts = [_PASSWORD_SCHEME, str(PBKDF2_ITERATIONS), salt, digest]
    return _PASSWORD_SEPARATOR.join(parts)


def verify_password(password: str, stored: str) -> bool:
    try:
        parts = stored.split(_PASSWORD_SEPARATOR)
        if len(parts) != 4:
            return False
        scheme, iterations, salt, digest = parts
        if scheme != _PASSWORD_SCHEME:
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), int(iterations)
        ).hex()
        return hmac.compare_digest(candidate, digest)
    except (ValueError, TypeError, AttributeError):
        return False


# ---------------------------------------------------------------- JWT cookies

def _make_token(user_id: int, token_type: str, lifetime: timedelta, jti: str | None = None) -> tuple[str, str]:
    """Return (jti, encoded_jwt). A fresh jti is generated unless provided."""
    now = datetime.now(timezone.utc)
    token_jti = jti or uuid.uuid4().hex
    return token_jti, jwt.encode(
        {"sub": str(user_id), "type": token_type, "iat": now, "exp": now + lifetime, "jti": token_jti},
        settings.jwt_secret,
        algorithm=ALGORITHM,
    )


def _decode_token(token: str, expected_type: str) -> tuple[int, str] | None:
    """Return (user_id, jti) or None if invalid/expired/wrong-type."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    jti = payload.get("jti")
    if not jti or not isinstance(jti, str):
        return None
    try:
        return int(payload["sub"]), jti
    except (KeyError, ValueError):
        return None


def _issue_refresh_jti(db: Session, user_id: int) -> tuple[str, str]:
    """Persist a new refresh-token row; return (jti, encoded_jwt)."""
    lifetime = timedelta(days=settings.refresh_token_days)
    jti, encoded = _make_token(user_id, "refresh", lifetime)
    row = RefreshToken(
        jti=jti,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + lifetime,
    )
    db.add(row)
    db.commit()
    return jti, encoded


def _purge_expired(db: Session) -> None:
    """Best-effort cleanup of rows whose expiration is in the past."""
    try:
        now = datetime.now(timezone.utc)
        db.query(RefreshToken).filter(RefreshToken.expires_at < now).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()


def set_auth_cookies(response: Response, user_id: int, db: Session | None = None) -> None:
    """Issue access + refresh + csrf tokens. Refresh token is rotation-enabled when db is given.

    For login/register/google-callback we always have a db session; for the
    legacy code path where no db was passed we fall back to a non-persisted
    refresh (no rotation — still secure but not one-time-use).
    """
    access = _make_token(
        user_id, "access", timedelta(minutes=settings.access_token_minutes)
    )[1]

    refresh = None
    if db is not None:
        _purge_expired(db)
        refresh = _issue_refresh_jti(db, user_id)[1]
    if refresh is None:
        refresh = _make_token(
            user_id, "refresh", timedelta(days=settings.refresh_token_days)
        )[1]

    max_age_refresh = settings.refresh_token_days * 86400
    # Secure cookies in production (HTTPS); lax SameSite keeps OAuth redirects working.
    secure = settings.is_production
    common = {"httponly": True, "samesite": "lax", "secure": secure, "path": "/"}
    response.set_cookie(
        "access_token", access, max_age=settings.access_token_minutes * 60, **common
    )
    response.set_cookie("refresh_token", refresh, max_age=max_age_refresh, **common)
    # CSRF cookie is readable by JS on purpose (double-submit pattern).
    response.set_cookie(
        "csrf_token",
        secrets.token_urlsafe(32),
        max_age=max_age_refresh,
        httponly=False,
        samesite="lax",
        secure=secure,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    secure = settings.is_production
    for name in ("access_token", "refresh_token", "csrf_token"):
        response.delete_cookie(name, path="/", secure=secure, samesite="lax")


def user_id_and_jti_from_refresh_cookie(request: Request) -> tuple[int, str] | None:
    token = request.cookies.get("refresh_token")
    return _decode_token(token, "refresh") if token else None


def user_id_from_refresh_cookie(request: Request) -> int | None:
    """Deprecated — kept for the refresh route migration path. Prefer user_id_and_jti_from_refresh_cookie."""
    res = user_id_and_jti_from_refresh_cookie(request)
    return res[0] if res else None


# ---------------------------------------------------------------- dependencies

def check_csrf(request: Request) -> None:
    """Double-submit check for state-changing requests.

    Only enforced when the request carries auth cookies — login/register happen
    before any cookies exist, and unauthenticated requests can't ride a session.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    if not (request.cookies.get("access_token") or request.cookies.get("refresh_token")):
        return
    cookie = request.cookies.get("csrf_token")
    header = request.headers.get("X-CSRF-Token")
    if not cookie or not header or not hmac.compare_digest(cookie, header):
        raise HTTPException(status_code=403, detail="CSRF token missing or invalid")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    decoded = _decode_token(token, "access") if token else None
    user_id = decoded[0] if decoded else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get("access_token")
    decoded = _decode_token(token, "access") if token else None
    user_id = decoded[0] if decoded else None
    return db.get(User, user_id) if user_id is not None else None
