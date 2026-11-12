"""The mail layer degrades quietly and picks the right provider."""

from app.core.config import settings
from app.core.email import (
    ConsoleEmailSender,
    ResendEmailSender,
    SmtpEmailSender,
    get_sender,
    send_email,
)
from app.core.email_templates import password_reset_email, verification_code_email

# Importing `send_email` by name binds the real function, so the conftest
# fixture that patches `app.core.email.send_email` does not intercept these —
# they exercise the actual sender.


def test_console_is_used_when_mail_is_disabled(monkeypatch):
    monkeypatch.setattr(settings, "MAIL_ENABLED", False)
    monkeypatch.setattr(settings, "MAIL_PROVIDER", "resend")
    assert isinstance(get_sender(), ConsoleEmailSender)


def test_provider_selection(monkeypatch):
    monkeypatch.setattr(settings, "MAIL_ENABLED", True)
    for provider, expected in (
        ("resend", ResendEmailSender),
        ("smtp", SmtpEmailSender),
        ("console", ConsoleEmailSender),
        ("  ReSeNd  ", ResendEmailSender),
    ):
        monkeypatch.setattr(settings, "MAIL_PROVIDER", provider)
        assert isinstance(get_sender(), expected), provider


def test_an_unknown_provider_falls_back_to_console(monkeypatch):
    monkeypatch.setattr(settings, "MAIL_ENABLED", True)
    monkeypatch.setattr(settings, "MAIL_PROVIDER", "carrier-pigeon")
    assert isinstance(get_sender(), ConsoleEmailSender)


async def test_resend_without_an_api_key_reports_failure_rather_than_raising(
    monkeypatch,
):
    monkeypatch.setattr(settings, "MAIL_ENABLED", True)
    monkeypatch.setattr(settings, "MAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "MAIL_API_KEY", "")

    result = await send_email(to="a@goingtwice.eg", subject="s", html="<p></p>", text="t")
    assert result is False


async def test_smtp_without_a_host_reports_failure_rather_than_raising(monkeypatch):
    monkeypatch.setattr(settings, "MAIL_ENABLED", True)
    monkeypatch.setattr(settings, "MAIL_PROVIDER", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", "")

    result = await send_email(to="a@goingtwice.eg", subject="s", html="<p></p>", text="t")
    assert result is False


async def test_a_provider_that_explodes_never_propagates(monkeypatch):
    monkeypatch.setattr(settings, "MAIL_ENABLED", True)
    monkeypatch.setattr(settings, "MAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "MAIL_API_KEY", "key")

    class Boom:
        def __init__(self, *args, **kwargs):
            raise RuntimeError("network on fire")

    monkeypatch.setattr("app.core.email.httpx.AsyncClient", Boom)
    result = await send_email(to="a@goingtwice.eg", subject="s", html="<p></p>", text="t")
    assert result is False


async def test_an_empty_recipient_is_refused():
    assert await send_email(to="", subject="s", html="<p></p>", text="t") is False


def test_templates_escape_user_supplied_names():
    subject, html, text = verification_code_email(
        full_name="<script>alert(1)</script> Person",
        code="123456",
        expires_minutes=10,
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "123456" in subject and "123456" in text


def test_reset_template_carries_the_link_in_both_parts():
    link = "https://goingtwice.eg/reset-password?token=abc123"
    _subject, html, text = password_reset_email(
        full_name="Rana Reset", reset_link=link, expires_minutes=60
    )
    assert link in text
    assert "reset-password?token=abc123" in html
