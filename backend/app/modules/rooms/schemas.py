from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RoomResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateRoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
