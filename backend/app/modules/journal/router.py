import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.core.exceptions import NotFoundError
from app.core.pagination import clamp_per_page
from app.core.responses import success_response
from app.core.soft_delete import not_deleted
from app.modules.auth.domain.entities import User
from app.modules.journal.entities import Article
from app.modules.journal.schemas import (
    ArticleDetail,
    ArticleListItem,
    CreateArticleRequest,
)

router = APIRouter(prefix="/journal", tags=["Journal"])


@router.get("")
async def list_articles(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    session: AsyncSession = Depends(get_db),
):
    per_page = clamp_per_page(per_page)
    filters = [not_deleted(Article.deleted_at), Article.is_published.is_(True)]
    total = (
        await session.execute(select(func.count()).select_from(Article).where(*filters))
    ).scalar_one()
    result = await session.execute(
        select(Article)
        .where(*filters)
        .order_by(Article.published_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [
        ArticleListItem.model_validate(a).model_dump() for a in result.scalars().all()
    ]
    return success_response(
        message="Articles retrieved successfully",
        data={
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": math.ceil(total / per_page) if total else 0,
        },
    )


@router.get("/{slug}")
async def get_article(slug: str, session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(Article).where(
            Article.slug == slug,
            not_deleted(Article.deleted_at),
            Article.is_published.is_(True),
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise NotFoundError("Article", slug)

    paragraphs = [p.strip() for p in article.body.split("\n\n") if p.strip()]
    data = ArticleDetail(
        id=article.id,
        slug=article.slug,
        tag=article.tag,
        title=article.title,
        excerpt=article.excerpt,
        image_url=article.image_url,
        published_at=article.published_at,
        body_paragraphs=paragraphs,
    )
    return success_response(message="Article retrieved successfully", data=data.model_dump())


@router.post("")
async def create_article(
    data: CreateArticleRequest,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    article = Article(**data.model_dump())
    session.add(article)
    await session.commit()
    await session.refresh(article)
    return success_response(
        message="Article created successfully",
        data=ArticleListItem.model_validate(article).model_dump(),
    )
