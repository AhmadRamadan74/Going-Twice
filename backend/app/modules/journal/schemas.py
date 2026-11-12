from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ArticleListItem(BaseModel):
    id: int
    slug: str
    tag: str
    title: str
    excerpt: str
    image_url: str
    published_at: datetime

    model_config = {"from_attributes": True}


class ArticleDetail(ArticleListItem):
    body_paragraphs: List[str]


class CreateArticleRequest(BaseModel):
    slug: str
    tag: str
    title: str = Field(min_length=2)
    excerpt: str
    body: str
    image_url: str
