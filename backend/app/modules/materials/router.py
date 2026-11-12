import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_optional_user, require_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import clamp_per_page
from app.core.responses import success_response
from app.core.soft_delete import not_deleted
from app.modules.auth.domain.entities import User
from app.modules.materials.entities import Material, slugify
from app.modules.materials.schemas import (
    CreateMaterialRequest,
    MaterialResponse,
    UpdateMaterialRequest,
)
from app.modules.products.entities import Product

router = APIRouter(prefix="/materials", tags=["Materials"])


def _is_admin(user: User | None) -> bool:
    return bool(user and user.role and user.role.name == "admin")


@router.get("")
async def list_materials(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    per_page = clamp_per_page(per_page)
    filters = [not_deleted(Material.deleted_at)]
    if not (include_inactive and _is_admin(user)):
        filters.append(Material.is_active.is_(True))

    total = (
        await session.execute(select(func.count()).select_from(Material).where(*filters))
    ).scalar_one()

    result = await session.execute(
        select(Material)
        .where(*filters)
        .order_by(Material.sort_order.asc(), Material.name.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [
        MaterialResponse.model_validate(m).model_dump() for m in result.scalars().all()
    ]
    return success_response(
        message="Materials retrieved successfully",
        data={
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": math.ceil(total / per_page) if total else 0,
        },
    )


@router.post("")
async def create_material(
    data: CreateMaterialRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    slug = slugify(data.name)
    existing = await session.execute(select(Material).where(Material.slug == slug))
    if existing.scalar_one_or_none():
        raise ConflictError("Material slug already exists")

    material = Material(
        name=data.name.strip(),
        slug=slug,
        sort_order=data.sort_order,
        is_active=data.is_active,
    )
    session.add(material)
    await session.commit()
    await session.refresh(material)
    return success_response(
        message="Material created successfully",
        data=MaterialResponse.model_validate(material).model_dump(),
    )


@router.patch("/{material_id}")
async def update_material(
    material_id: int,
    data: UpdateMaterialRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    material = await session.get(Material, material_id)
    if not material or material.deleted_at is not None:
        raise NotFoundError("Material", str(material_id))

    if data.name is not None:
        new_slug = slugify(data.name)
        if new_slug != material.slug:
            existing = await session.execute(
                select(Material).where(Material.slug == new_slug, Material.id != material_id)
            )
            if existing.scalar_one_or_none():
                raise ConflictError("Material slug already exists")
            material.slug = new_slug
        material.name = data.name.strip()
    if data.sort_order is not None:
        material.sort_order = data.sort_order
    if data.is_active is not None:
        material.is_active = data.is_active

    await session.commit()
    await session.refresh(material)
    return success_response(
        message="Material updated successfully",
        data=MaterialResponse.model_validate(material).model_dump(),
    )


@router.delete("/{material_id}")
async def delete_material(
    material_id: int,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    material = await session.get(Material, material_id)
    if not material or material.deleted_at is not None:
        raise NotFoundError("Material", str(material_id))

    in_use = await session.execute(
        select(func.count())
        .select_from(Product)
        .where(Product.material_id == material_id, Product.deleted_at.is_(None))
    )
    if in_use.scalar_one() > 0:
        raise ConflictError("This material is used by existing listings and cannot be deleted")

    material.deleted_at = func.now()
    material.is_active = False
    await session.commit()
    return success_response(message="Material deleted successfully", data={"id": material_id})
