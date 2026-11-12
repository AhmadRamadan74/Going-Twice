from pydantic import BaseModel, Field


class AddCartItemRequest(BaseModel):
    product_id: int = Field(gt=0)
