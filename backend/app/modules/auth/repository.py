from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.base_repository import BaseRepository
from app.core.soft_delete import not_deleted
from app.modules.auth.domain.entities import (
    EmailVerificationCode,
    PasswordResetToken,
    RefreshToken,
    Role,
    User,
)


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.email == email.lower(), not_deleted(User.deleted_at))
        )
        return result.scalar_one_or_none()

    async def get_active_by_id(self, user_id: int) -> Optional[User]:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.role))
            .where(User.id == user_id, not_deleted(User.deleted_at), User.is_active.is_(True))
        )
        return result.scalar_one_or_none()


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: AsyncSession):
        super().__init__(Role, session)

    async def get_by_name(self, name: str) -> Optional[Role]:
        result = await self.session.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, session: AsyncSession):
        super().__init__(RefreshToken, session)

    async def get_by_token(self, token: str) -> Optional[RefreshToken]:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token == token)
        )
        return result.scalar_one_or_none()

    async def revoke_all_for_user(self, user_id: int) -> None:
        result = await self.session.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked.is_(False),
            )
        )
        for token in result.scalars().all():
            token.revoked = True


class EmailVerificationCodeRepository(BaseRepository[EmailVerificationCode]):
    def __init__(self, session: AsyncSession):
        super().__init__(EmailVerificationCode, session)

    async def get_active(
        self, user_id: int, purpose: str = "email_verification"
    ) -> Optional[EmailVerificationCode]:
        """Newest unconsumed code for a user, expired or not.

        Expiry is checked by the caller so an expired code can still be told
        apart from "no code was ever requested".
        """
        result = await self.session.execute(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.user_id == user_id,
                EmailVerificationCode.purpose == purpose,
                EmailVerificationCode.consumed_at.is_(None),
            )
            .order_by(EmailVerificationCode.id.desc())
        )
        return result.scalars().first()

    async def invalidate_for_user(
        self, user_id: int, purpose: str = "email_verification"
    ) -> None:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(EmailVerificationCode).where(
                EmailVerificationCode.user_id == user_id,
                EmailVerificationCode.purpose == purpose,
                EmailVerificationCode.consumed_at.is_(None),
            )
        )
        for code in result.scalars().all():
            code.consumed_at = now


class PasswordResetTokenRepository(BaseRepository[PasswordResetToken]):
    def __init__(self, session: AsyncSession):
        super().__init__(PasswordResetToken, session)

    async def get_valid_by_hash(self, token_hash: str) -> Optional[PasswordResetToken]:
        result = await self.session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        entity = result.scalar_one_or_none()
        if not entity or entity.used_at is not None:
            return None
        expires = entity.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            return None
        return entity

    async def invalidate_for_user(self, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used_at.is_(None),
            )
        )
        for token in result.scalars().all():
            token.used_at = now
