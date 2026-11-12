"""Outbound email.

One `send_email` entry point in front of three senders (console / Resend /
SMTP). Delivery is best-effort by design: a mail outage must never turn a
successful registration or password reset into a 500, so every failure is
logged and reported as ``False`` rather than raised.
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Protocol

import anyio
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"


class EmailSender(Protocol):
    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
        reply_to: str | None = None,
    ) -> bool: ...


def _from_header() -> str:
    name = settings.MAIL_FROM_NAME.strip()
    return f"{name} <{settings.MAIL_FROM}>" if name else settings.MAIL_FROM


class ConsoleEmailSender:
    """Logs the message. Used in local development and in tests."""

    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
        reply_to: str | None = None,
    ) -> bool:
        logger.info(
            "[email:console] to=%s reply_to=%s subject=%s\n%s",
            to,
            reply_to or "-",
            subject,
            text.strip(),
        )
        return True


class ResendEmailSender:
    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
        reply_to: str | None = None,
    ) -> bool:
        if not settings.MAIL_API_KEY:
            logger.error("[email:resend] MAIL_API_KEY is not set — dropping message")
            return False
        payload = {
            "from": _from_header(),
            "to": [to],
            "subject": subject,
            "html": html,
            "text": text,
        }
        if reply_to:
            payload["reply_to"] = [reply_to]
        try:
            async with httpx.AsyncClient(timeout=settings.MAIL_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    RESEND_ENDPOINT,
                    headers={"Authorization": f"Bearer {settings.MAIL_API_KEY}"},
                    json=payload,
                )
            if response.status_code >= 400:
                logger.error(
                    "[email:resend] %s returned %s: %s",
                    to,
                    response.status_code,
                    response.text[:500],
                )
                return False
            return True
        except Exception:
            logger.exception("[email:resend] failed to send to %s", to)
            return False


class SmtpEmailSender:
    """stdlib smtplib, pushed onto a worker thread so the loop keeps running."""

    def _send_blocking(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
        reply_to: str | None = None,
    ) -> None:
        message = EmailMessage()
        message["From"] = _from_header()
        message["To"] = to
        message["Subject"] = subject
        if reply_to:
            message["Reply-To"] = reply_to
        message.set_content(text)
        message.add_alternative(html, subtype="html")

        context = ssl.create_default_context()
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=settings.MAIL_TIMEOUT_SECONDS,
        ) as smtp:
            smtp.ehlo()
            if settings.SMTP_USE_TLS:
                smtp.starttls(context=context)
                smtp.ehlo()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)

    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
        reply_to: str | None = None,
    ) -> bool:
        if not settings.SMTP_HOST:
            logger.error("[email:smtp] SMTP_HOST is not set — dropping message")
            return False
        try:
            await anyio.to_thread.run_sync(
                lambda: self._send_blocking(
                    to=to,
                    subject=subject,
                    html=html,
                    text=text,
                    reply_to=reply_to,
                )
            )
            return True
        except Exception:
            logger.exception("[email:smtp] failed to send to %s", to)
            return False


_SENDERS: dict[str, type] = {
    "console": ConsoleEmailSender,
    "resend": ResendEmailSender,
    "smtp": SmtpEmailSender,
}


def get_sender() -> EmailSender:
    """Resolves the configured sender, falling back to console on a bad value."""
    if not settings.MAIL_ENABLED:
        return ConsoleEmailSender()
    key = (settings.MAIL_PROVIDER or "").strip().lower()
    sender_cls = _SENDERS.get(key)
    if sender_cls is None:
        logger.error(
            "[email] unknown MAIL_PROVIDER %r — falling back to console", key
        )
        return ConsoleEmailSender()
    return sender_cls()


async def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    text: str,
    reply_to: str | None = None,
) -> bool:
    """Best-effort send. Returns whether the message was handed off."""
    if not to:
        return False
    sender = get_sender()
    return await sender.send(
        to=to, subject=subject, html=html, text=text, reply_to=reply_to
    )
