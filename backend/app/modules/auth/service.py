import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email
from app.core.email_templates import password_reset_email, verification_code_email
from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    ThrottledError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    generate_numeric_code,
    hash_password,
    hash_reset_token,
    hash_verification_code,
    verify_code_hash,
    verify_password,
)
from app.modules.auth.domain.entities import (
    EmailVerificationCode,
    PasswordResetToken,
    RefreshToken,
    User,
)
from app.modules.auth.repository import (
    EmailVerificationCodeRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    RoleRepository,
    UserRepository,
)
from app.modules.auth.schemas import LoginRequest, RegisterRequest

VERIFICATION_PURPOSE = "email_verification"


def _aware(value: datetime | None) -> datetime | None:
    """SQLite hands back naive datetimes; normalise before comparing."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserRepository(session)
        self.roles = RoleRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)
        self.reset_tokens = PasswordResetTokenRepository(session)
        self.verification_codes = EmailVerificationCodeRepository(session)

    async def register(self, data: RegisterRequest) -> dict:
        if len(data.password) < settings.PASSWORD_MIN_LENGTH:
            raise ValidationError(
                f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters"
            )

        existing = await self.users.get_by_email(data.email)
        if existing:
            raise ConflictError("An account with this email already exists")

        role = await self.roles.get_by_name("customer")
        if not role:
            raise ValidationError("Default customer role is missing — run seed script")

        user = User(
            full_name=data.full_name.strip(),
            email=data.email.lower().strip(),
            phone_number=data.phone_number,
            hashed_password=hash_password(data.password),
            role_id=role.id,
            is_active=True,
        )
        await self.users.create(user)
        await self.session.commit()
        await self.session.refresh(user, attribute_names=["role"])
        return await self._issue_tokens(user)

    async def login(self, data: LoginRequest) -> dict:
        user = await self.users.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        return await self._issue_tokens(user)

    async def me(self, user_id: int) -> User:
        user = await self.users.get_active_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")
        return user

    async def refresh(self, refresh_token: str) -> dict:
        entity = await self.refresh_tokens.get_by_token(refresh_token)
        now = datetime.now(timezone.utc)
        expires = entity.expires_at if entity else None
        if expires and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if not entity or entity.revoked or not expires or expires < now:
            raise AuthenticationError("Invalid or expired refresh token")

        user = await self.users.get_active_by_id(entity.user_id)
        if not user:
            raise AuthenticationError("User not found")

        entity.revoked = True
        await self.session.commit()
        return await self._issue_tokens(user)

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        entity = await self.refresh_tokens.get_by_token(refresh_token)
        if entity and not entity.revoked:
            entity.revoked = True
            await self.session.commit()

    async def update_profile(self, user: User, data) -> User:
        from app.core.payout import normalize_bank, normalize_wallets

        if data.full_name:
            user.full_name = data.full_name.strip()
        if data.phone_number is not None:
            user.phone_number = data.phone_number.strip() or None
        if data.pickup_address is not None:
            user.pickup_city = data.pickup_address.city.strip() or None
            user.pickup_area = data.pickup_address.area.strip() or None
            user.pickup_street = data.pickup_address.street.strip() or None
            user.pickup_building = data.pickup_address.building.strip() or None
        if data.payout_wallets is not None:
            user.payout_wallets = normalize_wallets(
                [row.model_dump() for row in data.payout_wallets]
            )
        if "payout_bank" in data.model_fields_set:
            user.payout_bank = normalize_bank(
                data.payout_bank.model_dump() if data.payout_bank else None
            )
        await self.session.commit()
        await self.session.refresh(user, attribute_names=["role"])
        return user

    async def forgot_password(self, email: str) -> dict:
        generic = "If an account exists for that email, we've sent a reset link."
        user = await self.users.get_by_email(email)
        if not user or not user.is_active:
            return {"message": generic, "reset_link": None}

        await self.reset_tokens.invalidate_for_user(user.id)
        raw = secrets.token_urlsafe(32)
        entity = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(raw),
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        )
        await self.reset_tokens.create(entity)
        await self.session.commit()

        reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw}"
        subject, html, text = password_reset_email(
            full_name=user.full_name,
            reset_link=reset_link,
            expires_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES,
        )
        delivered = await send_email(to=user.email, subject=subject, html=html, text=text)
        if not delivered:
            logging.getLogger(__name__).error(
                "Password reset email could not be delivered to %s", user.email
            )

        return {
            "message": generic,
            "reset_link": reset_link if settings.expose_password_reset_link else None,
        }

    async def reset_password(self, token: str, password: str) -> None:
        if len(password) < settings.PASSWORD_MIN_LENGTH:
            raise ValidationError(
                f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters"
            )

        entity = await self.reset_tokens.get_valid_by_hash(hash_reset_token(token.strip()))
        if not entity:
            raise ValidationError("This reset link is invalid or has expired")

        user = await self.users.get_active_by_id(entity.user_id)
        if not user:
            raise ValidationError("This reset link is invalid or has expired")

        user.hashed_password = hash_password(password)
        entity.used_at = datetime.now(timezone.utc)
        await self.refresh_tokens.revoke_all_for_user(user.id)
        await self.session.commit()

    # ── Email verification ────────────────────────────────────────────

    async def send_verification_code(self, user: User) -> dict:
        """
        Issues a fresh six-digit code, superseding any earlier one.

        Raises ThrottledError while the resend cooldown is still running so a
        caller cannot use this endpoint to spray somebody's inbox.
        """
        if user.email_verified:
            raise ValidationError("This email is already verified")

        now = datetime.now(timezone.utc)
        cooldown = settings.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS
        active = await self.verification_codes.get_active(user.id, VERIFICATION_PURPOSE)
        if active:
            sent_at = _aware(active.sent_at) or now
            elapsed = (now - sent_at).total_seconds()
            if elapsed < cooldown:
                retry_after = int(cooldown - elapsed) or 1
                raise ThrottledError(
                    f"Please wait {retry_after} seconds before requesting another code",
                    retry_after_seconds=retry_after,
                )

        await self.verification_codes.invalidate_for_user(user.id, VERIFICATION_PURPOSE)
        code = generate_numeric_code(settings.EMAIL_VERIFICATION_CODE_LENGTH)
        entity = EmailVerificationCode(
            user_id=user.id,
            purpose=VERIFICATION_PURPOSE,
            code_hash=hash_verification_code(code),
            expires_at=now
            + timedelta(minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES),
            attempts=0,
            sent_at=now,
        )
        await self.verification_codes.create(entity)
        await self.session.commit()

        subject, html, text = verification_code_email(
            full_name=user.full_name,
            code=code,
            expires_minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES,
        )
        delivered = await send_email(to=user.email, subject=subject, html=html, text=text)
        if not delivered:
            logging.getLogger(__name__).error(
                "Verification code email could not be delivered to %s", user.email
            )

        return {
            "resend_after_seconds": cooldown,
            "expires_in_minutes": settings.EMAIL_VERIFICATION_EXPIRE_MINUTES,
            "debug_code": code if settings.expose_verification_code else None,
        }

    async def verify_email(self, user: User, raw_code: str) -> User:
        """Consumes a code and marks the address verified."""
        if user.email_verified:
            return user

        code = (raw_code or "").strip()
        if not code:
            raise ValidationError("Enter the code we emailed you")

        if settings.magic_otp_bypass_enabled and code == settings.AUTH_MAGIC_OTP_CODE:
            return await self._mark_verified(user)

        entity = await self.verification_codes.get_active(user.id, VERIFICATION_PURPOSE)
        if not entity:
            raise ValidationError("Request a new verification code")

        now = datetime.now(timezone.utc)
        expires = _aware(entity.expires_at)
        if not expires or expires < now:
            entity.consumed_at = now
            await self.session.commit()
            raise ValidationError("That code has expired — request a new one")

        if entity.attempts >= settings.EMAIL_VERIFICATION_MAX_ATTEMPTS:
            entity.consumed_at = now
            await self.session.commit()
            raise ValidationError("Too many incorrect attempts — request a new code")

        if not verify_code_hash(code, entity.code_hash):
            entity.attempts += 1
            remaining = settings.EMAIL_VERIFICATION_MAX_ATTEMPTS - entity.attempts
            if remaining <= 0:
                entity.consumed_at = now
            await self.session.commit()
            if remaining <= 0:
                raise ValidationError("Too many incorrect attempts — request a new code")
            raise ValidationError(
                f"That code is not right — {remaining} attempt"
                f"{'s' if remaining != 1 else ''} left"
            )

        entity.consumed_at = now
        return await self._mark_verified(user)

    async def _mark_verified(self, user: User) -> User:
        user.email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(user, attribute_names=["role"])
        return user

    async def _issue_tokens(self, user: User) -> dict:
        access_token, _ = create_access_token(user.id)
        refresh = secrets.token_urlsafe(48)
        entity = RefreshToken(
            user_id=user.id,
            token=refresh,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            revoked=False,
        )
        await self.refresh_tokens.create(entity)
        await self.session.commit()
        return {
            "access_token": access_token,
            "refresh_token": refresh,
            "user": user,
        }
