"""Transactional email bodies.

Plain Python string building rather than a template engine — there are only a
handful of messages and this keeps them dependency-free and unit-testable.
Colours mirror the frontend design tokens (ink, wine, parchment, line).
"""

from html import escape

from app.core.config import settings

INK = "#3b2a24"
MUTED = "#6b5a4a"
WINE = "#6b3d4b"
PARCHMENT = "#faf7f2"
LINE = "#e8e0d8"


def _layout(*, heading: str, body_html: str) -> str:
    brand = escape(settings.MAIL_FROM_NAME or "Going Twice")
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:{PARCHMENT};
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="max-width:520px;margin:0 auto;background:#ffffff;
                  border:1px solid {LINE};border-radius:4px;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:11px;letter-spacing:.12em;
                    text-transform:uppercase;color:{MUTED};">{brand}</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:{INK};">
            {escape(heading)}
          </h1>
          {body_html}
        </td>
      </tr>
    </table>
    <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:{MUTED};text-align:center;">
      You received this because someone used this address on {brand}.
    </p>
  </body>
</html>"""


def password_reset_email(*, full_name: str, reset_link: str, expires_minutes: int):
    """Returns (subject, html, text) for the password reset message."""
    subject = "Reset your Going Twice password"
    safe_link = escape(reset_link, quote=True)
    body_html = f"""\
          <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:{MUTED};">
            Hi {escape(full_name.split(" ")[0] or "there")}, we received a request to reset
            your password. This link expires in {expires_minutes} minutes.
          </p>
          <p style="margin:0 0 24px;">
            <a href="{safe_link}"
               style="display:inline-block;background:{WINE};color:#ffffff;
                      text-decoration:none;padding:12px 22px;border-radius:2px;
                      font-size:14px;font-weight:500;">Reset your password</a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:{MUTED};">
            Or paste this into your browser:
          </p>
          <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:{INK};">
            {escape(reset_link)}
          </p>
          <p style="margin:0;font-size:13px;line-height:20px;color:{MUTED};">
            If you didn't ask for this, you can ignore this email — your password
            stays as it is.
          </p>"""
    text = (
        f"Hi {full_name.split(' ')[0] or 'there'},\n\n"
        "We received a request to reset your Going Twice password.\n"
        f"Open this link within {expires_minutes} minutes to choose a new one:\n\n"
        f"{reset_link}\n\n"
        "If you didn't ask for this, you can ignore this email."
    )
    return subject, _layout(heading="Reset your password", body_html=body_html), text


def verification_code_email(*, full_name: str, code: str, expires_minutes: int):
    """Returns (subject, html, text) for the email-verification code."""
    subject = f"{code} is your Going Twice verification code"
    body_html = f"""\
          <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:{MUTED};">
            Hi {escape(full_name.split(" ")[0] or "there")}, enter this code to confirm your
            email address. It expires in {expires_minutes} minutes.
          </p>
          <p style="margin:0 0 24px;padding:16px;background:{PARCHMENT};
                    border:1px solid {LINE};border-radius:2px;text-align:center;
                    font-size:30px;font-weight:600;letter-spacing:.3em;color:{INK};">
            {escape(code)}
          </p>
          <p style="margin:0;font-size:13px;line-height:20px;color:{MUTED};">
            If you didn't create a Going Twice account, you can ignore this email.
          </p>"""
    text = (
        f"Hi {full_name.split(' ')[0] or 'there'},\n\n"
        f"Your Going Twice verification code is {code}.\n"
        f"It expires in {expires_minutes} minutes.\n\n"
        "If you didn't create an account, you can ignore this email."
    )
    return subject, _layout(heading="Confirm your email", body_html=body_html), text


def _first_name(full_name: str) -> str:
    return (full_name or "").split(" ")[0] or "there"


def _button(label: str, href: str) -> str:
    return f"""\
          <p style="margin:0 0 24px;">
            <a href="{escape(href, quote=True)}"
               style="display:inline-block;background:{WINE};color:#ffffff;
                      text-decoration:none;padding:12px 22px;border-radius:2px;
                      font-size:14px;font-weight:500;">{escape(label)}</a>
          </p>"""


def notice_email(
    *,
    subject: str,
    heading: str,
    full_name: str,
    paragraphs: list[str],
    button_label: str | None = None,
    button_href: str | None = None,
):
    """Generic transactional notice. Returns (subject, html, text)."""
    first = escape(_first_name(full_name))
    parts = [
        f'<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:{MUTED};">'
        f"Hi {first}, {escape(paragraphs[0])}</p>"
    ]
    for paragraph in paragraphs[1:]:
        parts.append(
            f'<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:{MUTED};">'
            f"{escape(paragraph)}</p>"
        )
    if button_label and button_href:
        parts.append(_button(button_label, button_href))
    text_lines = [f"Hi {_first_name(full_name)},", "", *paragraphs]
    if button_href:
        text_lines.extend(["", button_href])
    return subject, _layout(heading=heading, body_html="\n".join(parts)), "\n".join(text_lines)
