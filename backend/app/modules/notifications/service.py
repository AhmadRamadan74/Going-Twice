from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.domain.entities import Role, User
from app.modules.notifications.entities import Notification


def queue_notification(
    session: AsyncSession,
    *,
    user_id: int,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    session.add(
        Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
        )
    )


async def notify_admins(
    session: AsyncSession,
    *,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    result = await session.execute(
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(Role.name == "admin", User.is_active.is_(True))
    )
    for admin in result.scalars().all():
        queue_notification(
            session,
            user_id=admin.id,
            type=type,
            title=title,
            message=message,
            link=link,
        )
