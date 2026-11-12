from datetime import datetime
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, EmailStr, Field

T = TypeVar("T")


class UnifiedResponse(BaseModel, Generic[T]):
    status: str
    message: str
    data: Optional[T] = None


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    phone_number: Optional[str] = Field(default=None, max_length=20)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PickupAddress(BaseModel):
    city: str = ""
    area: str = ""
    street: str = ""
    building: str = ""


class PayoutWallet(BaseModel):
    id: Optional[str] = None
    type: str = Field(min_length=3, max_length=40)
    handle: str = Field(min_length=2, max_length=80)


class PayoutBank(BaseModel):
    holder_name: str = Field(min_length=2, max_length=255)
    bank_name: str = Field(min_length=2, max_length=255)
    iban: str = Field(min_length=4, max_length=64)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone_number: Optional[str] = None
    role: str
    is_active: bool
    email_verified: bool = False
    created_at: datetime
    pickup_address: PickupAddress = PickupAddress()
    payout_wallets: list[PayoutWallet] = []
    payout_bank: Optional[PayoutBank] = None

    @classmethod
    def from_entity(cls, user) -> "UserResponse":
        bank = getattr(user, "payout_bank", None) or None
        wallets = []
        for row in getattr(user, "payout_wallets", None) or []:
            if not isinstance(row, dict):
                continue
            kind = str(row.get("type") or "").strip()
            handle = str(row.get("handle") or "").strip()
            if not kind or not handle:
                continue
            wallets.append(
                PayoutWallet(
                    id=str(row.get("id") or ""),
                    type=kind,
                    handle=handle,
                )
            )
        return cls(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone_number=user.phone_number,
            role=user.role.name if user.role else "customer",
            is_active=user.is_active,
            email_verified=bool(getattr(user, "email_verified", False)),
            created_at=user.created_at,
            pickup_address=PickupAddress(
                city=getattr(user, "pickup_city", None) or "",
                area=getattr(user, "pickup_area", None) or "",
                street=getattr(user, "pickup_street", None) or "",
                building=getattr(user, "pickup_building", None) or "",
            ),
            payout_wallets=wallets,
            payout_bank=PayoutBank(**bank) if bank and bank.get("iban") else None,
        )


class VerificationChallengeResponse(BaseModel):
    resend_after_seconds: int
    expires_in_minutes: int
    #: Non-production only, so local development can verify without a mailbox.
    debug_code: Optional[str] = None


class AuthTokensResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    #: Present on register when the first verification code was issued.
    verification: Optional[VerificationChallengeResponse] = None


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    phone_number: Optional[str] = Field(default=None, max_length=20)
    pickup_address: Optional[PickupAddress] = None
    payout_wallets: Optional[list[PayoutWallet]] = None
    payout_bank: Optional[PayoutBank] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=128)
    password: str = Field(min_length=6, max_length=128)


class VerifyEmailRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)
