"""Listing photo storage on local disk.

Files land under ``UPLOAD_DIR/listings`` and are served at ``/uploads/listings/…``.
The path stored on the product is the public URL path, not a filesystem path.
"""

from __future__ import annotations

import base64
import logging
import uuid
from pathlib import Path

import httpx
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import ValidationError

_GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash-image:generateContent"
)
_GEMINI_PROMPT = (
    "Remove the background from this product photo and replace it with a "
    "solid, pure white background (#FFFFFF), like a studio product shot. "
    "Do not alter the subject itself in any way — keep its exact shape, "
    "proportions, color, material, reflections, and every visible detail "
    "identical to the original. Only change the background."
)

logger = logging.getLogger(__name__)

_MAX_HEADER = 16
_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
)


def listings_dir() -> Path:
    root = Path(settings.UPLOAD_DIR)
    folder = root / "listings"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def ensure_upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    (root / "listings").mkdir(parents=True, exist_ok=True)
    return root


def _extension(header: bytes) -> str | None:
    for magic, ext in _SIGNATURES:
        if header.startswith(magic):
            return ext
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return ".webp"
    return None


async def save_listing_image(upload: UploadFile) -> str:
    """Persists one image and returns its public path (``/uploads/listings/…``)."""
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    header = await upload.read(_MAX_HEADER)
    ext = _extension(header)
    if not ext:
        raise ValidationError("Only JPEG, PNG, WebP, or GIF images are allowed")

    dest = listings_dir() / f"{uuid.uuid4().hex}{ext}"
    written = len(header)
    try:
        with dest.open("wb") as handle:
            handle.write(header)
            while True:
                chunk = await upload.read(64 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise ValidationError(
                        f"Each image must be {settings.MAX_UPLOAD_MB} MB or smaller"
                    )
                handle.write(chunk)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    if written == 0:
        dest.unlink(missing_ok=True)
        raise ValidationError("The image file was empty")

    return f"/uploads/listings/{dest.name}"


async def _read_validated_bytes(upload: UploadFile) -> tuple[bytes, str]:
    """Reads a whole upload into memory, enforcing the same type/size rules
    as :func:`save_listing_image`. Used where the full bytes are needed for
    processing (not just streaming to disk)."""
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    header = await upload.read(_MAX_HEADER)
    ext = _extension(header)
    if not ext:
        raise ValidationError("Only JPEG, PNG, WebP, or GIF images are allowed")

    chunks = [header]
    written = len(header)
    try:
        while True:
            chunk = await upload.read(64 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > max_bytes:
                raise ValidationError(
                    f"Each image must be {settings.MAX_UPLOAD_MB} MB or smaller"
                )
            chunks.append(chunk)
    finally:
        await upload.close()

    data = b"".join(chunks)
    if not data:
        raise ValidationError("The image file was empty")
    return data, ext


def _save_bytes(data: bytes, ext: str) -> str:
    dest = listings_dir() / f"{uuid.uuid4().hex}{ext}"
    dest.write_bytes(data)
    return f"/uploads/listings/{dest.name}"


async def whiten_background_gemini(data: bytes) -> bytes | None:
    """Asks Gemini's image model to replace the background with white.

    Best-effort: returns ``None`` on any failure, missing key, or a
    response with no image part, rather than raising.
    """
    if not settings.GEMINI_API_KEY:
        logger.error("[uploads] GEMINI_API_KEY not set — skipping background removal")
        return None
    try:
        body = {
            "contents": [
                {
                    "parts": [
                        {"text": _GEMINI_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": base64.b64encode(data).decode(),
                            }
                        },
                    ]
                }
            ]
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                _GEMINI_ENDPOINT,
                json=body,
                headers={"x-goog-api-key": settings.GEMINI_API_KEY},
            )
        if response.status_code >= 400:
            logger.error(
                "[uploads] Gemini background removal failed: %s %s",
                response.status_code,
                response.text[:300],
            )
            return None
        payload = response.json()
        for candidate in payload.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                inline = part.get("inline_data") or part.get("inlineData")
                if inline and inline.get("data"):
                    return base64.b64decode(inline["data"])
        logger.error("[uploads] Gemini response had no image part")
        return None
    except Exception:
        logger.exception("[uploads] Gemini background removal failed")
        return None


async def save_main_photo(upload: UploadFile) -> tuple[str, str | None]:
    """Saves the original photo and, best-effort, a white-background version.

    Returns ``(original_url, white_bg_url)`` — the second is ``None`` when
    background removal didn't succeed, in which case the caller should just
    offer the original.
    """
    data, ext = await _read_validated_bytes(upload)
    original_url = _save_bytes(data, ext)
    whitened = await whiten_background_gemini(data)
    white_bg_url = _save_bytes(whitened, ".png") if whitened else None
    return original_url, white_bg_url


def is_allowed_image_url(url: str) -> bool:
    """Listings may only point at our uploads or the site's static sample images."""
    clean = (url or "").strip()
    if not clean or "://" in clean or ".." in clean:
        return False
    return clean.startswith("/uploads/") or clean.startswith("/images/")
