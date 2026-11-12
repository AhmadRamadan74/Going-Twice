"""Production must refuse SQLite, placeholder secrets, and localhost CORS."""

import pytest

from app.core.config import Settings


def _settings(**overrides) -> Settings:
    values = {
        "ENVIRONMENT": "production",
        "JWT_SECRET_KEY": "production-secret-key-that-is-long-enough-32",
        "CORS_ORIGINS": "https://goingtwice.eg,https://www.goingtwice.eg",
        "FRONTEND_URL": "https://goingtwice.eg",
        "POSTGRES_SERVER": "db.internal",
        "POSTGRES_USER": "goingtwice",
        "POSTGRES_PASSWORD": "a-strong-db-password",
        "POSTGRES_DB": "goingtwice",
        "MAIL_ENABLED": True,
        "MAIL_PROVIDER": "smtp",
        "MAIL_FROM": "noreply@goingtwice.eg",
        "SMTP_HOST": "smtp.zeptomail.com",
        "DATABASE_URL_OVERRIDE": "",
        "AUTH_ALLOW_MAGIC_OTP_BYPASS": False,
        "AUTH_EXPOSE_VERIFICATION_CODE": False,
        "CONTACT_INBOX": "hello@goingtwice.eg",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_local_sqlite_is_allowed():
    settings = _settings(
        ENVIRONMENT="local",
        DATABASE_URL_OVERRIDE="sqlite:///./goingtwice.db",
        JWT_SECRET_KEY="dev-only-change-me-going-twice-min-32-chars-long",
        CORS_ORIGINS="http://localhost:3000",
        FRONTEND_URL="http://localhost:3000",
        MAIL_ENABLED=False,
        MAIL_PROVIDER="console",
    )
    assert settings.production_blockers() == []
    settings.assert_ready()


def test_production_accepts_a_complete_config():
    settings = _settings()
    assert settings.production_blockers() == []
    assert settings.docs_enabled is False
    settings.assert_ready()


def test_production_rejects_the_default_jwt():
    settings = _settings(JWT_SECRET_KEY="dev-only-change-me-going-twice-min-32-chars-long")
    assert any("JWT_SECRET_KEY" in item for item in settings.production_blockers())
    with pytest.raises(RuntimeError, match="Refusing to start"):
        settings.assert_ready()


def test_production_rejects_sqlite_override():
    settings = _settings(DATABASE_URL_OVERRIDE="sqlite:///./goingtwice.db")
    blockers = settings.production_blockers()
    assert any("DATABASE_URL_OVERRIDE" in item for item in blockers)


def test_production_rejects_localhost_cors_and_frontend():
    settings = _settings(
        CORS_ORIGINS="http://localhost:3000",
        FRONTEND_URL="http://localhost:3000",
    )
    blockers = " ".join(settings.production_blockers())
    assert "CORS_ORIGINS" in blockers
    assert "FRONTEND_URL" in blockers


def test_production_rejects_console_mail_and_magic_otp():
    settings = _settings(
        MAIL_ENABLED=False,
        MAIL_PROVIDER="console",
        AUTH_ALLOW_MAGIC_OTP_BYPASS=True,
        AUTH_EXPOSE_VERIFICATION_CODE=True,
    )
    blockers = " ".join(settings.production_blockers())
    assert "MAIL_ENABLED" in blockers
    assert "MAIL_PROVIDER" in blockers
    assert "AUTH_ALLOW_MAGIC_OTP_BYPASS" in blockers
    assert "AUTH_EXPOSE_VERIFICATION_CODE" in blockers


def test_production_rejects_a_missing_contact_inbox():
    settings = _settings(CONTACT_INBOX="")
    assert any("CONTACT_INBOX" in item for item in settings.production_blockers())


def test_cors_origins_drop_trailing_slashes():
    settings = _settings(CORS_ORIGINS="https://goingtwice.eg/, https://www.goingtwice.eg/")
    assert settings.cors_origins_list == [
        "https://goingtwice.eg",
        "https://www.goingtwice.eg",
    ]


def test_postgres_password_is_url_encoded():
    settings = _settings(POSTGRES_PASSWORD="p@ss/word")
    assert "p%40ss%2Fword" in settings.DATABASE_URL


def test_local_keeps_swagger():
    assert _settings(ENVIRONMENT="local").docs_enabled is True
