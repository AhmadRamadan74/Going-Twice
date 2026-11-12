"""Cart and wishlist are per-user server state."""

from app.core.marketplace import ListingStatus

API = "/api/v1"


# ── Cart ──────────────────────────────────────────────────────────────


async def test_cart_starts_empty_and_accepts_a_piece(
    client, make_user, make_product, auth
):
    seller = await make_user("cs@goingtwice.eg")
    buyer = await make_user("cb@goingtwice.eg")
    product = await make_product(seller=seller, name="Rattan Chair", price="3000")
    headers = await auth(buyer.email)

    empty = await client.get(f"{API}/cart", headers=headers)
    assert empty.json()["data"]["items"] == []

    added = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    data = added.json()["data"]
    assert data["item_count"] == 1
    assert data["items"][0]["product_id"] == product.id
    assert data["items"][0]["available"] is True
    assert data["total"] == "3000.00"


async def test_the_same_piece_cannot_be_added_twice(
    client, make_user, make_product, auth
):
    seller = await make_user("cs2@goingtwice.eg")
    buyer = await make_user("cb2@goingtwice.eg")
    product = await make_product(seller=seller)
    headers = await auth(buyer.email)

    await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    again = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert again.status_code == 409
    assert "already in your cart" in again.json()["message"].lower()


async def test_a_seller_cannot_add_their_own_listing(
    client, make_user, make_product, auth
):
    seller = await make_user("own@goingtwice.eg")
    product = await make_product(seller=seller)
    headers = await auth(seller.email)

    response = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert response.status_code == 400
    assert "your own listing" in response.json()["message"].lower()


async def test_an_unpublished_piece_cannot_be_added(
    client, make_user, make_product, auth
):
    seller = await make_user("draft@goingtwice.eg")
    buyer = await make_user("draftbuyer@goingtwice.eg")
    product = await make_product(seller=seller, status=ListingStatus.DRAFT)
    headers = await auth(buyer.email)

    response = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert response.status_code == 400


async def test_items_can_be_removed_and_the_cart_cleared(
    client, make_user, make_product, auth
):
    seller = await make_user("rm@goingtwice.eg")
    buyer = await make_user("rmb@goingtwice.eg")
    first = await make_product(seller=seller, name="Stool")
    second = await make_product(seller=seller, name="Lamp")
    headers = await auth(buyer.email)

    await client.post(
        f"{API}/cart/items", json={"product_id": first.id}, headers=headers
    )
    await client.post(
        f"{API}/cart/items", json={"product_id": second.id}, headers=headers
    )

    removed = await client.delete(f"{API}/cart/items/{first.id}", headers=headers)
    assert removed.json()["data"]["item_count"] == 1

    cleared = await client.delete(f"{API}/cart", headers=headers)
    assert cleared.json()["data"]["items"] == []


async def test_carts_are_isolated_between_users(client, make_user, make_product, auth):
    seller = await make_user("iso@goingtwice.eg")
    one = await make_user("one@goingtwice.eg")
    two = await make_user("two@goingtwice.eg")
    product = await make_product(seller=seller)

    one_headers = await auth(one.email)
    await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=one_headers
    )

    two_headers = await auth(two.email)
    other = await client.get(f"{API}/cart", headers=two_headers)
    assert other.json()["data"]["items"] == []


async def test_cart_requires_authentication(client):
    assert (await client.get(f"{API}/cart")).status_code == 401


# ── Wishlist ──────────────────────────────────────────────────────────


async def test_a_piece_can_be_saved_and_removed(client, make_user, make_product, auth):
    seller = await make_user("ws@goingtwice.eg")
    buyer = await make_user("wb@goingtwice.eg")
    product = await make_product(seller=seller, name="Ceramic Vase")
    headers = await auth(buyer.email)

    saved = await client.post(
        f"{API}/wishlist", json={"product_id": product.id}, headers=headers
    )
    assert saved.status_code == 200
    assert saved.json()["data"]["product"]["name"] == "Ceramic Vase"

    listed = await client.get(f"{API}/wishlist", headers=headers)
    assert [row["product_id"] for row in listed.json()["data"]] == [product.id]

    removed = await client.delete(f"{API}/wishlist/{product.id}", headers=headers)
    assert removed.status_code == 200

    after = await client.get(f"{API}/wishlist", headers=headers)
    assert after.json()["data"] == []


async def test_saving_the_same_piece_twice_conflicts(
    client, make_user, make_product, auth
):
    seller = await make_user("ws2@goingtwice.eg")
    buyer = await make_user("wb2@goingtwice.eg")
    product = await make_product(seller=seller)
    headers = await auth(buyer.email)

    await client.post(
        f"{API}/wishlist", json={"product_id": product.id}, headers=headers
    )
    again = await client.post(
        f"{API}/wishlist", json={"product_id": product.id}, headers=headers
    )
    assert again.status_code == 409


async def test_wishlist_requires_authentication(client):
    assert (await client.get(f"{API}/wishlist")).status_code == 401


async def test_checkout_clears_the_piece_from_the_wishlist(
    client, make_user, make_product, auth
):
    seller = await make_user("wo@goingtwice.eg")
    buyer = await make_user("wob@goingtwice.eg")
    product = await make_product(seller=seller)
    headers = await auth(buyer.email)

    await client.post(
        f"{API}/wishlist", json={"product_id": product.id}, headers=headers
    )
    await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=headers,
    )

    wishlist = await client.get(f"{API}/wishlist", headers=headers)
    assert wishlist.json()["data"] == []


async def test_a_guest_merge_tolerates_duplicates(client, make_user, make_product, auth):
    """
    The frontend replays a guest cart into the server cart on login and ignores
    conflicts. This pins the status codes that replay depends on.
    """
    seller = await make_user("mg@goingtwice.eg")
    buyer = await make_user("mgb@goingtwice.eg")
    product = await make_product(seller=seller)
    headers = await auth(buyer.email)

    first = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert first.status_code == 200

    replay = await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=headers
    )
    assert replay.status_code == 409

    # The cart still holds exactly one copy.
    cart = await client.get(f"{API}/cart", headers=headers)
    assert cart.json()["data"]["item_count"] == 1
