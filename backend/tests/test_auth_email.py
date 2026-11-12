"""Password reset and email verification actually send mail."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.modules.auth.domain.entities import EmailVerificationCode

API = "/api/v1"


# ── Password reset ────────────────────────────────────────────────────


async def test_forgot_password_sends_an_email_with_the_reset_link(
    client, make_user, emails
):
    user = await make_user("reset@goingtwice.eg", full_name="Rana Reset")

    response = await client.post(
        f"{API}/auth/forgot-password", json={"email": user.email}
    )
    assert response.status_code == 200

    assert len(emails) == 1
    message = emails[0]
    assert message["to"] == "reset@goingtwice.eg"
    assert "reset" in message["subject"].lower()
    assert "/reset-password?token=" in message["text"]
    assert "/reset-password?token=" in message["html"]


async def test_the_emailed_link_actually_resets_the_password(
    client, make_user, emails
):
    user = await make_user("flow@goingtwice.eg", password="oldpassword")

    await client.post(f"{API}/auth/forgot-password", json={"email": user.email})
    body = emails[0]["text"]
    token = body.split("/reset-password?token=")[1].split()[0]

    response = await client.post(
        f"{API}/auth/reset-password", json={"token": token, "password": "newpassword"}
    )
    assert response.status_code == 200

    # Old password is dead, new one works.
    old = await client.post(
        f"{API}/auth/login", json={"email": user.email, "password": "oldpassword"}
    )
    assert old.status_code == 401
    new = await client.post(
        f"{API}/auth/login", json={"email": user.email, "password": "newpassword"}
    )
    assert new.status_code == 200


async def test_forgot_password_for_an_unknown_email_sends_nothing_but_still_succeeds(
    client, emails, roles
):
    response = await client.post(
        f"{API}/auth/forgot-password", json={"email": "nobody@goingtwice.eg"}
    )
    # Generic reply so the endpoint can't be used to enumerate accounts.
    assert response.status_code == 200
    assert "if an account exists" in response.json()["message"].lower()
    assert emails == []


async def test_reset_link_is_not_exposed_in_production(
    client, make_user, emails, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    user = await make_user("prod@goingtwice.eg")

    response = await client.post(
        f"{API}/auth/forgot-password", json={"email": user.email}
    )
    assert response.json()["data"] is None
    # The link still reaches the user by email.
    assert "/reset-password?token=" in emails[0]["text"]


async def test_reset_link_is_exposed_outside_production(client, make_user):
    user = await make_user("dev@goingtwice.eg")
    response = await client.post(
        f"{API}/auth/forgot-password", json={"email": user.email}
    )
    assert response.json()["data"]["reset_link"].startswith("http")


async def test_a_used_reset_token_cannot_be_replayed(client, make_user, emails):
    user = await make_user("replay@goingtwice.eg", password="oldpassword")
    await client.post(f"{API}/auth/forgot-password", json={"email": user.email})
    token = emails[0]["text"].split("/reset-password?token=")[1].split()[0]

    first = await client.post(
        f"{API}/auth/reset-password", json={"token": token, "password": "newpassword"}
    )
    assert first.status_code == 200

    second = await client.post(
        f"{API}/auth/reset-password", json={"token": token, "password": "another1"}
    )
    assert second.status_code == 400


# ── Email verification ────────────────────────────────────────────────


async def test_register_sends_a_verification_code(client, roles, emails):
    response = await client.post(
        f"{API}/auth/register",
        json={
            "full_name": "Verify Me",
            "email": "verify@goingtwice.eg",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["user"]["email_verified"] is False
    challenge = response.json()["data"]["verification"]
    assert challenge["debug_code"]
    assert challenge["debug_code"] in emails[0]["text"]

    assert len(emails) == 1
    assert "verification code" in emails[0]["subject"].lower()


async def test_a_user_can_verify_with_the_emailed_code(client, make_user, auth, emails):
    user = await make_user("code@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)

    sent = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert sent.status_code == 200
    challenge = sent.json()["data"]
    code = challenge["debug_code"]
    assert code is not None and len(code) == settings.EMAIL_VERIFICATION_CODE_LENGTH
    assert code in emails[-1]["text"]

    response = await client.post(
        f"{API}/auth/verify-email", json={"code": code}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["data"]["email_verified"] is True

    me = await client.get(f"{API}/auth/me", headers=headers)
    assert me.json()["data"]["email_verified"] is True


async def test_the_code_is_never_stored_in_plain_text(client, db, make_user, auth):
    user = await make_user("hashed@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)
    sent = await client.post(f"{API}/auth/send-verification", headers=headers)
    code = sent.json()["data"]["debug_code"]

    row = (
        await db.execute(
            select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
        )
    ).scalar_one()
    assert row.code_hash != code
    assert len(row.code_hash) == 64


async def test_a_wrong_code_is_rejected_and_counts_an_attempt(
    client, db, make_user, auth
):
    user = await make_user("wrong@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)
    await client.post(f"{API}/auth/send-verification", headers=headers)

    response = await client.post(
        f"{API}/auth/verify-email", json={"code": "111111"}, headers=headers
    )
    assert response.status_code == 400
    assert "not right" in response.json()["message"].lower()

    row = (
        await db.execute(
            select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
        )
    ).scalar_one()
    await db.refresh(row)
    assert row.attempts == 1


async def test_attempts_are_capped(client, make_user, auth):
    user = await make_user("capped@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)
    sent = await client.post(f"{API}/auth/send-verification", headers=headers)
    real_code = sent.json()["data"]["debug_code"]
    wrong = "000001" if real_code != "000001" else "000002"

    last = None
    for _ in range(settings.EMAIL_VERIFICATION_MAX_ATTEMPTS):
        last = await client.post(
            f"{API}/auth/verify-email", json={"code": wrong}, headers=headers
        )
    assert "too many" in last.json()["message"].lower()

    # Even the correct code no longer works — the burnt code must be replaced.
    response = await client.post(
        f"{API}/auth/verify-email", json={"code": real_code}, headers=headers
    )
    assert response.status_code == 400
    assert "request a new" in response.json()["message"].lower()


async def test_an_expired_code_is_rejected(client, db, make_user, auth):
    user = await make_user("expired@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)
    sent = await client.post(f"{API}/auth/send-verification", headers=headers)
    code = sent.json()["data"]["debug_code"]

    row = (
        await db.execute(
            select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
        )
    ).scalar_one()
    row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db.commit()

    response = await client.post(
        f"{API}/auth/verify-email", json={"code": code}, headers=headers
    )
    assert response.status_code == 400
    assert "expired" in response.json()["message"].lower()


async def test_resend_is_throttled_by_the_cooldown(client, make_user, auth):
    user = await make_user("cooldown@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)

    first = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert first.status_code == 200

    second = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert second.status_code == 429
    assert "wait" in second.json()["message"].lower()
    assert second.headers.get("Retry-After") is not None


async def test_resend_after_the_cooldown_supersedes_the_previous_code(
    client, db, make_user, auth
):
    user = await make_user("resend@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)

    first = await client.post(f"{API}/auth/send-verification", headers=headers)
    old_code = first.json()["data"]["debug_code"]

    row = (
        await db.execute(
            select(EmailVerificationCode).where(EmailVerificationCode.user_id == user.id)
        )
    ).scalar_one()
    row.sent_at = datetime.now(timezone.utc) - timedelta(
        seconds=settings.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS + 5
    )
    await db.commit()

    second = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert second.status_code == 200
    new_code = second.json()["data"]["debug_code"]

    # The superseded code is dead; only the newest one verifies.
    if old_code != new_code:
        stale = await client.post(
            f"{API}/auth/verify-email", json={"code": old_code}, headers=headers
        )
        assert stale.status_code == 400

    response = await client.post(
        f"{API}/auth/verify-email", json={"code": new_code}, headers=headers
    )
    assert response.status_code == 200


async def test_verification_requires_authentication(client):
    assert (await client.post(f"{API}/auth/send-verification")).status_code == 401
    assert (
        await client.post(f"{API}/auth/verify-email", json={"code": "123456"})
    ).status_code == 401


async def test_an_already_verified_user_cannot_request_more_codes(
    client, make_user, auth
):
    user = await make_user("already@goingtwice.eg", email_verified=True)
    headers = await auth(user.email)

    response = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert response.status_code == 400
    assert "already verified" in response.json()["message"].lower()


# ── Development bypass ────────────────────────────────────────────────


async def test_the_magic_code_is_refused_when_the_bypass_is_off(
    client, make_user, auth, monkeypatch
):
    monkeypatch.setattr(settings, "AUTH_ALLOW_MAGIC_OTP_BYPASS", False)
    user = await make_user("nobypass@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)
    await client.post(f"{API}/auth/send-verification", headers=headers)

    response = await client.post(
        f"{API}/auth/verify-email",
        json={"code": settings.AUTH_MAGIC_OTP_CODE},
        headers=headers,
    )
    assert response.status_code == 400


async def test_the_magic_code_works_outside_production_when_enabled(
    client, make_user, auth, monkeypatch
):
    monkeypatch.setattr(settings, "AUTH_ALLOW_MAGIC_OTP_BYPASS", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "local")
    user = await make_user("bypass@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)

    response = await client.post(
        f"{API}/auth/verify-email",
        json={"code": settings.AUTH_MAGIC_OTP_CODE},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["data"]["email_verified"] is True


@pytest.mark.parametrize("environment", ["production", "prod", "live"])
async def test_the_magic_code_is_always_refused_in_production(
    client, make_user, auth, monkeypatch, environment
):
    monkeypatch.setattr(settings, "AUTH_ALLOW_MAGIC_OTP_BYPASS", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    assert settings.magic_otp_bypass_enabled is False

    user = await make_user(f"prod-{environment}@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)
    await client.post(f"{API}/auth/send-verification", headers=headers)

    response = await client.post(
        f"{API}/auth/verify-email",
        json={"code": settings.AUTH_MAGIC_OTP_CODE},
        headers=headers,
    )
    assert response.status_code == 400


async def test_the_debug_code_is_withheld_in_production(
    client, make_user, auth, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    user = await make_user("nodebug@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)

    response = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert response.json()["data"]["debug_code"] is None


async def test_the_debug_code_is_withheld_in_local_without_opt_in(
    client, make_user, auth, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "local")
    monkeypatch.setattr(settings, "AUTH_EXPOSE_VERIFICATION_CODE", False)
    user = await make_user("local-nodebug@goingtwice.eg", email_verified=False)
    headers = await auth(user.email)

    response = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert response.json()["data"]["debug_code"] is None


@pytest.mark.parametrize("environment", ["staging", "", "prodution", "qa"])
async def test_unrecognised_environments_get_no_shortcuts(
    client, make_user, auth, monkeypatch, environment
):
    """An unknown ENVIRONMENT must behave like production, not like dev."""
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    monkeypatch.setattr(settings, "AUTH_ALLOW_MAGIC_OTP_BYPASS", True)
    assert settings.magic_otp_bypass_enabled is False
    assert settings.expose_password_reset_link is False
    assert settings.expose_verification_code is False

    user = await make_user(f"env-{environment or 'blank'}@goingtwice.eg", email_verified=False)

    forgot = await client.post(
        f"{API}/auth/forgot-password", json={"email": user.email}
    )
    assert forgot.json()["data"] is None

    headers = await auth(user.email)
    sent = await client.post(f"{API}/auth/send-verification", headers=headers)
    assert sent.json()["data"]["debug_code"] is None

    bypass = await client.post(
        f"{API}/auth/verify-email",
        json={"code": settings.AUTH_MAGIC_OTP_CODE},
        headers=headers,
    )
    assert bypass.status_code == 400
