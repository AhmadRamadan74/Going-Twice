import math
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_optional_user, require_admin
from app.core.exceptions import NotFoundError
from app.core.marketplace import ListingStatus, normalize_payment_methods
from app.core.pagination import clamp_per_page
from app.core.responses import success_response
from app.modules.auth.domain.entities import User
from app.modules.categories.entities import Category, slugify
from app.modules.products.entities import Product
from app.modules.products.queries import (
    catalog_filters,
    is_available_for_purchase,
    replace_product_images,
)
from app.modules.products.schemas import CreateProductRequest, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])


def _sort_clause(sort: str | None):
    if sort == "price-asc":
        return Product.price.asc()
    if sort == "price-desc":
        return Product.price.desc()
    if sort == "name":
        return Product.name.asc()
    return Product.listed_at.desc()


def _dump(product: Product) -> dict:
    return ProductResponse.from_entity(product).model_dump(mode="json")


@router.get("")
async def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    sort: str | None = Query("newest"),
    collection: str | None = None,
    category: str | None = None,
    department: str | None = None,
    subcategory: str | None = None,
    subcategory_id: int | None = None,
    material_id: int | None = None,
    room: str | None = None,
    condition: str | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    q: str | None = None,
    session: AsyncSession = Depends(get_db),
):
    per_page = clamp_per_page(per_page)
    filters = list(catalog_filters())
    if collection:
        filters.append(Product.collection == collection)
    if category:
        filters.append(Product.category_slug == category)
    if department:
        filters.append(Product.department == department)
    if subcategory:
        sub = (
            await session.execute(select(Category.id).where(Category.slug == subcategory))
        ).scalar_one_or_none()
        filters.append(Product.subcategory_id == (sub or -1))
    if subcategory_id:
        filters.append(Product.subcategory_id == subcategory_id)
    if material_id:
        filters.append(Product.material_id == material_id)
    if room:
        filters.append(Product.room_slug == room)
    if condition and condition.strip():
        filters.append(Product.condition.ilike(f"%{condition.strip()}%"))
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if q and q.strip():
        like = f"%{q.strip()}%"
        filters.append(
            or_(
                Product.name.ilike(like),
                Product.slug.ilike(like),
                Product.description.ilike(like),
                Product.seller_name.ilike(like),
                Product.category_slug.ilike(like),
            )
        )

    total = (
        await session.execute(select(func.count()).select_from(Product).where(*filters))
    ).scalar_one()

    result = await session.execute(
        select(Product)
        .where(*filters)
        .order_by(_sort_clause(sort))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [_dump(p) for p in result.scalars().all()]
    return success_response(
        message="Products retrieved successfully",
        data={
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": math.ceil(total / per_page) if total else 0,
        },
    )


@router.get("/just-listed")
async def just_listed(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(Product)
        .where(*catalog_filters(), Product.collection == "just-listed")
        .order_by(Product.listed_at.desc())
        .limit(8)
    )
    return success_response(
        message="Just listed products",
        data=[_dump(p) for p in result.scalars().all()],
    )


@router.get("/editors-picks")
async def editors_picks(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(Product)
        .where(*catalog_filters(), Product.collection == "editors-picks")
        .order_by(Product.listed_at.desc())
        .limit(8)
    )
    return success_response(
        message="Editor's picks",
        data=[_dump(p) for p in result.scalars().all()],
    )


@router.get("/{slug}")
async def get_product(
    slug: str,
    session: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    result = await session.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if not product or product.deleted_at is not None:
        raise NotFoundError("Product", slug)

    is_owner = bool(user and product.seller_user_id == user.id)
    is_admin = bool(user and user.role and user.role.name == "admin")
    if product.status not in ListingStatus.PUBLIC and not is_owner and not is_admin:
        raise NotFoundError("Product", slug)
    if not product.is_active and not is_owner and not is_admin:
        raise NotFoundError("Product", slug)
    if not is_owner and not is_admin and not await is_available_for_purchase(session, product):
        raise NotFoundError("Product", slug)

    related = await session.execute(
        select(Product)
        .where(
            Product.id != product.id,
            *catalog_filters(),
            (Product.category_slug == product.category_slug)
            | (Product.department == product.department),
        )
        .limit(4)
    )
    return success_response(
        message="Product retrieved successfully",
        data={
            "product": _dump(product),
            "related": [_dump(p) for p in related.scalars().all()],
        },
    )


@router.post("")
async def create_product(
    data: CreateProductRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    slug = data.slug or slugify(data.name)
    urls = [data.image_url, *data.image_urls]
    product = Product(
        slug=slug,
        name=data.name.strip(),
        seller_name=data.seller_name.strip(),
        price=data.price,
        image_url=data.image_url,
        description=data.description,
        condition=data.condition,
        dimensions=data.dimensions,
        era=data.era,
        category_slug=data.category_slug,
        department=data.department,
        room_slug=data.room_slug,
        collection=data.collection,
        location_city=data.location_city,
        payment_methods=normalize_payment_methods(data.payment_methods),
        status=ListingStatus.PUBLISHED,
        is_active=True,
    )
    replace_product_images(product, urls)
    session.add(product)
    await session.commit()
    await session.refresh(product)
    return success_response(
        message="Product created successfully",
        data=_dump(product),
    )
