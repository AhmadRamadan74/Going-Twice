"""Seller listing lifecycle and the admin order log."""

from app.core.marketplace import ListingStatus

API = "/api/v1"

DRAFT_PAYLOAD = {
    "title": "Teak Sideboard",
    "description": "A long, low sideboard in excellent condition.",
    "asking_price": 5000,
    "category": "tables",
    "seller_name": "Salma Seller",
    "seller_email": "seller@goingtwice.eg",
    "seller_phone": "0100000000",
    "image_url": "/images/teak.png",
    "save_as_draft": True,
}


async def _draft(client, headers, **overrides):
    response = await client.post(
        f"{API}/sell/list", json={**DRAFT_PAYLOAD, **overrides}, headers=headers
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def test_a_draft_can_be_read_edited_and_resubmitted(client, make_user, auth):
    seller = await make_user("lifecycle@goingtwice.eg", full_name="Salma Seller")
    headers = await auth(seller.email)

    listing = await _draft(client, headers)
    listing_id = listing["id"]
    assert listing["status"] == ListingStatus.DRAFT

    fetched = await client.get(f"{API}/sell/{listing_id}", headers=headers)
    assert fetched.json()["data"]["title"] == "Teak Sideboard"

    edited = await client.patch(
        f"{API}/sell/{listing_id}",
        json={"title": "Teak Sideboard (restored)", "asking_price": 5500},
        headers=headers,
    )
    assert edited.json()["data"]["title"] == "Teak Sideboard (restored)"

    resubmitted = await client.post(f"{API}/sell/{listing_id}/resubmit", headers=headers)
    assert resubmitted.json()["data"]["status"] == ListingStatus.PENDING_REVIEW


async def test_a_listing_cannot_be_managed_by_another_user(client, make_user, auth):
    seller = await make_user("owner@goingtwice.eg")
    stranger = await make_user("stranger@goingtwice.eg")

    owner_headers = await auth(seller.email)
    listing = await _draft(client, owner_headers)

    other_headers = await auth(stranger.email)
    for method, path in (
        ("get", f"{API}/sell/{listing['id']}"),
        ("post", f"{API}/sell/{listing['id']}/resubmit"),
    ):
        response = await getattr(client, method)(path, headers=other_headers)
        assert response.status_code == 403, path


async def test_submitting_a_listing_notifies_admins(client, make_user, auth):
    await make_user("boss@goingtwice.eg", role="admin")
    seller = await make_user("submitter@goingtwice.eg")
    headers = await auth(seller.email)

    await _draft(client, headers, save_as_draft=False, title="Brass Lamp")

    admin_headers = await auth("boss@goingtwice.eg")
    notifications = await client.get(f"{API}/notifications", headers=admin_headers)
    items = notifications.json()["data"]["items"]
    assert any(row["type"] == "listing_submitted" for row in items)


async def test_my_listings_groups_by_status(client, make_user, auth):
    seller = await make_user("grouped@goingtwice.eg")
    headers = await auth(seller.email)

    await _draft(client, headers, title="Draft One")
    await _draft(client, headers, title="Pending One", save_as_draft=False)

    response = await client.get(f"{API}/sell/mine", headers=headers)
    data = response.json()["data"]
    assert len(data["items"]) == 2
    assert [row["title"] for row in data["draft"]] == ["Draft One"]
    assert [row["title"] for row in data["pending"]] == ["Pending One"]


# ── Admin ─────────────────────────────────────────────────────────────


async def test_admin_sees_every_order(client, make_user, make_product, auth):
    await make_user("admin@goingtwice.eg", role="admin", full_name="Admin")
    seller = await make_user("as@goingtwice.eg")
    buyer = await make_user("ab@goingtwice.eg")
    product = await make_product(seller=seller, name="Iron Daybed")

    buyer_headers = await auth(buyer.email)
    await client.post(
        f"{API}/cart/items", json={"product_id": product.id}, headers=buyer_headers
    )
    await client.post(
        f"{API}/orders/checkout",
        json={"payment_method": "instapay"},
        headers=buyer_headers,
    )

    admin_headers = await auth("admin@goingtwice.eg")
    response = await client.get(f"{API}/admin/orders", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["product"]["name"] == "Iron Daybed"


async def test_admin_orders_are_admin_only(client, make_user, auth):
    user = await make_user("plain@goingtwice.eg")
    headers = await auth(user.email)
    response = await client.get(f"{API}/admin/orders", headers=headers)
    assert response.status_code == 403


async def test_admin_can_approve_a_pending_listing(client, make_user, auth):
    await make_user("mod@goingtwice.eg", role="admin")
    seller = await make_user("pending@goingtwice.eg")
    headers = await auth(seller.email)
    listing = await _draft(client, headers, save_as_draft=False)

    admin_headers = await auth("mod@goingtwice.eg")
    approved = await client.post(
        f"{API}/admin/listings/{listing['id']}/approve", headers=admin_headers
    )
    assert approved.status_code == 200
    assert approved.json()["data"]["status"] in (
        ListingStatus.PUBLISHED,
        ListingStatus.APPROVED,
    )


async def test_a_rejected_listing_can_be_edited_and_resubmitted(
    client, make_user, auth
):
    await make_user("editor-mod@goingtwice.eg", role="admin")
    seller = await make_user("editor-seller@goingtwice.eg")
    seller_headers = await auth(seller.email)
    listing = await _draft(client, seller_headers, save_as_draft=False, title="Worn Chair")

    admin_headers = await auth("editor-mod@goingtwice.eg")
    rejected = await client.post(
        f"{API}/admin/listings/{listing['id']}/reject",
        json={"rejection_reason": "Need a clearer photo of the legs."},
        headers=admin_headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["data"]["status"] == ListingStatus.REJECTED

    edited = await client.patch(
        f"{API}/sell/{listing['id']}",
        json={
            "title": "Worn Chair (new photos)",
            "description": "Restored listing after the rejection notes.",
        },
        headers=seller_headers,
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["data"]["title"] == "Worn Chair (new photos)"
    assert edited.json()["data"]["status"] == ListingStatus.REJECTED

    resubmitted = await client.post(
        f"{API}/sell/{listing['id']}/resubmit", headers=seller_headers
    )
    assert resubmitted.status_code == 200
    assert resubmitted.json()["data"]["status"] == ListingStatus.PENDING_REVIEW
    assert resubmitted.json()["data"]["rejection_reason"] is None


async def test_a_published_listing_cannot_be_edited(client, make_user, auth):
    await make_user("live-mod@goingtwice.eg", role="admin")
    seller = await make_user("live-seller@goingtwice.eg")
    seller_headers = await auth(seller.email)
    listing = await _draft(client, seller_headers, save_as_draft=False)

    admin_headers = await auth("live-mod@goingtwice.eg")
    await client.post(
        f"{API}/admin/listings/{listing['id']}/approve", headers=admin_headers
    )

    response = await client.patch(
        f"{API}/sell/{listing['id']}",
        json={"title": "Should not change"},
        headers=seller_headers,
    )
    assert response.status_code == 403
