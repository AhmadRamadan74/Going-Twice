from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.core.config import settings
from app.core.dependencies import require_verified_email
from app.core.exceptions import ValidationError
from app.core.rate_limit import limiter
from app.core.responses import success_response
from app.core.uploads import save_listing_image, save_main_photo
from app.modules.auth.domain.entities import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("")
@limiter.limit("20/minute")
async def upload_listing_images(
    request: Request,
    files: list[UploadFile] = File(...),
    _user: User = Depends(require_verified_email),
):
    if not files:
        raise ValidationError("Please attach at least one image")
    if len(files) > settings.MAX_UPLOAD_FILES:
        raise ValidationError(f"You can upload at most {settings.MAX_UPLOAD_FILES} images")

    urls: list[str] = []
    for upload in files:
        urls.append(await save_listing_image(upload))

    return success_response(
        message="Images uploaded",
        data={"urls": urls},
    )


@router.post("/main-photo")
@limiter.limit("10/minute")
async def upload_main_photo(
    request: Request,
    file: UploadFile = File(...),
    _user: User = Depends(require_verified_email),
):
    original_url, white_bg_url = await save_main_photo(file)
    return success_response(
        message="Photo processed",
        data={"original_url": original_url, "white_bg_url": white_bg_url},
    )
