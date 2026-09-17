"""Tests for production-config validation (app.config.Settings)."""

import pytest

from app.config import Settings


def make_settings(**overrides) -> Settings:
    s = Settings()
    for k, v in overrides.items():
        setattr(s, k, v)
    return s


class TestValidateProduction:
    def test_development_allows_dev_secret(self):
        make_settings(env="development").validate_production()  # no raise

    def test_production_rejects_dev_secret(self):
        s = make_settings(env="production")  # still on the dev fallback
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            s.validate_production()

    def test_production_rejects_short_secret(self):
        s = make_settings(env="production", jwt_secret="short-but-not-dev")
        with pytest.raises(RuntimeError, match="32"):
            s.validate_production()

    def test_production_accepts_real_secret(self):
        s = make_settings(env="production", jwt_secret="x" * 64)
        s.validate_production()  # no raise

    def test_is_production_flag(self):
        assert make_settings(env="production").is_production
        assert not make_settings(env="development").is_production
