"""Unit tests for app.security primitives (no HTTP involved)."""

from datetime import timedelta

import jwt as pyjwt
import pytest

from app.config import settings
from app.security import (
    ALGORITHM,
    _decode_token,
    _make_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_roundtrip(self):
        h = hash_password("s3cret-passw0rd")
        assert verify_password("s3cret-passw0rd", h)

    def test_wrong_password_rejected(self):
        h = hash_password("s3cret-passw0rd")
        assert not verify_password("wrong", h)

    def test_hashes_are_salted(self):
        assert hash_password("same") != hash_password("same")

    def test_hash_format(self):
        scheme, iterations, salt, digest = hash_password("x").split("$")
        assert scheme == "pbkdf2_sha256"
        assert int(iterations) >= 100_000
        assert len(salt) == 32 and len(digest) == 64

    @pytest.mark.parametrize("stored", ["", "garbage", "a$b$c", None])
    def test_malformed_stored_hash_rejected(self, stored):
        assert not verify_password("anything", stored)


class TestJwt:
    def test_roundtrip(self):
        _, token = _make_token(42, "access", timedelta(minutes=5))
        assert _decode_token(token, "access")[0] == 42

    def test_wrong_type_rejected(self):
        _, token = _make_token(42, "refresh", timedelta(minutes=5))
        assert _decode_token(token, "access") is None

    def test_expired_rejected(self):
        _, token = _make_token(42, "access", timedelta(seconds=-1))
        assert _decode_token(token, "access") is None

    def test_tampered_signature_rejected(self):
        _, token = _make_token(42, "access", timedelta(minutes=5))
        forged = pyjwt.encode(
            pyjwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM]),
            "attacker-key-attacker-key-attacker-key",
            algorithm=ALGORITHM,
        )
        assert _decode_token(forged, "access") is None

    def test_alg_none_rejected(self):
        _, token = _make_token(42, "access", timedelta(minutes=5))
        payload = pyjwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITHM],
        )
        forged = pyjwt.encode(payload, key=None, algorithm="none")
        assert _decode_token(forged, "access") is None

    def test_garbage_rejected(self):
        assert _decode_token("not.a.jwt", "access") is None
