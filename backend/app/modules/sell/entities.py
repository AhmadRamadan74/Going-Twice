from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SellListing(Base):
    """Seller submission awaiting curation review."""

    __tablename__ = "sell_listings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    asking_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dimensions: Mapped[str | None] = mapped_column(String(255), nullable=True)
    era: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seller_name: Mapped[str] = mapped_column(String(255), nullable=False)
    seller_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    seller_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="pending_review", nullable=False, index=True
    )
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
