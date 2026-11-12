from pydantic import BaseModel


class FaqResponse(BaseModel):
    id: int
    question: str
    answer: str
    sort_order: int

    model_config = {"from_attributes": True}
