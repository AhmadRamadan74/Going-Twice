from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.marketplace import ListingStatus, OrderStatus
from app.core.soft_delete import not_deleted
from app.modules.orders.entities import Order
from app.modules.products.entities import Product, ProductImage


def catalog_filters():
    """A piece is shoppable only when published and not already ordered."""
    active_order = exists().where(
        Order.product_id == Product.id,
        Order.status != OrderStatus.CANCELLED,
    )
    return [
        not_deleted(Product.deleted_at),
        Product.is_active.is_(True),
        Product.status.in_(list(ListingStatus.PUBLIC)),
        Product.is_sold.is_(False),
        ~active_order,
    ]


async def has_active_order(session: AsyncSession, product_id: int) -> bool:
    result = await session.execute(
        select(Order.id).where(
            Order.product_id == product_id,
            Order.status != OrderStatus.CANCELLED,
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


def is_public_listing(product: Product) -> bool:
    return (
        product.status in ListingStatus.PUBLIC
        and product.is_active
        and not product.is_sold
        and product.deleted_at is None
    )


async def is_available_for_purchase(session: AsyncSession, product: Product) -> bool:
    if not is_public_listing(product):
        return False
    return not await has_active_order(session, product.id)


def replace_product_images(product: Product, urls: list[str]) -> None:
    product.images.clear()
    for index, url in enumerate(urls):
        clean = (url or "").strip()
        if not clean:
            continue
        product.images.append(
            ProductImage(
                image_url=clean,
                is_primary=index == 0,
                sort_order=index,
            )
        )
    if product.images:
        product.image_url = product.images[0].image_url
