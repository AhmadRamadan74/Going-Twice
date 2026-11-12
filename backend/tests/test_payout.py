"""Seller payout details persist and are copied onto orders."""

API = "/api/v1"


async def test_profile_saves_wallets_bank_and_address(client, make_user, auth):
    user = await make_user("payout@goingtwice.eg", full_name="Salma Seller")
    headers = await auth(user.email)

    response = await client.patch(
        f"{API}/auth/me",
        json={
            "pickup_address": {
                "city": "Cairo",
                "area": "Zamalek",
                "street": "26 El Gezira St",
                "building": "Villa 4",
            },
            "payout_wallets": [
                {"type": "InstaPay", "handle": "salma.seller"},
                {"type": "vodafone_cash", "handle": "01012345678"},
            ],
            "payout_bank": {
                "holder_name": "Salma Seller",
                "bank_name": "CIB",
                "iban": "EG123456789",
            },
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    me = response.json()["data"]
    assert me["pickup_address"]["area"] == "Zamalek"
    types = {row["type"] for row in me["payout_wallets"]}
    assert types == {"instapay", "vodafone_cash"}
    assert me["payout_bank"]["iban"] == "EG123456789"

    fetched = await client.get(f"{API}/auth/me", headers=headers)
    assert fetched.json()["data"]["payout_wallets"][0]["handle"] == "salma.seller"


async def test_checkout_copies_seller_payout_onto_the_order(
    client, make_user, make_product, auth
):
    seller = await make_user("payee@goingtwice.eg", full_name="Omar Farouk")
    seller_headers = await auth(seller.email)
    await client.patch(
        f"{API}/auth/me",
        json={
            "pickup_address": {
                "city": "Cairo",
                "area": "Garden City",
                "street": "4 Ahmed Ragheb",
                "building": "Apt 6",
            },
            "payout_wallets": [{"type": "instapay", "handle": "omar.farouk"}],
            "payout_bank": {
                "holder_name": "Omar Farouk",
                "bank_name": "CIB",
                "iban": "EG380019000500000000263180002",
            },
        },
        headers=seller_headers,
    )
    product = await make_product(seller=seller, name="Brass Sconce")

    buyer = await make_user("payer@goingtwice.eg")
    headers = await auth(buyer.email)
    added = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert added.status_code == 200, added.text

    checkout = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=headers,
    )
    assert checkout.status_code == 200, checkout.text
    order = checkout.json()["data"][0]
    assert order["payout"]["handle"] == "omar.farouk"
    assert order["payout"]["method"] == "instapay"
    assert "Garden City" in (order["pickup_address"] or "")

    detail = await client.get(f"{API}/orders/{order['id']}", headers=headers)
    assert detail.json()["data"]["payout"]["handle"] == "omar.farouk"


async def test_checkout_copies_bank_details_for_a_transfer(
    client, make_user, make_product, auth
):
    seller = await make_user("bankee@goingtwice.eg", full_name="Nour Bank")
    seller_headers = await auth(seller.email)
    await client.patch(
        f"{API}/auth/me",
        json={
            "payout_bank": {
                "holder_name": "Nour Bank",
                "bank_name": "Banque Misr",
                "iban": "EG111122223333",
            }
        },
        headers=seller_headers,
    )
    product = await make_product(seller=seller, name="Gilt Mirror")

    buyer = await make_user("banker@goingtwice.eg")
    headers = await auth(buyer.email)
    added = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert added.status_code == 200, added.text

    checkout = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "bank_transfer"},
        headers=headers,
    )
    assert checkout.status_code == 200, checkout.text
    order = checkout.json()["data"][0]
    assert order["payout"]["iban"] == "EG111122223333"
    assert order["payout"]["bank_name"] == "Banque Misr"


async def test_checkout_copies_etisalat_cash_handle(
    client, make_user, make_product, auth
):
    seller = await make_user("etisalat-payee@goingtwice.eg", full_name="Mona Cash")
    seller_headers = await auth(seller.email)
    await client.patch(
        f"{API}/auth/me",
        json={
            "payout_wallets": [
                {"type": "etisalat_cash", "handle": "01155555555"},
            ]
        },
        headers=seller_headers,
    )
    product = await make_product(seller=seller, name="Rattan Screen")

    buyer = await make_user("etisalat-payer@goingtwice.eg")
    headers = await auth(buyer.email)
    added = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert added.status_code == 200, added.text

    checkout = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "etisalat_cash"},
        headers=headers,
    )
    assert checkout.status_code == 200, checkout.text
    order = checkout.json()["data"][0]
    assert order["payment_method"] == "etisalat_cash"
    assert order["payout"]["method"] == "etisalat_cash"
    assert order["payout"]["handle"] == "01155555555"
