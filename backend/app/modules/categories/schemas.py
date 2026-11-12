from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    department: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    image_url: Optional[str] = None
    department: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True


class UpdateCategoryRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = None
    image_url: Optional[str] = None
    department: Optional[str] = None
    parent_id: Optional[int] = None
    clear_parent: bool = False
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
