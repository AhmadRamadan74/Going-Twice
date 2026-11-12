from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ContactMessageRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    subject: str = Field(default="General enquiry", max_length=200)
    message: str = Field(min_length=5)
