"""Best-effort marketplace mail: orders and listing review.

A failed send is logged inside ``send_email`` and never fails checkout or
moderation. In-app notifications stay the source of truth inside the product.
"""

from __future__ import annotations

from app.core import email as email_mod
from app.core.config import settings
from app.core.email_templates import notice_email
from app.core.marketplace import PaymentMethod

_PAYMENT_LABELS = {
    PaymentMethod.INSTAPAY: "InstaPay",
    PaymentMethod.BANK_TRANSFER: "Bank transfer",
    PaymentMethod.VODAFONE_CASH: "Vodafone Cash",
    PaymentMethod.ETISALAT_CASH: "Etisalat Cash",
}


def _site(path: str) -> str:
    base = (settings.FRONTEND_URL or "").rstrip("/")
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{base}{path}"


def _price(order) -> str:
    currency = getattr(order, "currency", None) or "EGP"
    return f"{currency} {order.price}"


def _method(order) -> str:
    key = (getattr(order, "payment_method", None) or "").lower()
    return _PAYMENT_LABELS.get(key, key.replace("_", " ") or "the agreed method")


def _handle(order) -> str | None:
    payload = getattr(order, "payout_instructions", None) or {}
    if not isinstance(payload, dict):
        return None
    handle = payload.get("handle") or payload.get("iban")
    return str(handle).strip() if handle else None


async def send_quietly(
    *,
    to: str | None,
    subject: str,
    html: str,
    text: str,
    reply_to: str | None = None,
) -> bool:
    if not to:
        return False
    return await email_mod.send_email(
        to=to, subject=subject, html=html, text=text, reply_to=reply_to
    )


async def notify_order_placed(*, buyer, seller, order) -> None:
    piece = order.product_name
    orders_url = _site("/account/orders")
    handle = _handle(order)
    pay_line = (
        f"Send {_price(order)} via {_method(order)} to {handle}."
        if handle
        else f"Pay the seller {_price(order)} via {_method(order)}."
    )
    if buyer and buyer.email:
        subject, html, text = notice_email(
            subject=f"Order placed — {piece}",
            heading="Your order is placed",
            full_name=buyer.full_name,
            paragraphs=[
                f"you ordered “{piece}” ({_price(order)}).",
                pay_line,
                "After you pay, confirm it from your orders page so the seller can hand over the piece.",
            ],
            button_label="View your order",
            button_href=orders_url,
        )
        await send_quietly(to=buyer.email, subject=subject, html=html, text=text)
    if seller and seller.email:
        subject, html, text = notice_email(
            subject=f"New order — {piece}",
            heading="You have a new order",
            full_name=seller.full_name,
            paragraphs=[
                f"{buyer.full_name} ordered “{piece}” ({_price(order)}).",
                "They will pay you directly. Confirm handover once they have the piece.",
            ],
            button_label="View the order",
            button_href=orders_url,
        )
        await send_quietly(to=seller.email, subject=subject, html=html, text=text)


async def notify_payment_confirmed(*, seller, order, buyer_name: str) -> None:
    if not seller or not seller.email:
        return
    subject, html, text = notice_email(
        subject=f"Payment confirmed — {order.product_name}",
        heading="The buyer confirmed payment",
        full_name=seller.full_name,
        paragraphs=[
            f"{buyer_name} confirmed payment for “{order.product_name}”.",
            "Arrange handover, then confirm it from your orders page.",
        ],
        button_label="View the order",
        button_href=_site("/account/orders"),
    )
    await send_quietly(to=seller.email, subject=subject, html=html, text=text)


async def notify_handover_confirmed(*, buyer, order, seller_name: str) -> None:
    if not buyer or not buyer.email:
        return
    subject, html, text = notice_email(
        subject=f"Handover confirmed — {order.product_name}",
        heading="The seller confirmed handover",
        full_name=buyer.full_name,
        paragraphs=[
            f"{seller_name} confirmed handover of “{order.product_name}”.",
            "If you have already paid, you are done. Otherwise confirm payment from your orders page.",
        ],
        button_label="View your order",
        button_href=_site("/account/orders"),
    )
    await send_quietly(to=buyer.email, subject=subject, html=html, text=text)


async def notify_order_completed(*, buyer, seller, order) -> None:
    piece = order.product_name
    url = _site("/account/orders")
    for person, heading in (
        (buyer, "This order is complete"),
        (seller, "This sale is complete"),
    ):
        if not person or not person.email:
            continue
        subject, html, text = notice_email(
            subject=f"Order completed — {piece}",
            heading=heading,
            full_name=person.full_name,
            paragraphs=[
                f"both sides confirmed. “{piece}” is marked sold.",
            ],
            button_label="View the order",
            button_href=url,
        )
        await send_quietly(to=person.email, subject=subject, html=html, text=text)


async def notify_listing_submitted(*, seller, product_name: str) -> None:
    if not seller or not seller.email:
        return
    subject, html, text = notice_email(
        subject=f"Listing submitted — {product_name}",
        heading="Your listing is in review",
        full_name=seller.full_name,
        paragraphs=[
            f"“{product_name}” was submitted and is waiting for review.",
            "It is not public yet. We will email you when it is approved or if anything needs changing.",
        ],
        button_label="My uploads",
        button_href=_site("/account/uploads"),
    )
    await send_quietly(to=seller.email, subject=subject, html=html, text=text)


async def notify_listing_approved(*, seller, product) -> None:
    if not seller or not seller.email:
        return
    slug = getattr(product, "slug", None)
    href = _site(f"/product/{slug}") if slug else _site("/account/uploads")
    subject, html, text = notice_email(
        subject=f"Listing live — {product.name}",
        heading="Your listing is live",
        full_name=seller.full_name,
        paragraphs=[
            f"“{product.name}” is now published on Going Twice.",
        ],
        button_label="View the listing",
        button_href=href,
    )
    await send_quietly(to=seller.email, subject=subject, html=html, text=text)


async def notify_listing_rejected(*, seller, product_name: str, reason: str) -> None:
    if not seller or not seller.email:
        return
    subject, html, text = notice_email(
        subject=f"Listing needs changes — {product_name}",
        heading="Your listing was not approved",
        full_name=seller.full_name,
        paragraphs=[
            f"“{product_name}” was not published.",
            f"Reason: {reason}",
            "You can edit it and resubmit from My Uploads.",
        ],
        button_label="My uploads",
        button_href=_site("/account/uploads"),
    )
    await send_quietly(to=seller.email, subject=subject, html=html, text=text)


async def notify_new_message(*, recipient, sender_name: str, product_name: str, conversation_id: int) -> None:
    if not recipient or not recipient.email:
        return
    subject, html, text = notice_email(
        subject=f"New message from {sender_name}",
        heading="You have a new message",
        full_name=recipient.full_name,
        paragraphs=[
            f"{sender_name} sent you a message about “{product_name}”.",
        ],
        button_label="Reply",
        button_href=_site(f"/messages/{conversation_id}"),
    )
    await send_quietly(to=recipient.email, subject=subject, html=html, text=text)


async def notify_contact_message(*, recipients: list[str], message) -> None:
    seen: set[str] = set()
    subject_line = (getattr(message, "subject", None) or "General enquiry").strip()
    phone = (getattr(message, "phone", None) or "").strip()
    paragraphs = [
        f"{message.full_name} wrote via the contact form.",
        f"Email: {message.email}",
    ]
    if phone:
        paragraphs.append(f"Phone: {phone}")
    paragraphs.extend(
        [
            f"Subject: {subject_line}",
            message.message,
            "Reply directly to this email to reach them.",
        ]
    )
    for address in recipients:
        to = (address or "").strip().lower()
        if not to or to in seen:
            continue
        seen.add(to)
        subject, html, text = notice_email(
            subject=f"Contact form — {subject_line}",
            heading="New contact form message",
            full_name="there",
            paragraphs=paragraphs,
        )
        await send_quietly(
            to=to,
            subject=subject,
            html=html,
            text=text,
            reply_to=message.email,
        )
