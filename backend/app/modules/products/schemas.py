from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ProductImageResponse(BaseModel):
    id: int
    image_url: str
    is_primary: bool
    sort_order: int

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: int
    slug: str
    name: str
    seller_name: str
    seller_user_id: Optional[int] = None
    price: Decimal
    currency: str
    price_display: str
    image_url: str
    images: list[ProductImageResponse] = []
    description: str
    condition: Optional[str] = None
    dimensions: Optional[str] = None
    era: Optional[str] = None
    category_slug: str
    department: str
    room_slug: str
    subcategory_id: Optional[int] = None
    subcategory_name: Optional[str] = None
    subcategory_slug: Optional[str] = None
    material_id: Optional[int] = None
    material_name: Optional[str] = None
    collection: Optional[str] = None
    location_city: Optional[str] = None
    payment_methods: list[str] = []
    status: Optional[str] = None
    listed_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_entity(cls, p) -> "ProductResponse":
        amount = f"{p.price:,.0f}" if p.price == int(p.price) else f"{p.price:,.2f}"
        images = [
            ProductImageResponse.model_validate(img)
            for img in getattr(p, "images", None) or []
        ]
        methods = list(p.payment_methods or [])
        return cls(
            id=p.id,
            slug=p.slug,
            name=p.name,
            seller_name=p.seller_name,
            seller_user_id=p.seller_user_id,
            price=p.price,
            currency=p.currency,
            price_display=f"{p.currency} {amount}",
            image_url=p.image_url,
            images=images,
            description=p.description,
            condition=p.condition,
            dimensions=p.dimensions,
            era=p.era,
            category_slug=p.category_slug,
            department=p.department,
            room_slug=p.room_slug,
            subcategory_id=p.subcategory_id,
            subcategory_name=p.subcategory.name if p.subcategory else None,
            subcategory_slug=p.subcategory.slug if p.subcategory else None,
            material_id=p.material_id,
            material_name=p.material.name if p.material else None,
            collection=p.collection,
            location_city=p.location_city,
            payment_methods=methods,
            status=p.status,
            listed_at=p.listed_at,
        )


class CreateProductRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    seller_name: str = Field(min_length=2, max_length=255)
    price: Decimal = Field(gt=0)
    image_url: str
    image_urls: list[str] = []
    description: str
    condition: Optional[str] = None
    dimensions: Optional[str] = None
    era: Optional[str] = None
    category_slug: str
    department: str
    room_slug: str
    collection: Optional[str] = None
    location_city: Optional[str] = None
    payment_methods: list[str] = []
    slug: Optional[str] = None
