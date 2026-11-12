"""Buy and sell stay locked until the email is verified."""

from app.core.marketplace import ListingStatus

API = "/api/v1"

MESSAGE = "verify your email before buying or selling"


async def test_unverified_buyers_can_still_use_the_cart(
    client, make_user, make_product, auth
):
    seller = await make_user("gate-seller@goingtwice.eg")
    buyer = await make_user("gate-cart@goingtwice.eg", email_verified=False)
    product = await make_product(seller=seller)
    headers = await auth(buyer.email)

    response = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert response.status_code == 200, response.text


async def test_unverified_buyers_cannot_checkout(
    client, make_user, make_product, auth
):
    seller = await make_user("gate-payee@goingtwice.eg")
    buyer = await make_user("gate-payer@goingtwice.eg", email_verified=False)
    product = await make_product(seller=seller)
    headers = await auth(buyer.email)
    await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )

    response = await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=headers,
    )
    assert response.status_code == 403
    assert MESSAGE in response.json()["message"].lower()


async def test_unverified_sellers_cannot_list_or_upload(client, make_user, auth):
    seller = await make_user("gate-list@goingtwice.eg", email_verified=False)
    headers = await auth(seller.email)

    listing = await client.post(
        f"{API}/sell/list",
        json={
            "title": "Unverified Chair",
            "description": "Should not be accepted.",
            "asking_price": 1200,
            "seller_name": seller.full_name,
            "seller_email": seller.email,
            "seller_phone": "0100000000",
            "save_as_draft": True,
        },
        headers=headers,
    )
    assert listing.status_code == 403
    assert MESSAGE in listing.json()["message"].lower()

    upload = await client.post(
        f"{API}/uploads",
        files={"files": ("shot.png", b"not-an-image", "image/png")},
        headers=headers,
    )
    assert upload.status_code == 403
    assert MESSAGE in upload.json()["message"].lower()


async def test_unverified_sellers_cannot_resubmit(client, db, make_user, auth):
    seller = await make_user("gate-resubmit@goingtwice.eg")
    headers = await auth(seller.email)
    created = await client.post(
        f"{API}/sell/list",
        json={
            "title": "Draft Chair",
            "description": "Saved before the email lapsed.",
            "asking_price": 1800,
            "seller_name": seller.full_name,
            "seller_email": seller.email,
            "seller_phone": "0100000000",
            "save_as_draft": True,
        },
        headers=headers,
    )
    assert created.status_code == 200, created.text
    listing_id = created.json()["data"]["id"]
    assert created.json()["data"]["status"] == ListingStatus.DRAFT

    seller.email_verified = False
    await db.commit()

    response = await client.post(
        f"{API}/sell/{listing_id}/resubmit", headers=headers
    )
    assert response.status_code == 403
    assert MESSAGE in response.json()["message"].lower()
