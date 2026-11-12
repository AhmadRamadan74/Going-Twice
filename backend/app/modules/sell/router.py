from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_verified_email
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.marketplace import ListingStatus, NotificationType, normalize_payment_methods
from app.core.payout import accepted_payment_methods
from app.core.responses import success_response
from app.core.transactional import notify_listing_submitted
from app.core.uploads import is_allowed_image_url
from app.modules.auth.domain.entities import User
from app.modules.categories.entities import Category, slugify
from app.modules.materials.entities import Material
from app.modules.notifications.service import notify_admins, queue_notification
from app.modules.products.entities import Product
from app.modules.products.queries import replace_product_images
from app.modules.rooms.entities import Room
from app.modules.sell.schemas import (
    SellListingRequest,
    SellListingResponse,
    UpdateSellListingRequest,
)

router = APIRouter(prefix="/sell", tags=["Sell"])


async def _unique_slug(session: AsyncSession, title: str) -> str:
    base = slugify(title) or "listing"
    slug = base
    n = 1
    while True:
        exists = await session.execute(select(Product.id).where(Product.slug == slug))
        if exists.scalar_one_or_none() is None:
            return slug
        n += 1
        slug = f"{base}-{n}"


async def _resolve_taxonomy(
    session: AsyncSession,
    category: str | None,
    room: str | None,
    department: str | None,
) -> tuple[str, str, str]:
    category_slug = slugify(category) if category else "chairs"
    room_slug = slugify(room) if room else "living-room"
    dept = department.strip().lower() if department else "furniture"

    if category:
        cat = (
            await session.execute(
                select(Category).where(
                    (Category.slug == category_slug) | (Category.name.ilike(category.strip()))
                )
            )
        ).scalar_one_or_none()
        if cat:
            category_slug = cat.slug
            if cat.department:
                dept = cat.department

    if room:
        found_room = (
            await session.execute(
                select(Room).where(
                    (Room.slug == room_slug) | (Room.name.ilike(room.strip()))
                )
            )
        ).scalar_one_or_none()
        if found_room:
            room_slug = found_room.slug

    return category_slug, room_slug, dept


async def _resolve_subcategory_id(session: AsyncSession, subcategory_id: int | None) -> int | None:
    if subcategory_id is None:
        return None
    category = await session.get(Category, subcategory_id)
    if not category or category.deleted_at is not None or not category.is_active:
        raise ValidationError("subcategory_id does not refer to an active category")
    if category.parent_id is None:
        raise ValidationError("subcategory_id must refer to a subcategory, not a main category")
    return category.id


async def _resolve_material_id(session: AsyncSession, material_id: int | None) -> int | None:
    if material_id is None:
        return None
    material = await session.get(Material, material_id)
    if not material or material.deleted_at is not None or not material.is_active:
        raise ValidationError("material_id does not refer to an active material")
    return material.id


def _image_urls(image_url: str | None, image_urls: list[str] | None) -> list[str]:
    urls: list[str] = []
    for raw in [*(image_urls or []), image_url]:
        if not raw:
            continue
        clean = raw.strip()
        if not clean or clean in urls:
            continue
        if not is_allowed_image_url(clean):
            raise ValidationError("Listing images must be uploaded through Going Twice")
        urls.append(clean)
    return urls


def _dump(product: Product) -> dict:
    return SellListingResponse.from_product(product).model_dump(mode="json")


async def _owned_listing(session: AsyncSession, listing_id: int, user: User) -> Product:
    product = await session.get(Product, listing_id)
    if not product or product.deleted_at is not None:
        raise NotFoundError("Listing", str(listing_id))
    if product.seller_user_id != user.id:
        raise ForbiddenError("You can only manage your own listings")
    return product


@router.post("/list")
async def submit_listing(
    data: SellListingRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(require_verified_email),
):
    if data.asking_price is None:
        raise ValidationError("Asking price is required")

    urls = _image_urls(data.image_url, data.image_urls)
    if not data.save_as_draft and not urls:
        raise ValidationError("At least one image is required")

    methods = normalize_payment_methods(data.payment_methods)
    if not methods:
        methods = accepted_payment_methods(user)

    category_slug, room_slug, department = await _resolve_taxonomy(
        session, data.category, data.room, data.department
    )
    subcategory_id = await _resolve_subcategory_id(session, data.subcategory_id)
    material_id = await _resolve_material_id(session, data.material_id)
    status = ListingStatus.DRAFT if data.save_as_draft else ListingStatus.PENDING_REVIEW
    product = Product(
        slug=await _unique_slug(session, data.title),
        name=data.title.strip(),
        seller_name=(data.seller_name or user.full_name).strip(),
        seller_user_id=user.id,
        price=data.asking_price,
        image_url=urls[0] if urls else "",
        description=data.description.strip(),
        condition=data.condition,
        dimensions=data.dimensions,
        era=data.era,
        category_slug=category_slug,
        department=department,
        room_slug=room_slug,
        subcategory_id=subcategory_id,
        material_id=material_id,
        location_city=data.city or user.pickup_city,
        payment_methods=methods,
        status=status,
        is_active=True,
        collection=None,
    )
    replace_product_images(product, urls)
    session.add(product)

    if status == ListingStatus.PENDING_REVIEW:
        await notify_admins(
            session,
            type=NotificationType.LISTING_SUBMITTED,
            title="New listing pending review",
            message=f"{product.seller_name} submitted “{product.name}” for review.",
            link="/admin",
        )
        queue_notification(
            session,
            user_id=user.id,
            type=NotificationType.LISTING_SUBMITTED,
            title="Listing submitted",
            message=f"“{product.name}” is pending review and is not public yet.",
            link="/account/uploads",
        )

    await session.commit()
    await session.refresh(product)
    if status == ListingStatus.PENDING_REVIEW:
        await notify_listing_submitted(seller=user, product_name=product.name)
    return success_response(
        message="Listing saved as draft" if data.save_as_draft else "Listing submitted for review",
        data=_dump(product),
    )


@router.get("/mine")
async def my_listings(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Product)
        .where(Product.seller_user_id == user.id, Product.deleted_at.is_(None))
        .order_by(Product.created_at.desc())
    )
    products = result.scalars().all()
    items = [_dump(row) for row in products]
    grouped = {
        "draft": [i for i in items if i["status"] == ListingStatus.DRAFT],
        "pending": [i for i in items if i["status"] == ListingStatus.PENDING_REVIEW],
        "published": [
            i for i in items if i["status"] in (ListingStatus.PUBLISHED, ListingStatus.APPROVED)
        ],
        "rejected": [i for i in items if i["status"] == ListingStatus.REJECTED],
        "sold": [i for i in items if i["status"] == ListingStatus.SOLD],
        "archived": [i for i in items if i["status"] == ListingStatus.ARCHIVED],
    }
    return success_response(
        message="Your listings",
        data={"items": items, **grouped},
    )


@router.get("/{listing_id}")
async def get_my_listing(
    listing_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = await _owned_listing(session, listing_id, user)
    return success_response(message="Listing retrieved", data=_dump(product))


@router.patch("/{listing_id}")
async def update_listing(
    listing_id: int,
    data: UpdateSellListingRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = await _owned_listing(session, listing_id, user)
    if product.status not in ListingStatus.SELLER_EDITABLE:
        raise ForbiddenError("This listing can no longer be edited")

    if data.title:
        product.name = data.title.strip()
    if data.description:
        product.description = data.description.strip()
    if data.asking_price is not None:
        product.price = data.asking_price
    if data.condition is not None:
        product.condition = data.condition
    if data.dimensions is not None:
        product.dimensions = data.dimensions
    if data.era is not None:
        product.era = data.era
    if data.city is not None:
        product.location_city = data.city
    if data.payment_methods is not None:
        product.payment_methods = normalize_payment_methods(data.payment_methods)
    if data.category or data.room or data.department:
        category_slug, room_slug, department = await _resolve_taxonomy(
            session,
            data.category or product.category_slug,
            data.room or product.room_slug,
            data.department or product.department,
        )
        product.category_slug = category_slug
        product.room_slug = room_slug
        product.department = department
    if data.subcategory_id is not None:
        product.subcategory_id = await _resolve_subcategory_id(session, data.subcategory_id)
    if data.material_id is not None:
        product.material_id = await _resolve_material_id(session, data.material_id)

    urls = None
    if data.image_urls is not None or data.image_url is not None:
        urls = _image_urls(data.image_url, data.image_urls or [])
        if urls:
            replace_product_images(product, urls)

    await session.commit()
    await session.refresh(product)
    return success_response(message="Listing updated", data=_dump(product))


@router.post("/{listing_id}/resubmit")
async def resubmit_listing(
    listing_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(require_verified_email),
):
    product = await _owned_listing(session, listing_id, user)
    if product.status not in (ListingStatus.DRAFT, ListingStatus.REJECTED):
        raise ValidationError("Only draft or rejected listings can be resubmitted")
    if not product.image_url:
        raise ValidationError("At least one image is required")

    product.status = ListingStatus.PENDING_REVIEW
    product.rejection_reason = None
    await notify_admins(
        session,
        type=NotificationType.LISTING_SUBMITTED,
        title="Listing resubmitted",
        message=f"{product.seller_name} resubmitted “{product.name}” for review.",
        link="/admin",
    )
    queue_notification(
        session,
        user_id=user.id,
        type=NotificationType.LISTING_SUBMITTED,
        title="Listing resubmitted",
        message=f"“{product.name}” is pending review again.",
        link="/account/uploads",
    )
    await session.commit()
    await session.refresh(product)
    await notify_listing_submitted(seller=user, product_name=product.name)
    return success_response(message="Listing resubmitted for review", data=_dump(product))
