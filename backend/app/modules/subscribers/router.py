from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.responses import success_response
from app.modules.subscribers.entities import Subscriber
from app.modules.subscribers.schemas import SubscribeRequest

router = APIRouter(prefix="/subscribers", tags=["Newsletter"])


@router.post("/subscribe")
async def subscribe(data: SubscribeRequest, session: AsyncSession = Depends(get_db)):
    email = str(data.email).lower().strip()
    existing = await session.execute(select(Subscriber).where(Subscriber.email == email))
    sub = existing.scalar_one_or_none()
    if sub:
        if not sub.is_active:
            sub.is_active = True
            await session.commit()
        return success_response(message="You're already on the list", data={"email": email})

    session.add(Subscriber(email=email, is_active=True))
    await session.commit()
    return success_response(message="Subscribed successfully", data={"email": email})
