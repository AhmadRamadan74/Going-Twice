from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.core.pagination import clamp_per_page
from app.core.responses import success_response
from app.modules.auth.domain.entities import User
from app.modules.notifications.entities import Notification
from app.modules.notifications.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    unread_only: bool = False,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    per_page = clamp_per_page(per_page)
    filters = [Notification.user_id == user.id]
    if unread_only:
        filters.append(Notification.is_read.is_(False))

    total = (
        await session.execute(
            select(func.count()).select_from(Notification).where(*filters)
        )
    ).scalar_one()
    result = await session.execute(
        select(Notification)
        .where(*filters)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [
        NotificationResponse.model_validate(row).model_dump(mode="json")
        for row in result.scalars().all()
    ]
    return success_response(
        message="Notifications retrieved",
        data={
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
        },
    )


@router.get("/unread-count")
async def unread_count(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = (
        await session.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        )
    ).scalar_one()
    return success_response(message="Unread count", data={"count": count})


@router.post("/read-all")
async def mark_all_read(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await session.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await session.commit()
    return success_response(message="All notifications marked as read", data=None)


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise NotFoundError("Notification", str(notification_id))
    notification.is_read = True
    await session.commit()
    return success_response(
        message="Notification marked as read",
        data=NotificationResponse.model_validate(notification).model_dump(mode="json"),
    )
