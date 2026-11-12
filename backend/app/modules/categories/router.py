import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_optional_user, require_admin
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.pagination import clamp_per_page
from app.core.responses import success_response
from app.core.soft_delete import not_deleted
from app.core.uploads import is_allowed_image_url
from app.modules.auth.domain.entities import User
from app.modules.categories.entities import Category, slugify
from app.modules.categories.schemas import (
    CategoryResponse,
    CreateCategoryRequest,
    UpdateCategoryRequest,
)
from app.modules.products.entities import Product

router = APIRouter(prefix="/categories", tags=["Categories"])


def _is_admin(user: User | None) -> bool:
    return bool(user and user.role and user.role.name == "admin")


@router.get("")
async def list_categories(
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    department: str | None = None,
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    per_page = clamp_per_page(per_page)
    filters = [not_deleted(Category.deleted_at)]
    if not (include_inactive and _is_admin(user)):
        filters.append(Category.is_active.is_(True))
    if department:
        filters.append(Category.department == department)

    total = (
        await session.execute(select(func.count()).select_from(Category).where(*filters))
    ).scalar_one()

    result = await session.execute(
        select(Category)
        .where(*filters)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [
        CategoryResponse.model_validate(c).model_dump() for c in result.scalars().all()
    ]
    return success_response(
        message="Categories retrieved successfully",
        data={
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": math.ceil(total / per_page) if total else 0,
        },
    )


@router.get("/{slug}")
async def get_category(slug: str, session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(Category).where(
            Category.slug == slug,
            not_deleted(Category.deleted_at),
            Category.is_active.is_(True),
        )
    )
    category = result.scalar_one_or_none()
    if not category:
        raise NotFoundError("Category", slug)
    return success_response(
        message="Category retrieved successfully",
        data=CategoryResponse.model_validate(category).model_dump(),
    )


async def _get_parent_or_400(session: AsyncSession, parent_id: int) -> Category:
    parent = await session.get(Category, parent_id)
    if not parent or parent.deleted_at is not None:
        raise ValidationError("parent_id does not refer to an existing category")
    if parent.parent_id is not None:
        raise ValidationError("A subcategory cannot itself have subcategories")
    return parent


@router.post("")
async def create_category(
    data: CreateCategoryRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    if data.image_url and not is_allowed_image_url(data.image_url):
        raise ValidationError("Category images must be uploaded through Going Twice")

    slug = slugify(data.name)
    existing = await session.execute(select(Category).where(Category.slug == slug))
    if existing.scalar_one_or_none():
        raise ConflictError("Category slug already exists")

    parent = None
    if data.parent_id is not None:
        parent = await _get_parent_or_400(session, data.parent_id)

    category = Category(
        name=data.name.strip(),
        slug=slug,
        description=data.description,
        image_url=data.image_url,
        department=data.department or (parent.department if parent else None),
        parent_id=data.parent_id,
        sort_order=data.sort_order,
        is_active=data.is_active,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return success_response(
        message="Category created successfully",
        data=CategoryResponse.model_validate(category).model_dump(),
    )


@router.patch("/{category_id}")
async def update_category(
    category_id: int,
    data: UpdateCategoryRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    category = await session.get(Category, category_id)
    if not category or category.deleted_at is not None:
        raise NotFoundError("Category", str(category_id))

    if data.name is not None:
        new_slug = slugify(data.name)
        if new_slug != category.slug:
            existing = await session.execute(
                select(Category).where(Category.slug == new_slug, Category.id != category_id)
            )
            if existing.scalar_one_or_none():
                raise ConflictError("Category slug already exists")
            category.slug = new_slug
        category.name = data.name.strip()

    if data.description is not None:
        category.description = data.description
    if data.image_url is not None:
        if data.image_url and not is_allowed_image_url(data.image_url):
            raise ValidationError("Category images must be uploaded through Going Twice")
        category.image_url = data.image_url
    if data.department is not None:
        category.department = data.department
    if data.sort_order is not None:
        category.sort_order = data.sort_order
    if data.is_active is not None:
        category.is_active = data.is_active

    if data.clear_parent:
        category.parent_id = None
    elif data.parent_id is not None:
        if data.parent_id == category.id:
            raise ValidationError("A category cannot be its own parent")
        children = (
            await session.execute(
                select(Category.id, Category.deleted_at).where(
                    Category.parent_id == category.id
                )
            )
        ).all()
        if any(child_id == data.parent_id for child_id, _ in children):
            raise ValidationError("A category cannot be a subcategory of its own subcategory")
        if any(deleted_at is None for _, deleted_at in children):
            raise ValidationError(
                "This category has subcategories of its own and cannot become a subcategory"
            )
        await _get_parent_or_400(session, data.parent_id)
        category.parent_id = data.parent_id

    await session.commit()
    await session.refresh(category)
    return success_response(
        message="Category updated successfully",
        data=CategoryResponse.model_validate(category).model_dump(),
    )


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    category = await session.get(Category, category_id)
    if not category or category.deleted_at is not None:
        raise NotFoundError("Category", str(category_id))

    active_children = await session.execute(
        select(func.count())
        .select_from(Category)
        .where(Category.parent_id == category_id, not_deleted(Category.deleted_at))
    )
    if active_children.scalar_one() > 0:
        raise ConflictError(
            "Delete or reassign this category's subcategories first"
        )

    in_use = await session.execute(
        select(func.count())
        .select_from(Product)
        .where(Product.subcategory_id == category_id, Product.deleted_at.is_(None))
    )
    if in_use.scalar_one() > 0:
        raise ConflictError("This category is used by existing listings and cannot be deleted")

    category.deleted_at = func.now()
    category.is_active = False
    await session.commit()
    return success_response(message="Category deleted successfully", data={"id": category_id})
