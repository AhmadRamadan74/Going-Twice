"""Direct buyer <-> seller chat, scoped to one listing per pair.

Polling-based, not WebSocket: the frontend refetches a conversation's
messages every few seconds while it is open. That is simple, needs no extra
infrastructure on Dokploy, and is plenty responsive for a marketplace where
two people are negotiating a meetup rather than chatting live all day.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Conversation(Base):
    """One thread between a specific buyer and seller about one listing."""

    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("product_id", "buyer_id", "seller_id", name="uq_conversation_participants"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seller_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    product = relationship("Product", lazy="selectin", viewonly=True)
    buyer = relationship("User", foreign_keys=[buyer_id], lazy="selectin", viewonly=True)
    seller = relationship("User", foreign_keys=[seller_id], lazy="selectin", viewonly=True)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    sender = relationship("User", lazy="selectin", viewonly=True)
