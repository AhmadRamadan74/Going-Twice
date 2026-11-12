"""Checkout creates real orders that both sides can see."""

from app.core.marketplace import ListingStatus, OrderStatus

API = "/api/v1"


async def _add_to_cart(client, headers, product_id):
    response = await client.post(
        f"{API}/cart/items", json={"product_id": product_id}, headers=headers
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def test_checkout_creates_order_visible_to_buyer_and_seller(
    client, make_user, make_product, auth
):
    seller = await make_user("seller@goingtwice.eg", full_name="Salma Seller")
    buyer = await make_user("buyer@goingtwice.eg", full_name="Bassem Buyer")
    product = await make_product(seller=seller, name="Brass Floor Lamp", price="4200")

    buyer_headers = await auth(buyer.email)
    await _add_to_cart(client, buyer_headers, product.id)

    response = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=buyer_headers,
    )
    assert response.status_code == 200, response.text
    orders = response.json()["data"]
    assert len(orders) == 1

    order = orders[0]
    assert order["order_number"].startswith("GT-")
    assert order["status"] == OrderStatus.ORDER_PLACED
    assert order["perspective"] == "buyer"
    order_number = order["order_number"]

    # The buyer sees it in their orders.
    mine = await client.get(f"{API}/orders", headers=buyer_headers)
    assert [row["order_number"] for row in mine.json()["data"]] == [order_number]

    # The seller sees the very same order from the selling side.
    seller_headers = await auth(seller.email)
    selling = await client.get(f"{API}/orders/selling", headers=seller_headers)
    seller_rows = selling.json()["data"]
    assert [row["order_number"] for row in seller_rows] == [order_number]
    assert seller_rows[0]["perspective"] == "seller"
    assert seller_rows[0]["id"] == order["id"]


async def test_checkout_empties_the_cart(client, make_user, make_product, auth):
    seller = await make_user("seller2@goingtwice.eg")
    buyer = await make_user("buyer2@goingtwice.eg")
    product = await make_product(seller=seller)

    headers = await auth(buyer.email)
    await _add_to_cart(client, headers, product.id)

    await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=headers,
    )

    cart = await client.get(f"{API}/cart", headers=headers)
    assert cart.json()["data"]["items"] == []


async def test_checkout_rejects_an_empty_cart(client, make_user, auth):
    buyer = await make_user("empty@goingtwice.eg")
    headers = await auth(buyer.email)

    response = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=headers,
    )
    assert response.status_code == 400
    assert "cart is empty" in response.json()["message"].lower()


async def test_checkout_requires_authentication(client):
    response = await client.post(
        f"{API}/orders/checkout", json={"payment_method": "instapay"}
    )
    assert response.status_code == 401


async def test_checkout_rejects_unknown_payment_method(
    client, make_user, make_product, auth
):
    seller = await make_user("seller3@goingtwice.eg")
    buyer = await make_user("buyer3@goingtwice.eg")
    product = await make_product(seller=seller)

    headers = await auth(buyer.email)
    await _add_to_cart(client, headers, product.id)

    response = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "bitcoin"},
        headers=headers,
    )
    assert response.status_code == 400
    assert "payment method" in response.json()["message"].lower()


async def test_checkout_splits_a_multi_seller_cart_into_one_order_each(
    client, make_user, make_product, auth
):
    seller_a = await make_user("sa@goingtwice.eg", full_name="Seller A")
    seller_b = await make_user("sb@goingtwice.eg", full_name="Seller B")
    buyer = await make_user("multi@goingtwice.eg")
    first = await make_product(seller=seller_a, name="Teak Sideboard")
    second = await make_product(seller=seller_b, name="Glass Pendant")

    headers = await auth(buyer.email)
    await _add_to_cart(client, headers, first.id)
    await _add_to_cart(client, headers, second.id)

    response = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "bank_transfer"},
        headers=headers,
    )
    orders = response.json()["data"]
    assert len(orders) == 2
    assert {row["product"]["name"] for row in orders} == {
        "Teak Sideboard",
        "Glass Pendant",
    }
    # Each seller only sees their own.
    for seller, expected in ((seller_a, "Teak Sideboard"), (seller_b, "Glass Pendant")):
        seller_headers = await auth(seller.email)
        selling = await client.get(f"{API}/orders/selling", headers=seller_headers)
        rows = selling.json()["data"]
        assert [row["product"]["name"] for row in rows] == [expected]


async def test_checkout_honours_per_item_handover(
    client, make_user, make_product, auth
):
    seller = await make_user("ship@goingtwice.eg")
    buyer = await make_user("shipbuyer@goingtwice.eg")
    pickup = await make_product(seller=seller, name="Oak Stool")
    shipped = await make_product(seller=seller, name="Wool Rug")

    headers = await auth(buyer.email)
    await _add_to_cart(client, headers, pickup.id)
    await _add_to_cart(client, headers, shipped.id)

    response = await client.post(
        f"{API}/orders/checkout",
        json={
            "payment_method": "instapay",
            "handover_type": "self_pickup",
            "item_handover": {str(shipped.id): "shipping"},
            "handover_location": "Zamalek, Cairo",
        },
        headers=headers,
    )
    orders = {row["product"]["name"]: row for row in response.json()["data"]}
    assert orders["Oak Stool"]["handover_type"] == "self_pickup"
    assert orders["Wool Rug"]["handover_type"] == "shipping"
    assert orders["Oak Stool"]["handover_location"] == "Zamalek, Cairo"


async def test_checkout_rejects_an_invalid_handover_type(
    client, make_user, make_product, auth
):
    seller = await make_user("hs@goingtwice.eg")
    buyer = await make_user("hb@goingtwice.eg")
    product = await make_product(seller=seller)

    headers = await auth(buyer.email)
    await _add_to_cart(client, headers, product.id)

    response = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay", "handover_type": "teleport"},
        headers=headers,
    )
    assert response.status_code == 400
    assert "handover" in response.json()["message"].lower()


async def test_seller_is_notified_when_an_order_is_placed(
    client, make_user, make_product, auth
):
    seller = await make_user("notify@goingtwice.eg")
    buyer = await make_user("notifybuyer@goingtwice.eg", full_name="Nour Buyer")
    product = await make_product(seller=seller, name="Cane Armchair")

    buyer_headers = await auth(buyer.email)
    await _add_to_cart(client, buyer_headers, product.id)
    await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=buyer_headers,
    )

    seller_headers = await auth(seller.email)
    notifications = await client.get(f"{API}/notifications", headers=seller_headers)
    items = notifications.json()["data"]["items"]
    assert any(row["type"] == "order_placed" for row in items)
    assert any("Cane Armchair" in row["message"] for row in items)


async def test_both_confirmations_complete_the_order_and_sell_the_piece(
    client, db, make_user, make_product, auth
):
    seller = await make_user("done@goingtwice.eg")
    buyer = await make_user("donebuyer@goingtwice.eg")
    product = await make_product(seller=seller, name="Marble Console")

    buyer_headers = await auth(buyer.email)
    await _add_to_cart(client, buyer_headers, product.id)
    created = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=buyer_headers,
    )
    order_id = created.json()["data"][0]["id"]

    paid = await client.post(
        f"{API}/orders/{order_id}/confirm-payment", headers=buyer_headers
    )
    assert paid.json()["data"]["buyer_confirmed_payment"] is True
    assert paid.json()["data"]["status"] == OrderStatus.ORDER_PLACED

    seller_headers = await auth(seller.email)
    handed = await client.post(
        f"{API}/orders/{order_id}/confirm-handover", headers=seller_headers
    )
    final = handed.json()["data"]
    assert final["seller_confirmed_handover"] is True
    assert final["status"] == OrderStatus.COMPLETED

    await db.refresh(product)
    assert product.status == ListingStatus.SOLD


async def test_a_stranger_cannot_read_someone_elses_order(
    client, make_user, make_product, auth
):
    seller = await make_user("s9@goingtwice.eg")
    buyer = await make_user("b9@goingtwice.eg")
    nosy = await make_user("nosy@goingtwice.eg")
    product = await make_product(seller=seller)

    buyer_headers = await auth(buyer.email)
    await _add_to_cart(client, buyer_headers, product.id)
    created = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=buyer_headers,
    )
    order_id = created.json()["data"][0]["id"]

    nosy_headers = await auth(nosy.email)
    response = await client.get(f"{API}/orders/{order_id}", headers=nosy_headers)
    assert response.status_code == 403


async def test_buyer_cannot_confirm_handover(client, make_user, make_product, auth):
    seller = await make_user("s10@goingtwice.eg")
    buyer = await make_user("b10@goingtwice.eg")
    product = await make_product(seller=seller)

    buyer_headers = await auth(buyer.email)
    await _add_to_cart(client, buyer_headers, product.id)
    created = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=buyer_headers,
    )
    order_id = created.json()["data"][0]["id"]

    response = await client.post(
        f"{API}/orders/{order_id}/confirm-handover", headers=buyer_headers
    )
    assert response.status_code == 403


async def test_handover_details_can_be_updated_on_an_open_order(
    client, make_user, make_product, auth
):
    seller = await make_user("s11@goingtwice.eg")
    buyer = await make_user("b11@goingtwice.eg")
    product = await make_product(seller=seller)

    headers = await auth(buyer.email)
    await _add_to_cart(client, headers, product.id)
    created = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=headers,
    )
    order_id = created.json()["data"][0]["id"]

    response = await client.patch(
        f"{API}/orders/{order_id}/handover",
        json={
            "handover_location": "Maadi, Cairo",
            "handover_notes": "Weekday evenings",
            "handover_type": "shipping",
        },
        headers=headers,
    )
    data = response.json()["data"]
    assert data["handover_location"] == "Maadi, Cairo"
    assert data["handover_notes"] == "Weekday evenings"
    assert data["handover_type"] == "shipping"
