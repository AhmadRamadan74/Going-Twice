"""Seller payout details for P2P transfers (InstaPay, wallets, bank)."""

from __future__ import annotations

from uuid import uuid4

from app.core.marketplace import PaymentMethod

WALLET_ALIASES = {
    "instapay": PaymentMethod.INSTAPAY,
    "vodafone_cash": PaymentMethod.VODAFONE_CASH,
    "vodafone cash": PaymentMethod.VODAFONE_CASH,
    "etisalat_cash": PaymentMethod.ETISALAT_CASH,
    "etisalat cash": PaymentMethod.ETISALAT_CASH,
}


def normalize_wallet_type(value: str) -> str | None:
    key = (value or "").strip().lower().replace("-", "_")
    return WALLET_ALIASES.get(key)


def normalize_wallets(raw: list | None) -> list[dict]:
    wallets: list[dict] = []
    seen: set[str] = set()
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        kind = normalize_wallet_type(str(item.get("type") or ""))
        handle = str(item.get("handle") or "").strip()[:80]
        if not kind or not handle:
            continue
        if kind in seen:
            continue
        seen.add(kind)
        wallet_id = str(item.get("id") or "").strip() or uuid4().hex[:12]
        wallets.append({"id": wallet_id[:40], "type": kind, "handle": handle})
        if len(wallets) >= 8:
            break
    return wallets


def normalize_bank(raw: dict | None) -> dict | None:
    if not raw:
        return None
    holder = str(raw.get("holder_name") or raw.get("holderName") or "").strip()[:255]
    bank = str(raw.get("bank_name") or raw.get("bankName") or "").strip()[:255]
    iban = str(raw.get("iban") or "").strip()[:64]
    if not holder or not bank or not iban:
        return None
    return {"holder_name": holder, "bank_name": bank, "iban": iban}


def format_pickup_address(
    *,
    street: str | None = None,
    building: str | None = None,
    area: str | None = None,
    city: str | None = None,
) -> str:
    return ", ".join(
        part.strip()
        for part in (street, building, area, city)
        if part and part.strip()
    )


def pickup_from_user(user) -> str:
    return format_pickup_address(
        street=getattr(user, "pickup_street", None),
        building=getattr(user, "pickup_building", None),
        area=getattr(user, "pickup_area", None),
        city=getattr(user, "pickup_city", None),
    )


def accepted_payment_methods(user) -> list[str]:
    methods: list[str] = []
    for wallet in getattr(user, "payout_wallets", None) or []:
        kind = (wallet or {}).get("type")
        if kind and kind not in methods:
            methods.append(kind)
    if getattr(user, "payout_bank", None):
        methods.append(PaymentMethod.BANK_TRANSFER)
    return methods


def snapshot_payout(seller, payment_method: str) -> dict:
    """Freeze how the buyer should pay this seller for this order."""
    handle = None
    for wallet in getattr(seller, "payout_wallets", None) or []:
        if (wallet or {}).get("type") == payment_method:
            handle = wallet.get("handle")
            break
    bank = getattr(seller, "payout_bank", None) or {}
    pickup = pickup_from_user(seller)
    payload = {
        "method": payment_method,
        "handle": handle,
        "phone_number": seller.phone_number,
        "pickup_address": pickup or None,
    }
    if payment_method == PaymentMethod.BANK_TRANSFER and bank:
        payload["bank_holder"] = bank.get("holder_name")
        payload["bank_name"] = bank.get("bank_name")
        payload["iban"] = bank.get("iban")
    return payload
