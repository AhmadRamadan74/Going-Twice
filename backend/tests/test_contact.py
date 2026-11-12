"""The contact form is stored and emailed to staff."""

from sqlalchemy import select

from app.core.config import settings
from app.modules.contact.entities import ContactMessage

API = "/api/v1"


async def test_contact_form_saves_and_emails_staff(
    client, make_user, emails, db, monkeypatch
):
    await make_user("admin@goingtwice.eg", role="admin")
    monkeypatch.setattr(settings, "CONTACT_INBOX", "hello@goingtwice.eg")

    response = await client.post(
        f"{API}/contact/messages",
        json={
            "full_name": "Nour Visitor",
            "email": "nour@example.com",
            "phone": "01012345678",
            "subject": "Partnership",
            "message": "We would like to collaborate on a vintage pop-up.",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["data"]["id"]

    stored = (
        await db.execute(select(ContactMessage).where(ContactMessage.email == "nour@example.com"))
    ).scalar_one()
    assert stored.subject == "Partnership"
    assert stored.message.startswith("We would like")

    recipients = {row["to"] for row in emails}
    assert "hello@goingtwice.eg" in recipients
    assert "admin@goingtwice.eg" in recipients
    assert all(row["reply_to"] == "nour@example.com" for row in emails)
    assert any("Partnership" in row["subject"] for row in emails)
    assert any("01012345678" in row["text"] for row in emails)


async def test_contact_form_still_saves_when_nobody_is_configured_to_email(
    client, emails, db, monkeypatch, roles
):
    monkeypatch.setattr(settings, "CONTACT_INBOX", "")

    response = await client.post(
        f"{API}/contact/messages",
        json={
            "full_name": "Quiet Guest",
            "email": "quiet@example.com",
            "message": "Just leaving a note for the archive.",
        },
    )
    assert response.status_code == 200, response.text
    stored = (
        await db.execute(select(ContactMessage).where(ContactMessage.email == "quiet@example.com"))
    ).scalar_one()
    assert stored.id
    assert emails == []
