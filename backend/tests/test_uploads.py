"""Listing image uploads land on disk and are served from /uploads."""

from pathlib import Path

import pytest

from app.core.config import settings

API = "/api/v1"

# 1×1 PNG
_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
def upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    return tmp_path


async def test_upload_requires_authentication(client):
    response = await client.post(
        f"{API}/uploads",
        files={"files": ("shot.png", _PNG, "image/png")},
    )
    assert response.status_code == 401


async def test_upload_stores_a_png_and_returns_its_public_path(
    client, make_user, auth, upload_dir
):
    user = await make_user("photos@goingtwice.eg")
    headers = await auth(user.email)

    response = await client.post(
        f"{API}/uploads",
        files={"files": ("shot.png", _PNG, "image/png")},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    urls = response.json()["data"]["urls"]
    assert len(urls) == 1
    assert urls[0].startswith("/uploads/listings/")
    assert urls[0].endswith(".png")

    stored = Path(settings.UPLOAD_DIR) / urls[0].removeprefix("/uploads/")
    assert stored.is_file()
    assert stored.read_bytes().startswith(b"\x89PNG")


async def test_upload_rejects_a_non_image(client, make_user, auth, upload_dir):
    user = await make_user("notimg@goingtwice.eg")
    headers = await auth(user.email)

    response = await client.post(
        f"{API}/uploads",
        files={"files": ("notes.txt", b"hello", "text/plain")},
        headers=headers,
    )
    assert response.status_code == 400


async def test_listing_rejects_an_external_image_url(client, make_user, auth):
    user = await make_user("extimg@goingtwice.eg")
    headers = await auth(user.email)

    response = await client.post(
        f"{API}/sell/list",
        json={
            "title": "External Photo Piece",
            "description": "Trying to point the listing at a remote host.",
            "asking_price": 1200,
            "seller_name": user.full_name,
            "seller_email": user.email,
            "seller_phone": "0100000000",
            "image_url": "https://evil.example/photo.jpg",
            "save_as_draft": True,
        },
        headers=headers,
    )
    assert response.status_code == 400
