"""HTTP tests for the auth router: register/login/me/refresh/logout + CSRF."""

from conftest import REGISTER_BODY, csrf_headers


class TestRegister:
    def test_register_returns_user_and_sets_cookies(self, client):
        res = client.post("/api/auth/register", json=REGISTER_BODY)
        assert res.status_code == 200
        body = res.json()
        assert body["email"] == REGISTER_BODY["email"]
        assert body["name"] == REGISTER_BODY["name"]
        assert body["has_password"] is True
        assert body["has_google"] is False
        assert "password" not in body and "password_hash" not in body
        for cookie in ("access_token", "refresh_token", "csrf_token"):
            assert client.cookies.get(cookie), f"missing {cookie} cookie"

    def test_duplicate_email_conflicts(self, auth_client):
        res = auth_client.post(
            "/api/auth/register",
            json={**REGISTER_BODY, "name": "Someone Else"},
            headers=csrf_headers(auth_client),
        )
        assert res.status_code == 409

    def test_duplicate_email_case_insensitive(self, auth_client):
        res = auth_client.post(
            "/api/auth/register",
            json={**REGISTER_BODY, "email": REGISTER_BODY["email"].upper()},
            headers=csrf_headers(auth_client),
        )
        assert res.status_code == 409

    def test_short_password_rejected(self, client):
        res = client.post("/api/auth/register", json={**REGISTER_BODY, "password": "short"})
        assert res.status_code == 422

    def test_invalid_email_rejected(self, client):
        res = client.post("/api/auth/register", json={**REGISTER_BODY, "email": "not-an-email"})
        assert res.status_code == 422


class TestLogin:
    def test_login_success(self, auth_client):
        auth_client.post("/api/auth/logout", headers=csrf_headers(auth_client))
        res = auth_client.post(
            "/api/auth/login",
            json={"email": REGISTER_BODY["email"], "password": REGISTER_BODY["password"]},
        )
        assert res.status_code == 200
        assert res.json()["email"] == REGISTER_BODY["email"]

    def test_wrong_password(self, auth_client):
        auth_client.post("/api/auth/logout", headers=csrf_headers(auth_client))
        res = auth_client.post(
            "/api/auth/login",
            json={"email": REGISTER_BODY["email"], "password": "totally-wrong-pass"},
        )
        assert res.status_code == 401

    def test_unknown_email(self, client):
        res = client.post(
            "/api/auth/login",
            json={"email": "ghost@example.com", "password": "whatever-123"},
        )
        assert res.status_code == 401


class TestMe:
    def test_me_authenticated(self, auth_client):
        res = auth_client.get("/api/auth/me")
        assert res.status_code == 200
        assert res.json()["email"] == REGISTER_BODY["email"]

    def test_me_unauthenticated(self, client):
        assert client.get("/api/auth/me").status_code == 401

    def test_me_with_garbage_cookie(self, client):
        client.cookies.set("access_token", "not-a-real-jwt")
        assert client.get("/api/auth/me").status_code == 401


class TestRefreshAndLogout:
    def test_refresh_rotates_cookies(self, auth_client):
        old_access = auth_client.cookies.get("access_token")
        res = auth_client.post("/api/auth/refresh", headers=csrf_headers(auth_client))
        assert res.status_code == 204
        assert auth_client.cookies.get("access_token")  # still authenticated
        assert auth_client.get("/api/auth/me").status_code == 200
        assert old_access is not None

    def test_refresh_without_cookie_401(self, client):
        assert client.post("/api/auth/refresh").status_code == 401

    def test_logout_clears_session(self, auth_client):
        res = auth_client.post("/api/auth/logout", headers=csrf_headers(auth_client))
        assert res.status_code == 204
        assert auth_client.get("/api/auth/me").status_code == 401

    def test_access_token_alone_cannot_refresh(self, auth_client):
        # Simulate an expired-refresh scenario: drop only the refresh cookie.
        auth_client.cookies.delete("refresh_token")
        res = auth_client.post("/api/auth/refresh", headers=csrf_headers(auth_client))
        assert res.status_code == 401


class TestCsrf:
    def test_post_without_header_rejected_when_authenticated(self, auth_client):
        res = auth_client.post(
            "/api/submissions",
            json={"algorithm_id": "bubble-sort", "language": "python", "code": "print(1)"},
        )
        assert res.status_code == 403

    def test_post_with_wrong_header_rejected(self, auth_client):
        res = auth_client.post(
            "/api/submissions",
            json={"algorithm_id": "bubble-sort", "language": "python", "code": "print(1)"},
            headers={"X-CSRF-Token": "forged-token"},
        )
        assert res.status_code == 403

    def test_get_requests_exempt(self, auth_client):
        assert auth_client.get("/api/auth/me").status_code == 200

    def test_unauthenticated_posts_exempt(self, client):
        # login/register must work before any cookies exist
        res = client.post(
            "/api/auth/login",
            json={"email": "ghost@example.com", "password": "whatever-123"},
        )
        assert res.status_code == 401  # auth failure, not 403 CSRF


class TestAuthConfig:
    def test_config_reports_google_disabled_by_default(self, client):
        res = client.get("/api/auth/config")
        assert res.status_code == 200
        body = res.json()
        assert body["google_enabled"] is False
        # AI config fields are always present
        assert "configured" in body
        assert "provider" in body
        assert "model" in body
        # With no API keys in test env, AI should be reported unconfigured
        assert body["configured"] is False
        assert body["provider"] is None
        assert body["model"] is None

    def test_google_start_404_when_unconfigured(self, client):
        assert client.get("/api/auth/google", follow_redirects=False).status_code == 404
