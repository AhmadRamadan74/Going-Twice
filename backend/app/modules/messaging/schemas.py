from datetime import datetime

from pydantic import BaseModel, Field


class StartConversationRequest(BaseModel):
    product_id: int
    message: str = Field(min_length=1, max_length=4000)


class SendMessageRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    is_mine: bool
    body: str
    created_at: datetime
    read_at: datetime | None = None

    @classmethod
    def from_entity(cls, message, *, viewer_id: int) -> "MessageResponse":
        return cls(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            is_mine=message.sender_id == viewer_id,
            body=message.body,
            created_at=message.created_at,
            read_at=message.read_at,
        )


class ConversationResponse(BaseModel):
    id: int
    product_id: int
    product_name: str | None = None
    product_slug: str | None = None
    product_image: str | None = None
    other_party_id: int
    other_party_name: str
    last_message_at: datetime
    last_message_preview: str | None = None
    unread_count: int
    created_at: datetime

    @classmethod
    def from_entity(
        cls, conversation, *, viewer_id: int, unread_count: int, last_message=None
    ) -> "ConversationResponse":
        is_buyer = conversation.buyer_id == viewer_id
        other = conversation.seller if is_buyer else conversation.buyer
        last = last_message
        return cls(
            id=conversation.id,
            product_id=conversation.product_id,
            product_name=conversation.product.name if conversation.product else None,
            product_slug=conversation.product.slug if conversation.product else None,
            product_image=conversation.product.image_url if conversation.product else None,
            other_party_id=other.id if other else 0,
            other_party_name=other.full_name if other else "Deleted user",
            last_message_at=conversation.last_message_at,
            last_message_preview=(last.body[:140] if last else None),
            unread_count=unread_count,
            created_at=conversation.created_at,
        )
