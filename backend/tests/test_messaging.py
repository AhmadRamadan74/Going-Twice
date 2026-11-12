"""Direct buyer/seller chat: start, reply, unread counts, and access guards."""

API = "/api/v1"


async def test_buyer_can_start_a_conversation_with_the_seller(client, make_user, make_product, auth):
    seller = await make_user("seller@goingtwice.eg")
    buyer = await make_user("buyer@goingtwice.eg")
    product = await make_product(seller=seller, name="Oak Bookcase")

    buyer_headers = await auth(buyer.email)
    response = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "Is this still available?"},
        headers=buyer_headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["product_id"] == product.id
    assert data["other_party_id"] == seller.id
    assert data["last_message_preview"] == "Is this still available?"


async def test_starting_twice_resumes_the_same_thread(client, make_user, make_product, auth):
    seller = await make_user("seller2@goingtwice.eg")
    buyer = await make_user("buyer2@goingtwice.eg")
    product = await make_product(seller=seller, name="Brass Lamp")
    buyer_headers = await auth(buyer.email)

    first = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "Hi there"},
        headers=buyer_headers,
    )
    second = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "Following up"},
        headers=buyer_headers,
    )
    assert first.json()["data"]["id"] == second.json()["data"]["id"]

    messages = await client.get(
        f"{API}/messages/conversations/{first.json()['data']['id']}/messages",
        headers=buyer_headers,
    )
    assert len(messages.json()["data"]["items"]) == 2


async def test_seller_can_reply_and_both_sides_see_it(client, make_user, make_product, auth):
    seller = await make_user("seller3@goingtwice.eg")
    buyer = await make_user("buyer3@goingtwice.eg")
    product = await make_product(seller=seller, name="Teak Table")
    buyer_headers = await auth(buyer.email)
    seller_headers = await auth(seller.email)

    started = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "Interested!"},
        headers=buyer_headers,
    )
    conversation_id = started.json()["data"]["id"]

    reply = await client.post(
        f"{API}/messages/conversations/{conversation_id}/messages",
        json={"body": "Yes, still have it."},
        headers=seller_headers,
    )
    assert reply.status_code == 200, reply.text
    assert reply.json()["data"]["is_mine"] is True

    from_buyer_view = await client.get(
        f"{API}/messages/conversations/{conversation_id}/messages", headers=buyer_headers
    )
    bodies = [m["body"] for m in from_buyer_view.json()["data"]["items"]]
    assert bodies == ["Interested!", "Yes, still have it."]


async def test_unread_count_clears_when_conversation_is_opened(client, make_user, make_product, auth):
    seller = await make_user("seller4@goingtwice.eg")
    buyer = await make_user("buyer4@goingtwice.eg")
    product = await make_product(seller=seller, name="Rattan Chair")
    buyer_headers = await auth(buyer.email)
    seller_headers = await auth(seller.email)

    started = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "Hello"},
        headers=buyer_headers,
    )
    conversation_id = started.json()["data"]["id"]

    unread = await client.get(f"{API}/messages/unread-count", headers=seller_headers)
    assert unread.json()["data"]["count"] == 1

    await client.get(f"{API}/messages/conversations/{conversation_id}", headers=seller_headers)

    unread_after = await client.get(f"{API}/messages/unread-count", headers=seller_headers)
    assert unread_after.json()["data"]["count"] == 0


async def test_a_stranger_cannot_read_someone_elses_conversation(
    client, make_user, make_product, auth
):
    seller = await make_user("seller5@goingtwice.eg")
    buyer = await make_user("buyer5@goingtwice.eg")
    stranger = await make_user("stranger5@goingtwice.eg")
    product = await make_product(seller=seller, name="Iron Daybed")
    buyer_headers = await auth(buyer.email)
    stranger_headers = await auth(stranger.email)

    started = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "Hello"},
        headers=buyer_headers,
    )
    conversation_id = started.json()["data"]["id"]

    response = await client.get(
        f"{API}/messages/conversations/{conversation_id}", headers=stranger_headers
    )
    assert response.status_code == 403

    response = await client.post(
        f"{API}/messages/conversations/{conversation_id}/messages",
        json={"body": "butting in"},
        headers=stranger_headers,
    )
    assert response.status_code == 403


async def test_a_seller_cannot_message_themselves(client, make_user, make_product, auth):
    seller = await make_user("seller6@goingtwice.eg")
    product = await make_product(seller=seller, name="Velvet Sofa")
    headers = await auth(seller.email)

    response = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "hi me"},
        headers=headers,
    )
    assert response.status_code == 400


async def test_rapid_replies_only_email_once(client, make_user, make_product, auth, emails):
    seller = await make_user("seller7@goingtwice.eg")
    buyer = await make_user("buyer7@goingtwice.eg")
    product = await make_product(seller=seller, name="Ceramic Vase")
    buyer_headers = await auth(buyer.email)

    await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "One"},
        headers=buyer_headers,
    )
    started = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "Two"},
        headers=buyer_headers,
    )
    conversation_id = started.json()["data"]["id"]
    await client.post(
        f"{API}/messages/conversations/{conversation_id}/messages",
        json={"body": "Three"},
        headers=buyer_headers,
    )

    seller_emails = [e for e in emails if e["to"] == seller.email]
    assert len(seller_emails) == 1


async def test_conversation_requires_a_published_listing(client, make_user, make_product, auth):
    from app.core.marketplace import ListingStatus

    seller = await make_user("seller8@goingtwice.eg")
    buyer = await make_user("buyer8@goingtwice.eg")
    product = await make_product(seller=seller, name="Draft Chair", status=ListingStatus.DRAFT)
    headers = await auth(buyer.email)

    response = await client.post(
        f"{API}/messages/conversations",
        json={"product_id": product.id, "message": "hi"},
        headers=headers,
    )
    assert response.status_code == 400
