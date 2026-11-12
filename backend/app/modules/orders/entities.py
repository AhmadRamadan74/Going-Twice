from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.marketplace import OrderStatus
from app.modules.auth.domain.entities import User
from app.modules.products.entities import Product


class Order(Base):
    """Coordination record for a P2P sale. Money never passes through the platform."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    seller_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    seller_name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="EGP", nullable=False)
    payment_method: Mapped[str] = mapped_column(String(40), nullable=False)
    payout_instructions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pickup_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    handover_type: Mapped[str] = mapped_column(String(30), default="self_pickup", nullable=False)
    handover_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    handover_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    handover_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default=OrderStatus.ORDER_PLACED, nullable=False, index=True
    )
    buyer_confirmed_payment: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    buyer_confirmed_payment_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    seller_confirmed_handover: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    seller_confirmed_handover_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    buyer: Mapped[User] = relationship(foreign_keys=[buyer_id], lazy="selectin")
    seller: Mapped[User | None] = relationship(foreign_keys=[seller_id], lazy="selectin")
    product: Mapped[Product] = relationship(lazy="selectin")
