from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.core.marketplace import PaymentMethod, normalize_handover_type
from app.modules.auth.domain.entities import User
from app.modules.orders.entities import Order
from app.modules.products.schemas import ProductResponse


class CheckoutRequest(BaseModel):
    payment_method: str = Field(min_length=3, max_length=40)
    handover_time: Optional[datetime] = None
    handover_location: Optional[str] = Field(default=None, max_length=255)
    handover_notes: Optional[str] = Field(default=None, max_length=2000)
    #: Applied to every order created by this checkout.
    handover_type: Optional[str] = Field(default=None, max_length=30)
    #: Per-product override, keyed by product id. A cart of N pieces becomes N
    #: independent orders, so each one can be picked up or shipped on its own.
    item_handover: dict[int, str] = Field(default_factory=dict)


class UpdateHandoverRequest(BaseModel):
    handover_time: Optional[datetime] = None
    handover_location: Optional[str] = Field(default=None, max_length=255)
    handover_notes: Optional[str] = Field(default=None, max_length=2000)
    handover_type: Optional[str] = Field(default=None, max_length=30)


def parse_payment_method(value: str) -> str:
    key = (value or "").strip().lower().replace(" ", "_")
    aliases = {
        "instapay": PaymentMethod.INSTAPAY,
        "bank": PaymentMethod.BANK_TRANSFER,
        "bank_transfer": PaymentMethod.BANK_TRANSFER,
        "vodafone": PaymentMethod.VODAFONE_CASH,
        "vodafone_cash": PaymentMethod.VODAFONE_CASH,
        "etisalat": PaymentMethod.ETISALAT_CASH,
        "etisalat_cash": PaymentMethod.ETISALAT_CASH,
    }
    if key not in aliases:
        raise ValueError("Unsupported payment method")
    return aliases[key]


def parse_handover_type(value: str | None) -> str:
    """Public re-export so routers import handover parsing alongside payment."""
    return normalize_handover_type(value)


def _party_payload(user: User | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone_number": user.phone_number,
    }


def serialize_order(order: Order, viewer: User | None = None) -> dict:
    perspective = "buyer"
    if viewer and viewer.id == order.seller_id:
        perspective = "seller"
    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "price": str(order.price),
        "currency": order.currency,
        "payment_method": order.payment_method,
        "payout": order.payout_instructions,
        "pickup_address": order.pickup_address,
        "buyer_confirmed_payment": order.buyer_confirmed_payment,
        "buyer_confirmed_payment_at": (
            order.buyer_confirmed_payment_at.isoformat()
            if order.buyer_confirmed_payment_at
            else None
        ),
        "seller_confirmed_handover": order.seller_confirmed_handover,
        "seller_confirmed_handover_at": (
            order.seller_confirmed_handover_at.isoformat()
            if order.seller_confirmed_handover_at
            else None
        ),
        "handover_type": order.handover_type,
        "handover_location": order.handover_location,
        "handover_time": order.handover_time.isoformat() if order.handover_time else None,
        "handover_notes": order.handover_notes,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "perspective": perspective,
        "buyer": _party_payload(order.buyer),
        "seller": _party_payload(order.seller) or {"full_name": order.seller_name},
        "product": ProductResponse.from_entity(order.product).model_dump(mode="json")
        if order.product
        else {
            "id": order.product_id,
            "name": order.product_name,
            "image_url": order.product_image_url,
            "seller_name": order.seller_name,
        },
    }
