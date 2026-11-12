from typing import List
from urllib.parse import quote_plus, urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict

_PLACEHOLDER_MARKERS = ("change-me", "dev-only", "your-domain", "example", "replace-me")
_WEAK_PASSWORDS = {"", "postgres", "password", "change-me", "changeme"}
_DEFAULT_JWT = "dev-only-change-me-going-twice-min-32-chars-long"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "local"
    API_PORT: int = 8000
    PROJECT_NAME: str = "Going Twice API"
    VERSION: str = "0.2.0"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    #: Full SQLAlchemy URL. When set it wins over the POSTGRES_* parts, which
    #: lets the test suite run against SQLite without a database server.
    DATABASE_URL_OVERRIDE: str = ""

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "goingtwice"
    POSTGRES_PORT: str = "5432"

    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT_SECONDS: int = 30
    DB_POOL_RECYCLE_SECONDS: int = 1800

    JWT_SECRET_KEY: str = "dev-only-change-me-going-twice-min-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    PASSWORD_MIN_LENGTH: int = 6
    BCRYPT_ROUNDS: int = 12
    # Off by default so a missing ENVIRONMENT can never hand out a magic code.
    AUTH_ALLOW_MAGIC_OTP_BYPASS: bool = False
    #: When true *and* the env is local/test, /auth responses include debug_code.
    AUTH_EXPOSE_VERIFICATION_CODE: bool = False
    FRONTEND_URL: str = "http://localhost:3000"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60

    GLOBAL_RATE_LIMIT: str = "120/minute"

    # ── Email ─────────────────────────────────────────────────────────
    #: When false every send is logged instead of delivered.
    MAIL_ENABLED: bool = False
    #: console | resend | smtp
    MAIL_PROVIDER: str = "console"
    MAIL_FROM: str = "no-reply@goingtwice.eg"
    MAIL_FROM_NAME: str = "Going Twice"
    MAIL_API_KEY: str = ""
    MAIL_TIMEOUT_SECONDS: int = 10
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    #: Staff inbox for the public contact form. Comma-separated.
    CONTACT_INBOX: str = ""

    # ── Listing photos ───────────────────────────────────────────────
    #: Used by the main-photo white-background helper. Empty disables it.
    GEMINI_API_KEY: str = ""

    # ── Email verification ────────────────────────────────────────────
    EMAIL_VERIFICATION_CODE_LENGTH: int = 6
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 10
    EMAIL_VERIFICATION_MAX_ATTEMPTS: int = 5
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: int = 60
    #: Accepted by /auth/verify-email when the bypass is on outside production.
    AUTH_MAGIC_OTP_CODE: str = "000000"

    # ── Uploads ───────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 8
    MAX_UPLOAD_FILES: int = 7

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            return self.DATABASE_URL_OVERRIDE
        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        return (
            f"postgresql://{user}:{password}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        """Exact origins the browser may call. Trailing slashes never match."""
        return [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def contact_inbox_list(self) -> List[str]:
        found: List[str] = []
        for part in (self.CONTACT_INBOX or "").split(","):
            address = part.strip().lower()
            if "@" in address and address not in found:
                found.append(address)
        return found

    @property
    def docs_enabled(self) -> bool:
        """Swagger stays on for local/test and is off once ENVIRONMENT is production."""
        return not self.is_production

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod", "live"}

    @property
    def is_development(self) -> bool:
        """
        A developer machine or the test suite.

        Deliberately an allowlist rather than ``not is_production``: an
        unrecognised ENVIRONMENT (``staging``, a typo, an empty value) must
        never unlock a shortcut.
        """
        return self.ENVIRONMENT.lower() in {
            "local",
            "development",
            "dev",
            "test",
            "testing",
        }

    @property
    def expose_password_reset_link(self) -> bool:
        """
        Returns the reset link in the API response.

        This hands out an account-takeover token to anyone who can call
        forgot-password, so it is limited to development environments.
        """
        return self.is_development

    @property
    def expose_verification_code(self) -> bool:
        """OTP in the API response — only with an explicit opt-in on a dev box."""
        return self.AUTH_EXPOSE_VERIFICATION_CODE and self.is_development

    @property
    def magic_otp_bypass_enabled(self) -> bool:
        """The fixed-code bypass needs an explicit opt-in *and* a dev env."""
        return self.AUTH_ALLOW_MAGIC_OTP_BYPASS and self.is_development

    def production_blockers(self) -> List[str]:
        """Why this process must not go live. Empty outside production."""
        if not self.is_production:
            return []

        blockers: List[str] = []
        secret = (self.JWT_SECRET_KEY or "").strip()
        if len(secret) < 32 or secret == _DEFAULT_JWT or _is_placeholder(secret):
            blockers.append(
                "JWT_SECRET_KEY must be a unique secret of at least 32 characters"
            )

        if (self.DATABASE_URL_OVERRIDE or "").strip():
            blockers.append("DATABASE_URL_OVERRIDE is not allowed in production")
        if self.DATABASE_URL.lower().startswith("sqlite"):
            blockers.append("Production must use Postgres, not SQLite")
        if self.POSTGRES_PASSWORD.strip().lower() in _WEAK_PASSWORDS:
            blockers.append("POSTGRES_PASSWORD must not be a default or empty value")
        if not (self.POSTGRES_SERVER or "").strip():
            blockers.append("POSTGRES_SERVER is required")

        origins = self.cors_origins_list
        if not origins:
            blockers.append("CORS_ORIGINS must list the live frontend origin")
        for origin in origins:
            parsed = urlparse(origin)
            host = (parsed.hostname or "").lower()
            if origin == "*" or parsed.scheme not in {"https"}:
                blockers.append(
                    f"CORS_ORIGINS must be HTTPS origins, not {origin!r}"
                )
            if host in {"localhost", "127.0.0.1", "0.0.0.0"}:
                blockers.append("CORS_ORIGINS cannot include localhost in production")

        frontend = (self.FRONTEND_URL or "").strip().rstrip("/")
        parsed_front = urlparse(frontend)
        if parsed_front.scheme != "https" or not parsed_front.hostname:
            blockers.append("FRONTEND_URL must be the live HTTPS site")
        elif parsed_front.hostname.lower() in {"localhost", "127.0.0.1"}:
            blockers.append("FRONTEND_URL cannot be localhost in production")

        if self.AUTH_ALLOW_MAGIC_OTP_BYPASS:
            blockers.append("AUTH_ALLOW_MAGIC_OTP_BYPASS cannot be enabled in production")
        if self.AUTH_EXPOSE_VERIFICATION_CODE:
            blockers.append("AUTH_EXPOSE_VERIFICATION_CODE cannot be enabled in production")

        if not self.MAIL_ENABLED:
            blockers.append("MAIL_ENABLED must be true so OTP and resets actually send")
        provider = (self.MAIL_PROVIDER or "").strip().lower()
        if provider == "console":
            blockers.append("MAIL_PROVIDER cannot be console in production")
        if provider == "smtp" and not (self.SMTP_HOST or "").strip():
            blockers.append("SMTP_HOST is required when MAIL_PROVIDER=smtp")
        if provider == "resend" and not (self.MAIL_API_KEY or "").strip():
            blockers.append("MAIL_API_KEY is required when MAIL_PROVIDER=resend")
        if _is_placeholder(self.MAIL_FROM):
            blockers.append("MAIL_FROM must be a verified sender, not a placeholder")
        if not self.contact_inbox_list or _is_placeholder(self.CONTACT_INBOX):
            blockers.append(
                "CONTACT_INBOX must be the live staff email for the contact form"
            )

        return list(dict.fromkeys(blockers))

    def assert_ready(self) -> None:
        blockers = self.production_blockers()
        if blockers:
            raise RuntimeError(
                "Refusing to start in production:\n- " + "\n- ".join(blockers)
            )


def _is_placeholder(value: str) -> bool:
    lowered = (value or "").strip().lower()
    return any(marker in lowered for marker in _PLACEHOLDER_MARKERS)


settings = Settings()
