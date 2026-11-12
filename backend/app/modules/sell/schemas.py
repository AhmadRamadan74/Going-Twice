from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SellListingRequest(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=10)
    asking_price: Optional[Decimal] = Field(default=None, gt=0)
    category: Optional[str] = None
    room: Optional[str] = None
    department: Optional[str] = None
    subcategory_id: Optional[int] = None
    material_id: Optional[int] = None
    dimensions: Optional[str] = None
    era: Optional[str] = None
    condition: Optional[str] = None
    seller_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    seller_email: Optional[EmailStr] = None
    seller_phone: Optional[str] = Field(default=None, min_length=6, max_length=40)
    city: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: list[str] = []
    payment_methods: list[str] = []
    save_as_draft: bool = False


class UpdateSellListingRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, min_length=10)
    asking_price: Optional[Decimal] = Field(default=None, gt=0)
    category: Optional[str] = None
    room: Optional[str] = None
    department: Optional[str] = None
    subcategory_id: Optional[int] = None
    material_id: Optional[int] = None
    dimensions: Optional[str] = None
    era: Optional[str] = None
    condition: Optional[str] = None
    city: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[list[str]] = None
    payment_methods: Optional[list[str]] = None


class SellListingResponse(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    asking_price: Optional[Decimal] = None
    category: Optional[str] = None
    room: Optional[str] = None
    condition: Optional[str] = None
    location_city: Optional[str] = None
    rejection_reason: Optional[str] = None
    image_url: str
    images: list[str] = []
    payment_methods: list[str] = []
    department: Optional[str] = None
    era: Optional[str] = None
    dimensions: Optional[str] = None
    subcategory_id: Optional[int] = None
    subcategory_name: Optional[str] = None
    material_id: Optional[int] = None
    material_name: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_product(cls, product) -> "SellListingResponse":
        return cls(
            id=product.id,
            slug=product.slug,
            title=product.name,
            description=product.description,
            status=product.status,
            created_at=product.created_at,
            updated_at=product.updated_at,
            asking_price=product.price,
            category=product.category_slug,
            room=product.room_slug,
            condition=product.condition,
            location_city=product.location_city,
            rejection_reason=product.rejection_reason,
            image_url=product.image_url,
            images=[img.image_url for img in (product.images or [])],
            payment_methods=list(product.payment_methods or []),
            department=product.department,
            era=product.era,
            dimensions=product.dimensions,
            subcategory_id=product.subcategory_id,
            subcategory_name=product.subcategory.name if product.subcategory else None,
            material_id=product.material_id,
            material_name=product.material.name if product.material else None,
        )
