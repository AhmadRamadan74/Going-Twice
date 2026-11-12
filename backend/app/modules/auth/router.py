import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.core.responses import success_response
from app.modules.auth.domain.entities import User
from app.modules.auth.schemas import (
    AuthTokensResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
    VerificationChallengeResponse,
    VerifyEmailRequest,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(data: RegisterRequest, session: AsyncSession = Depends(get_db)):
    service = AuthService(session)
    result = await service.register(data)
    verification = None
    # Best-effort: a mail hiccup must not fail an otherwise good registration.
    # The user can always request a fresh code from /auth/send-verification.
    try:
        sent = await service.send_verification_code(result["user"])
        verification = VerificationChallengeResponse(**sent)
    except Exception:
        logging.getLogger(__name__).exception(
            "Could not send the initial verification code to %s", result["user"].email
        )
    payload = AuthTokensResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        user=UserResponse.from_entity(result["user"]),
        verification=verification,
    )
    return success_response(message="Registered successfully", data=payload.model_dump())


@router.post("/login")
async def login(data: LoginRequest, session: AsyncSession = Depends(get_db)):
    service = AuthService(session)
    result = await service.login(data)
    payload = AuthTokensResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        user=UserResponse.from_entity(result["user"]),
    )
    return success_response(message="Logged in successfully", data=payload.model_dump())


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return success_response(
        message="Current user",
        data=UserResponse.from_entity(current_user).model_dump(),
    )


@router.patch("/me")
async def update_me(
    data: UpdateProfileRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AuthService(session)
    user = await service.update_profile(current_user, data)
    return success_response(
        message="Profile updated",
        data=UserResponse.from_entity(user).model_dump(),
    )


@router.post("/refresh")
async def refresh(data: RefreshRequest, session: AsyncSession = Depends(get_db)):
    service = AuthService(session)
    result = await service.refresh(data.refresh_token)
    payload = AuthTokensResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        user=UserResponse.from_entity(result["user"]),
    )
    return success_response(message="Token refreshed", data=payload.model_dump())


@router.post("/logout")
async def logout(
    data: LogoutRequest | None = None,
    session: AsyncSession = Depends(get_db),
):
    service = AuthService(session)
    await service.logout(data.refresh_token if data else None)
    return success_response(message="Logged out", data=None)


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_db),
):
    service = AuthService(session)
    result = await service.forgot_password(data.email)
    payload = {"reset_link": result["reset_link"]} if result.get("reset_link") else None
    return success_response(message=result["message"], data=payload)


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db),
):
    service = AuthService(session)
    await service.reset_password(data.token, data.password)
    return success_response(message="Password updated. You can log in now.", data=None)


@router.post("/send-verification")
@limiter.limit("5/minute")
async def send_verification(
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AuthService(session)
    result = await service.send_verification_code(current_user)
    payload = VerificationChallengeResponse(**result)
    return success_response(
        message="Verification code sent",
        data=payload.model_dump(),
    )


@router.post("/verify-email")
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    data: VerifyEmailRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AuthService(session)
    user = await service.verify_email(current_user, data.code)
    return success_response(
        message="Email verified",
        data=UserResponse.from_entity(user).model_dump(),
    )
