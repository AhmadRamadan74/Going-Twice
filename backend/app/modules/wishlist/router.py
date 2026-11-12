from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.responses import success_response
from app.modules.auth.domain.entities import User
from app.modules.products.entities import Product
from app.modules.products.queries import is_available_for_purchase
from app.modules.products.schemas import ProductResponse
from app.modules.wishlist.entities import WishlistItem
from app.modules.wishlist.schemas import AddWishlistRequest

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


def _dump_item(item: WishlistItem) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "product": ProductResponse.from_entity(item.product).model_dump(mode="json"),
    }


@router.get("")
async def list_wishlist(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == user.id)
        .order_by(WishlistItem.created_at.desc())
    )
    items = [_dump_item(row) for row in result.scalars().all() if row.product]
    return success_response(message="Wishlist retrieved", data=items)


@router.post("")
async def add_to_wishlist(
    data: AddWishlistRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = await session.get(Product, data.product_id)
    if not product or product.deleted_at is not None:
        raise NotFoundError("Product", str(data.product_id))
    if not await is_available_for_purchase(session, product):
        raise ValidationError("This piece is not available")
    if product.seller_user_id == user.id:
        raise ValidationError("You cannot wishlist your own listing")

    existing = await session.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == user.id,
            WishlistItem.product_id == product.id,
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError("This piece is already in your wishlist")

    item = WishlistItem(user_id=user.id, product_id=product.id)
    session.add(item)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError("This piece is already in your wishlist") from exc
    await session.refresh(item)
    return success_response(message="Added to wishlist", data=_dump_item(item))


@router.delete("/{product_id}")
async def remove_from_wishlist(
    product_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == user.id,
            WishlistItem.product_id == product_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundError("Wishlist item", str(product_id))
    await session.delete(item)
    await session.commit()
    return success_response(message="Removed from wishlist", data=None)
