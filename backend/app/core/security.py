"""JWT + password hashing utilities."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jwt import decode, encode

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS),
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(
    user_id: int,
    *,
    issued_at: Optional[datetime] = None,
) -> tuple[str, datetime]:
    now = issued_at or datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "user_id": user_id,
        "exp": int(expires_at.timestamp()),
        "iat": int(now.timestamp()),
    }
    token = encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


def hash_reset_token(raw_token: str) -> str:
    """SHA-256 digest of a password-reset token for storage/lookup."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def hash_verification_code(code: str) -> str:
    """
    Keyed digest of a short OTP.

    A six-digit code has only a million possibilities, so a plain SHA-256 digest
    would be trivially reversible from a database dump. HMAC with the server
    secret means a stolen table alone is not enough to recover codes.
    """
    return hmac.new(
        settings.JWT_SECRET_KEY.encode("utf-8"),
        code.strip().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_code_hash(code: str, expected_hash: str) -> bool:
    """Constant-time comparison so verification can't be timed."""
    return hmac.compare_digest(hash_verification_code(code), expected_hash)


def generate_numeric_code(length: int) -> str:
    """Cryptographically random decimal code, zero-padded to `length`."""
    upper = 10**length
    return str(secrets.randbelow(upper)).zfill(length)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except Exception:
        return None
