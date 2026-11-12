"""Orders and listings send transactional mail after the action commits."""

from app.core.email_templates import notice_email
from app.core.marketplace import ListingStatus

API = "/api/v1"


def test_notice_template_escapes_html():
    _subject, html, text = notice_email(
        subject="Hello",
        heading="Hello",
        full_name="<script>alert(1)</script> Person",
        paragraphs=["you listed “Chair <b>x</b>”."],
        button_label="Open",
        button_href="https://goingtwice.eg/account/orders",
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "https://goingtwice.eg/account/orders" in text


async def test_checkout_emails_the_buyer_and_the_seller(
    client, make_user, make_product, auth, emails
):
    seller = await make_user("mail-seller@goingtwice.eg", full_name="Layla Hassan")
    buyer = await make_user("mail-buyer@goingtwice.eg", full_name="Bassem Buyer")
    product = await make_product(seller=seller, name="Brass Sconce")
    headers = await auth(buyer.email)
    await client.post(f"{API}/cart/items", json={"product_id": product.id}, headers=headers)

    response = await client.post(
        f"{API}/orders/checkout", json={"payment_method": "instapay"}, headers=headers
    )
    assert response.status_code == 200, response.text

    recipients = {row["to"] for row in emails}
    assert recipients == {buyer.email, seller.email}
    assert any("placed" in row["subject"].lower() for row in emails)
    assert any("new order" in row["subject"].lower() for row in emails)
    assert any("Brass Sconce" in row["text"] for row in emails)


async def test_a_draft_listing_does_not_email(client, make_user, auth, emails):
    seller = await make_user("draft-mail@goingtwice.eg")
    headers = await auth(seller.email)
    response = await client.post(
        f"{API}/sell/list",
        json={
            "title": "Quiet Draft",
            "description": "A draft should not notify anyone by email.",
            "asking_price": 1200,
            "category": "chairs",
            "seller_name": seller.full_name,
            "seller_email": seller.email,
            "seller_phone": "0100000000",
            "image_url": "/images/chairs.png",
            "save_as_draft": True,
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert emails == []


async def test_submitting_a_listing_emails_the_seller(client, make_user, auth, emails):
    seller = await make_user("submit-mail@goingtwice.eg", full_name="Salma Seller")
    headers = await auth(seller.email)
    response = await client.post(
        f"{API}/sell/list",
        json={
            "title": "Teak Console",
            "description": "A long console in very good condition.",
            "asking_price": 4200,
            "category": "tables",
            "seller_name": seller.full_name,
            "seller_email": seller.email,
            "seller_phone": "0100000000",
            "image_url": "/images/tables.png",
            "save_as_draft": False,
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert len(emails) == 1
    assert emails[0]["to"] == seller.email
    assert "submitted" in emails[0]["subject"].lower()
    assert "Teak Console" in emails[0]["text"]


async def test_approving_a_listing_emails_the_seller(client, make_user, auth, emails):
    await make_user("mod-mail@goingtwice.eg", role="admin")
    seller = await make_user("approve-mail@goingtwice.eg", full_name="Omar Farouk")
    headers = await auth(seller.email)
    listing = await client.post(
        f"{API}/sell/list",
        json={
            "title": "Gilt Mirror",
            "description": "A period gilt mirror ready for the wall.",
            "asking_price": 8800,
            "category": "mirrors",
            "seller_name": seller.full_name,
            "seller_email": seller.email,
            "seller_phone": "0100000000",
            "image_url": "/images/french-empire-gilt-mirror.png",
            "save_as_draft": False,
        },
        headers=headers,
    )
    assert listing.status_code == 200, listing.text
    emails.clear()

    admin_headers = await auth("mod-mail@goingtwice.eg")
    approved = await client.post(
        f"{API}/admin/listings/{listing.json()['data']['id']}/approve",
        headers=admin_headers,
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["data"]["status"] in (
        ListingStatus.PUBLISHED,
        ListingStatus.APPROVED,
    )
    assert len(emails) == 1
    assert emails[0]["to"] == seller.email
    assert "live" in emails[0]["subject"].lower()
    assert "/product/" in emails[0]["text"]


async def test_rejecting_a_listing_emails_the_reason(client, make_user, auth, emails):
    await make_user("mod-reject@goingtwice.eg", role="admin")
    seller = await make_user("reject-mail@goingtwice.eg")
    headers = await auth(seller.email)
    listing = await client.post(
        f"{API}/sell/list",
        json={
            "title": "Blurry Photo Chair",
            "description": "Needs a better photograph before it can go live.",
            "asking_price": 1500,
            "category": "chairs",
            "seller_name": seller.full_name,
            "seller_email": seller.email,
            "seller_phone": "0100000000",
            "image_url": "/images/chairs.png",
            "save_as_draft": False,
        },
        headers=headers,
    )
    emails.clear()

    admin_headers = await auth("mod-reject@goingtwice.eg")
    rejected = await client.post(
        f"{API}/admin/listings/{listing.json()['data']['id']}/reject",
        json={"rejection_reason": "Please upload a clearer main image."},
        headers=admin_headers,
    )
    assert rejected.status_code == 200, rejected.text
    assert len(emails) == 1
    assert emails[0]["to"] == seller.email
    assert "clearer main image" in emails[0]["text"]
