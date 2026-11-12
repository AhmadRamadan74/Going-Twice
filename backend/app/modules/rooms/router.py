import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.core.exceptions import NotFoundError
from app.core.pagination import clamp_per_page
from app.core.responses import success_response
from app.core.soft_delete import not_deleted
from app.modules.auth.domain.entities import User
from app.modules.categories.entities import slugify
from app.modules.rooms.entities import Room
from app.modules.rooms.schemas import CreateRoomRequest, RoomResponse

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("")
async def list_rooms(
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    per_page = clamp_per_page(per_page)
    filters = [not_deleted(Room.deleted_at), Room.is_active.is_(True)]
    total = (
        await session.execute(select(func.count()).select_from(Room).where(*filters))
    ).scalar_one()
    result = await session.execute(
        select(Room)
        .where(*filters)
        .order_by(Room.sort_order.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [RoomResponse.model_validate(r).model_dump() for r in result.scalars().all()]
    return success_response(
        message="Rooms retrieved successfully",
        data={
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": math.ceil(total / per_page) if total else 0,
        },
    )


@router.get("/{slug}")
async def get_room(slug: str, session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(Room).where(
            Room.slug == slug,
            not_deleted(Room.deleted_at),
            Room.is_active.is_(True),
        )
    )
    room = result.scalar_one_or_none()
    if not room:
        raise NotFoundError("Room", slug)
    return success_response(
        message="Room retrieved successfully",
        data=RoomResponse.model_validate(room).model_dump(),
    )


@router.post("")
async def create_room(
    data: CreateRoomRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    room = Room(
        name=data.name.strip(),
        slug=slugify(data.name),
        description=data.description,
        image_url=data.image_url,
        sort_order=data.sort_order,
    )
    session.add(room)
    await session.commit()
    await session.refresh(room)
    return success_response(
        message="Room created successfully",
        data=RoomResponse.model_validate(room).model_dump(),
    )
