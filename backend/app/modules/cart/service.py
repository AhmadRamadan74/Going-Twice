from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.cart.entities import CartItem


async def list_cart_items(session: AsyncSession, user_id: int) -> list[CartItem]:
    result = await session.execute(
        select(CartItem).where(CartItem.user_id == user_id).order_by(CartItem.id)
    )
    return list(result.scalars().all())
