from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.responses import success_response
from app.modules.faq.entities import FaqItem
from app.modules.faq.schemas import FaqResponse

router = APIRouter(prefix="/faq", tags=["Help"])


@router.get("")
async def list_faq(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(FaqItem)
        .where(FaqItem.is_active.is_(True))
        .order_by(FaqItem.sort_order.asc(), FaqItem.id.asc())
    )
    items = [FaqResponse.model_validate(i).model_dump() for i in result.scalars().all()]
    return success_response(message="FAQ retrieved successfully", data=items)
