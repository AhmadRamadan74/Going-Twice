from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.responses import success_response
from app.modules.auth.domain.entities import User
from app.modules.cart.entities import CartItem
from app.modules.cart.schemas import AddCartItemRequest
from app.modules.cart.service import list_cart_items
from app.modules.products.entities import Product
from app.modules.products.queries import is_available_for_purchase
from app.modules.products.schemas import ProductResponse

router = APIRouter(prefix="/cart", tags=["Cart"])


def serialize_cart(items: list[CartItem]) -> dict:
    payload = []
    total = Decimal("0")
    for item in items:
        product = item.product
        available = bool(product and product.deleted_at is None)
        payload.append(
            {
                "id": item.id,
                "product_id": item.product_id,
                "price_at_addition": str(item.price_at_addition),
                "quantity": item.quantity,
                "available": available,
                "product": ProductResponse.from_entity(product).model_dump(mode="json")
                if product
                else None,
            }
        )
        if available:
            total += item.price_at_addition * item.quantity
    return {
        "items": payload,
        "item_count": len(payload),
        "total": str(total),
        "currency": "EGP",
    }


@router.get("")
async def get_cart(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items = await list_cart_items(session, user.id)
    return success_response(message="Cart retrieved", data=serialize_cart(items))


@router.post("/items")
async def add_cart_item(
    data: AddCartItemRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = await session.get(Product, data.product_id)
    if not product or product.deleted_at is not None:
        raise NotFoundError("Product", str(data.product_id))
    if product.seller_user_id == user.id:
        raise ValidationError("You cannot buy your own listing")
    if not await is_available_for_purchase(session, product):
        raise ValidationError("This piece is no longer available")

    existing = await session.execute(
        select(CartItem).where(
            CartItem.user_id == user.id,
            CartItem.product_id == product.id,
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError("This unique piece is already in your cart")

    session.add(
        CartItem(
            user_id=user.id,
            product_id=product.id,
            price_at_addition=product.price,
            quantity=1,
        )
    )
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError("This unique piece is already in your cart") from exc
    items = await list_cart_items(session, user.id)
    return success_response(message="Added to cart", data=serialize_cart(items))


@router.delete("/items/{product_id}")
async def remove_cart_item(
    product_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(CartItem).where(
            CartItem.user_id == user.id,
            CartItem.product_id == product_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundError("Cart item", str(product_id))
    await session.delete(item)
    await session.commit()
    items = await list_cart_items(session, user.id)
    return success_response(message="Removed from cart", data=serialize_cart(items))


@router.delete("")
async def clear_cart(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items = await list_cart_items(session, user.id)
    for item in items:
        await session.delete(item)
    await session.commit()
    return success_response(message="Cart cleared", data=serialize_cart([]))
