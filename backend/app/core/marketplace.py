"""Marketplace constants shared across listings, orders, and notifications."""


class ListingStatus:
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED = "published"
    SOLD = "sold"
    ARCHIVED = "archived"

    PUBLIC = (PUBLISHED, APPROVED)
    SELLER_EDITABLE = (DRAFT, PENDING_REVIEW, REJECTED)


class PaymentMethod:
    INSTAPAY = "instapay"
    BANK_TRANSFER = "bank_transfer"
    VODAFONE_CASH = "vodafone_cash"
    ETISALAT_CASH = "etisalat_cash"

    ALL = (INSTAPAY, BANK_TRANSFER, VODAFONE_CASH, ETISALAT_CASH)


class OrderStatus:
    ORDER_PLACED = "order_placed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HandoverType:
    """How the buyer takes possession. Every order carries its own choice."""

    SELF_PICKUP = "self_pickup"
    SHIPPING = "shipping"

    ALL = (SELF_PICKUP, SHIPPING)


def normalize_handover_type(value: str | None) -> str:
    """Map a loose client value onto a handover type, defaulting to self pickup."""
    key = (value or "").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "self_pickup": HandoverType.SELF_PICKUP,
        "pickup": HandoverType.SELF_PICKUP,
        "collect": HandoverType.SELF_PICKUP,
        "shipping": HandoverType.SHIPPING,
        "delivery": HandoverType.SHIPPING,
        "ship": HandoverType.SHIPPING,
    }
    if not key:
        return HandoverType.SELF_PICKUP
    if key not in aliases:
        raise ValueError("Unsupported handover type")
    return aliases[key]


class NotificationType:
    LISTING_SUBMITTED = "listing_submitted"
    LISTING_APPROVED = "listing_approved"
    LISTING_REJECTED = "listing_rejected"
    ORDER_PLACED = "order_placed"
    PAYMENT_CONFIRMED = "payment_confirmed"
    HANDOVER_CONFIRMED = "handover_confirmed"
    ORDER_COMPLETED = "order_completed"
    CONTACT_MESSAGE = "contact_message"


def normalize_payment_methods(values: list[str] | None) -> list[str]:
    if not values:
        return []
    allowed = set(PaymentMethod.ALL)
    normalized: list[str] = []
    for raw in values:
        key = (raw or "").strip().lower().replace(" ", "_")
        if key not in allowed:
            continue
        if key not in normalized:
            normalized.append(key)
    return normalized
