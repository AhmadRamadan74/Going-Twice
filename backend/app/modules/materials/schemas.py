from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MaterialResponse(BaseModel):
    id: int
    name: str
    slug: str
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateMaterialRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    sort_order: int = 0
    is_active: bool = True


class UpdateMaterialRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
