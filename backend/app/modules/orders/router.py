from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_verified_email
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.marketplace import ListingStatus, NotificationType, OrderStatus
from app.core.payout import accepted_payment_methods, pickup_from_user, snapshot_payout
from app.core.responses import success_response
from app.core.transactional import (
    notify_handover_confirmed,
    notify_order_completed,
    notify_order_placed,
    notify_payment_confirmed,
)
from app.modules.auth.domain.entities import User
from app.modules.cart.entities import CartItem
from app.modules.cart.service import list_cart_items
from app.modules.notifications.service import queue_notification
from app.modules.orders.entities import Order
from app.modules.orders.schemas import (
    CheckoutRequest,
    UpdateHandoverRequest,
    parse_handover_type,
    parse_payment_method,
    serialize_order,
)
from app.modules.products.entities import Product
from app.modules.products.queries import is_available_for_purchase
from app.modules.wishlist.entities import WishlistItem

router = APIRouter(prefix="/orders", tags=["Orders"])


async def _get_accessible_order(
    session: AsyncSession, order_id: int, user: User
) -> Order:
    order = await session.get(Order, order_id)
    if not order:
        raise NotFoundError("Order", str(order_id))
    is_admin = bool(user.role and user.role.name == "admin")
    if user.id not in (order.buyer_id, order.seller_id) and not is_admin:
        raise ForbiddenError("You cannot view this order")
    return order


def _maybe_complete(order: Order, product: Product | None) -> bool:
    if order.buyer_confirmed_payment and order.seller_confirmed_handover:
        order.status = OrderStatus.COMPLETED
        if product:
            product.status = ListingStatus.SOLD
            product.is_active = False
            product.is_sold = True
        return True
    return False


@router.post("/checkout")
async def checkout(
    data: CheckoutRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(require_verified_email),
):
    try:
        payment_method = parse_payment_method(data.payment_method)
    except ValueError as exc:
        raise ValidationError(
            "Payment method must be one of: instapay, bank_transfer, vodafone_cash, etisalat_cash"
        ) from exc

    try:
        default_handover = parse_handover_type(data.handover_type)
        item_handover = {
            product_id: parse_handover_type(value)
            for product_id, value in (data.item_handover or {}).items()
        }
    except ValueError as exc:
        raise ValidationError(
            "Handover type must be one of: self_pickup, shipping"
        ) from exc

    items = await list_cart_items(session, user.id)
    if not items:
        raise ValidationError("Your cart is empty")

    created: list[Order] = []
    for item in items:
        product = item.product
        if not product or not await is_available_for_purchase(session, product):
            raise ValidationError(
                f"“{product.name if product else 'A piece'}” is no longer available"
            )
        if not product.seller_user_id:
            raise ValidationError(f"“{product.name}” cannot be purchased yet")
        if product.seller_user_id == user.id:
            raise ValidationError("You cannot buy your own listing")

        seller = await session.get(User, product.seller_user_id)
        if not seller:
            raise ValidationError(f"“{product.name}” cannot be purchased yet")

        accepted = list(product.payment_methods or [])
        for method in accepted_payment_methods(seller):
            if method not in accepted:
                accepted.append(method)
        if accepted and payment_method not in accepted:
            raise ValidationError(
                f"Seller of “{product.name}” does not accept {payment_method.replace('_', ' ')}"
            )

        piece_handover = item_handover.get(product.id, default_handover)
        pickup = pickup_from_user(seller)
        handover_location = data.handover_location
        if not handover_location and piece_handover == "self_pickup":
            handover_location = pickup or None

        order = Order(
            order_number=f"GT-{uuid4().hex[:12].upper()}",
            buyer_id=user.id,
            seller_id=product.seller_user_id,
            product_id=product.id,
            product_name=product.name,
            product_image_url=product.image_url,
            seller_name=product.seller_name,
            price=item.price_at_addition,
            currency=product.currency,
            payment_method=payment_method,
            payout_instructions=snapshot_payout(seller, payment_method),
            pickup_address=pickup or None,
            status=OrderStatus.ORDER_PLACED,
            handover_type=piece_handover,
            handover_location=handover_location,
            handover_time=data.handover_time,
            handover_notes=data.handover_notes,
        )
        session.add(order)
        created.append(order)
        queue_notification(
            session,
            user_id=product.seller_user_id,
            type=NotificationType.ORDER_PLACED,
            title="New order",
            message=f"{user.full_name} placed an order for “{product.name}”.",
            link="/account/orders",
        )

    try:
        await session.flush()
        product_ids = [order.product_id for order in created]
        await session.execute(delete(CartItem).where(CartItem.user_id == user.id))
        await session.execute(
            delete(CartItem).where(CartItem.product_id.in_(product_ids))
        )
        await session.execute(
            delete(WishlistItem).where(WishlistItem.product_id.in_(product_ids))
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ValidationError("This piece is no longer available") from exc
    for order in created:
        await session.refresh(order)

    for order in created:
        await notify_order_placed(buyer=user, seller=order.seller, order=order)

    return success_response(
        message="Order placed. Pay the seller directly, then confirm payment here.",
        data=[serialize_order(order, user) for order in created],
    )


@router.get("")
async def my_orders(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Order).where(Order.buyer_id == user.id).order_by(Order.created_at.desc())
    )
    return success_response(
        message="Your orders",
        data=[serialize_order(order, user) for order in result.scalars().all()],
    )


@router.get("/selling")
async def selling_orders(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Order).where(Order.seller_id == user.id).order_by(Order.created_at.desc())
    )
    return success_response(
        message="Orders for your listings",
        data=[serialize_order(order, user) for order in result.scalars().all()],
    )


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = await _get_accessible_order(session, order_id, user)
    return success_response(message="Order retrieved", data=serialize_order(order, user))


@router.post("/{order_id}/confirm-payment")
async def confirm_payment(
    order_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = await _get_accessible_order(session, order_id, user)
    if user.id != order.buyer_id:
        raise ForbiddenError("Only the buyer can confirm payment")
    if order.status == OrderStatus.CANCELLED:
        raise ValidationError("This order is cancelled")
    if order.buyer_confirmed_payment:
        return success_response(message="Payment already confirmed", data=serialize_order(order, user))

    order.buyer_confirmed_payment = True
    order.buyer_confirmed_payment_at = datetime.now(timezone.utc)
    product = order.product
    completed = _maybe_complete(order, product)
    if order.seller_id:
        queue_notification(
            session,
            user_id=order.seller_id,
            type=NotificationType.PAYMENT_CONFIRMED,
            title="Buyer confirmed payment",
            message=f"{user.full_name} confirmed payment for “{order.product_name}”.",
            link="/account/orders",
        )
    if completed:
        _notify_completed(session, order, product)
    await session.commit()
    await session.refresh(order)
    if completed:
        await notify_order_completed(buyer=order.buyer, seller=order.seller, order=order)
    else:
        await notify_payment_confirmed(
            seller=order.seller, order=order, buyer_name=user.full_name
        )
    return success_response(
        message="Order completed" if completed else "Payment confirmed",
        data=serialize_order(order, user),
    )


@router.post("/{order_id}/confirm-handover")
async def confirm_handover(
    order_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = await _get_accessible_order(session, order_id, user)
    if user.id != order.seller_id:
        raise ForbiddenError("Only the seller can confirm handover")
    if order.status == OrderStatus.CANCELLED:
        raise ValidationError("This order is cancelled")
    if order.seller_confirmed_handover:
        return success_response(
            message="Handover already confirmed", data=serialize_order(order, user)
        )

    order.seller_confirmed_handover = True
    order.seller_confirmed_handover_at = datetime.now(timezone.utc)
    product = order.product
    completed = _maybe_complete(order, product)
    queue_notification(
        session,
        user_id=order.buyer_id,
        type=NotificationType.HANDOVER_CONFIRMED,
        title="Seller confirmed handover",
        message=f"{user.full_name} confirmed handover of “{order.product_name}”.",
        link="/account/orders",
    )
    if completed:
        _notify_completed(session, order, product)
    await session.commit()
    await session.refresh(order)
    if completed:
        await notify_order_completed(buyer=order.buyer, seller=order.seller, order=order)
    else:
        await notify_handover_confirmed(
            buyer=order.buyer, order=order, seller_name=user.full_name
        )
    return success_response(
        message="Order completed" if completed else "Handover confirmed",
        data=serialize_order(order, user),
    )


@router.patch("/{order_id}/handover")
async def update_handover(
    order_id: int,
    data: UpdateHandoverRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = await _get_accessible_order(session, order_id, user)
    if user.id not in (order.buyer_id, order.seller_id):
        raise ForbiddenError("Only buyer or seller can update handover details")
    if order.status != OrderStatus.ORDER_PLACED:
        raise ValidationError("Handover details can only be updated on an open order")
    if data.handover_time is not None:
        order.handover_time = data.handover_time
    if data.handover_notes is not None:
        order.handover_notes = data.handover_notes
    if data.handover_location is not None:
        order.handover_location = data.handover_location
    if data.handover_type is not None:
        try:
            order.handover_type = parse_handover_type(data.handover_type)
        except ValueError as exc:
            raise ValidationError(
                "Handover type must be one of: self_pickup, shipping"
            ) from exc
    await session.commit()
    await session.refresh(order)
    return success_response(message="Handover details updated", data=serialize_order(order, user))


def _notify_completed(session: AsyncSession, order: Order, product: Product | None) -> None:
    name = product.name if product else order.product_name
    for user_id in (order.buyer_id, order.seller_id):
        if not user_id:
            continue
        queue_notification(
            session,
            user_id=user_id,
            type=NotificationType.ORDER_COMPLETED,
            title="Order completed",
            message=f"Both sides confirmed. “{name}” is marked sold.",
            link="/account/orders",
        )
