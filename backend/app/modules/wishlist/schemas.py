from pydantic import BaseModel, Field


class AddWishlistRequest(BaseModel):
    product_id: int = Field(gt=0)
