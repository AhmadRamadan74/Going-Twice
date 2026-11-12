from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.core.exceptions import NotFoundError, ValidationError
from app.core.marketplace import ListingStatus, NotificationType
from app.core.pagination import clamp_per_page
from app.core.responses import success_response
from app.core.soft_delete import not_deleted
from app.core.transactional import notify_listing_approved, notify_listing_rejected
from app.modules.admin.schemas import RejectListingRequest
from app.modules.auth.domain.entities import User
from app.modules.notifications.service import queue_notification
from app.modules.orders.entities import Order
from app.modules.orders.schemas import serialize_order
from app.modules.products.entities import Product
from app.modules.sell.schemas import SellListingResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


def _listing_payload(product: Product, seller: User | None = None) -> dict:
    data = SellListingResponse.from_product(product).model_dump(mode="json")
    data["seller"] = (
        {
            "id": seller.id,
            "full_name": seller.full_name,
            "email": seller.email,
            "phone_number": seller.phone_number,
        }
        if seller
        else {
            "id": product.seller_user_id,
            "full_name": product.seller_name,
            "email": None,
            "phone_number": None,
        }
    )
    return data


async def _load_seller(session: AsyncSession, product: Product) -> User | None:
    if not product.seller_user_id:
        return None
    return await session.get(User, product.seller_user_id)


@router.get("/dashboard")
async def dashboard(
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    async def _count(*filters) -> int:
        return (
            await session.execute(select(func.count()).select_from(Product).where(*filters))
        ).scalar_one()

    pending = await _count(
        Product.status == ListingStatus.PENDING_REVIEW,
        Product.deleted_at.is_(None),
    )
    published = await _count(
        Product.status.in_([ListingStatus.PUBLISHED, ListingStatus.APPROVED]),
        Product.deleted_at.is_(None),
    )
    rejected = await _count(
        Product.status == ListingStatus.REJECTED,
        Product.deleted_at.is_(None),
    )
    sold = await _count(Product.status == ListingStatus.SOLD, Product.deleted_at.is_(None))
    orders = (await session.execute(select(func.count()).select_from(Order))).scalar_one()
    users = (
        await session.execute(
            select(func.count()).select_from(User).where(not_deleted(User.deleted_at))
        )
    ).scalar_one()

    return success_response(
        message="Admin dashboard",
        data={
            "pending_listings": pending,
            "published": published,
            "rejected": rejected,
            "sold": sold,
            "orders": orders,
            "users": users,
        },
    )


@router.get("/listings")
async def list_listings(
    status: str = Query(ListingStatus.PENDING_REVIEW),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    per_page = clamp_per_page(per_page)
    filters = [Product.deleted_at.is_(None)]
    if status:
        filters.append(Product.status == status)

    total = (
        await session.execute(select(func.count()).select_from(Product).where(*filters))
    ).scalar_one()
    result = await session.execute(
        select(Product)
        .where(*filters)
        .order_by(Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    products = result.scalars().all()
    items = []
    for product in products:
        seller = await _load_seller(session, product)
        items.append(_listing_payload(product, seller))

    return success_response(
        message="Listings retrieved",
        data={
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
        },
    )


@router.get("/listings/{listing_id}")
async def get_listing(
    listing_id: int,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = await session.get(Product, listing_id)
    if not product or product.deleted_at is not None:
        raise NotFoundError("Listing", str(listing_id))
    seller = await _load_seller(session, product)
    return success_response(message="Listing retrieved", data=_listing_payload(product, seller))


@router.post("/listings/{listing_id}/approve")
async def approve_listing(
    listing_id: int,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = await session.get(Product, listing_id)
    if not product or product.deleted_at is not None:
        raise NotFoundError("Listing", str(listing_id))
    if product.status not in (
        ListingStatus.PENDING_REVIEW,
        ListingStatus.REJECTED,
        ListingStatus.APPROVED,
    ):
        raise ValidationError("Only pending or rejected listings can be approved")

    product.status = ListingStatus.PUBLISHED
    product.rejection_reason = None
    product.is_active = True
    product.is_sold = False
    product.listed_at = datetime.now(timezone.utc)
    if not product.collection:
        product.collection = "just-listed"

    if product.seller_user_id:
        queue_notification(
            session,
            user_id=product.seller_user_id,
            type=NotificationType.LISTING_APPROVED,
            title="Listing approved",
            message=f"“{product.name}” is now live on Going Twice.",
            link="/account/uploads",
        )

    await session.commit()
    await session.refresh(product)
    seller = await _load_seller(session, product)
    await notify_listing_approved(seller=seller, product=product)
    return success_response(
        message="Listing approved and published",
        data=_listing_payload(product, seller),
    )


@router.post("/listings/{listing_id}/reject")
async def reject_listing(
    listing_id: int,
    data: RejectListingRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = await session.get(Product, listing_id)
    if not product or product.deleted_at is not None:
        raise NotFoundError("Listing", str(listing_id))
    if product.status not in (ListingStatus.PENDING_REVIEW, ListingStatus.PUBLISHED, ListingStatus.APPROVED):
        raise ValidationError("This listing cannot be rejected")

    product.status = ListingStatus.REJECTED
    product.rejection_reason = data.rejection_reason.strip()
    product.is_active = False
    product.collection = None

    if product.seller_user_id:
        queue_notification(
            session,
            user_id=product.seller_user_id,
            type=NotificationType.LISTING_REJECTED,
            title="Listing rejected",
            message=f"“{product.name}” was rejected: {product.rejection_reason}",
            link="/account/uploads",
        )

    await session.commit()
    await session.refresh(product)
    seller = await _load_seller(session, product)
    await notify_listing_rejected(
        seller=seller,
        product_name=product.name,
        reason=product.rejection_reason or "Needs changes",
    )
    return success_response(message="Listing rejected", data=_listing_payload(product, seller))


@router.get("/orders")
async def list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    status: str | None = None,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    per_page = clamp_per_page(per_page)
    filters = []
    if status:
        filters.append(Order.status == status)

    query = select(Order)
    count_query = select(func.count()).select_from(Order)
    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    total = (await session.execute(count_query)).scalar_one()
    result = await session.execute(
        query.order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    return success_response(
        message="Orders retrieved",
        data={
            "items": [serialize_order(order, admin) for order in result.scalars().all()],
            "total": total,
            "page": page,
            "per_page": per_page,
        },
    )
