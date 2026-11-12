"""FastAPI dependencies — current user from JWT."""

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError, ForbiddenError
from app.core.security import decode_access_token
from app.modules.auth.domain.entities import User
from app.modules.auth.repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise AuthenticationError("Not authenticated")

    payload = decode_access_token(credentials.credentials)
    if not payload or "user_id" not in payload:
        raise AuthenticationError("Invalid or expired token")

    user = await UserRepository(session).get_active_by_id(int(payload["user_id"]))
    if not user:
        raise AuthenticationError("User not found")
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, session)
    except AuthenticationError:
        return None


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.role or user.role.name != "admin":
        raise AuthorizationError("Admin access required")
    return user


def require_verified_email(user: User = Depends(get_current_user)) -> User:
    """Buy and sell stay locked until the address has been confirmed."""
    if not user.email_verified:
        raise ForbiddenError("Verify your email before buying or selling")
    return user
