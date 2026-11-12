from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_verified_email
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.marketplace import ListingStatus
from app.core.rate_limit import limiter
from app.core.responses import success_response
from app.core.transactional import notify_new_message
from app.modules.auth.domain.entities import User
from app.modules.messaging.entities import Conversation, Message
from app.modules.messaging.schemas import (
    ConversationResponse,
    MessageResponse,
    SendMessageRequest,
    StartConversationRequest,
)
from app.modules.products.entities import Product

router = APIRouter(prefix="/messages", tags=["Messages"])


async def _load_conversation(session: AsyncSession, conversation_id: int) -> Conversation | None:
    """Always a fresh explicit `select()` — `session.get()` does not reliably
    eager-load the `product`/`buyer`/`seller` relationships here."""
    result = await session.execute(select(Conversation).where(Conversation.id == conversation_id))
    return result.scalar_one_or_none()


async def _owned_conversation(session: AsyncSession, conversation_id: int, user: User) -> Conversation:
    conversation = await _load_conversation(session, conversation_id)
    if not conversation:
        raise NotFoundError("Conversation", str(conversation_id))
    if user.id not in (conversation.buyer_id, conversation.seller_id):
        raise ForbiddenError("You are not part of this conversation")
    return conversation


async def _unread_count(session: AsyncSession, conversation_id: int, viewer_id: int) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender_id != viewer_id,
            Message.read_at.is_(None),
        )
    )
    return result.scalar_one()


async def _last_message(session: AsyncSession, conversation_id: int) -> Message | None:
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _mark_read(session: AsyncSession, conversation_id: int, viewer_id: int) -> None:
    result = await session.execute(
        select(Message).where(
            Message.conversation_id == conversation_id,
            Message.sender_id != viewer_id,
            Message.read_at.is_(None),
        )
    )
    unread = result.scalars().all()
    if not unread:
        return
    for message in unread:
        message.read_at = func.now()
    await session.commit()


async def _maybe_notify(session: AsyncSession, conversation: Conversation, sender: User) -> None:
    """Emails the other party, but only for the first unseen message in a row —
    a burst of quick replies should not become a burst of emails."""
    already_unread = await session.execute(
        select(func.count())
        .select_from(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.sender_id == sender.id,
            Message.read_at.is_(None),
        )
    )
    if already_unread.scalar_one() > 1:
        return
    recipient = conversation.seller if sender.id == conversation.buyer_id else conversation.buyer
    if recipient:
        await notify_new_message(
            recipient=recipient,
            sender_name=sender.full_name,
            product_name=conversation.product.name if conversation.product else "your listing",
            conversation_id=conversation.id,
        )


async def _conversation_response(
    session: AsyncSession, conversation: Conversation, viewer_id: int
) -> dict:
    unread = await _unread_count(session, conversation.id, viewer_id)
    last = await _last_message(session, conversation.id)
    return ConversationResponse.from_entity(
        conversation, viewer_id=viewer_id, unread_count=unread, last_message=last
    ).model_dump(mode="json")


@router.post("/conversations")
@limiter.limit("20/minute")
async def start_conversation(
    request: Request,
    data: StartConversationRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(require_verified_email),
):
    product = await session.get(Product, data.product_id)
    if not product or product.deleted_at is not None:
        raise NotFoundError("Product", str(data.product_id))
    if product.status not in ListingStatus.PUBLIC:
        raise ValidationError("This listing is not available")
    if not product.seller_user_id:
        raise ValidationError("This listing has no seller to message")
    if product.seller_user_id == user.id:
        raise ValidationError("You cannot message yourself about your own listing")

    existing = await session.execute(
        select(Conversation).where(
            Conversation.product_id == product.id,
            Conversation.buyer_id == user.id,
            Conversation.seller_id == product.seller_user_id,
        )
    )
    conversation = existing.scalar_one_or_none()
    if not conversation:
        conversation = Conversation(
            product_id=product.id, buyer_id=user.id, seller_id=product.seller_user_id
        )
        session.add(conversation)
        await session.flush()

    message = Message(conversation_id=conversation.id, sender_id=user.id, body=data.message.strip())
    session.add(message)
    conversation.last_message_at = func.now()
    await session.commit()

    conversation = await _load_conversation(session, conversation.id)
    await _maybe_notify(session, conversation, user)

    return success_response(
        message="Message sent",
        data=await _conversation_response(session, conversation, user.id),
    )


@router.get("/conversations")
async def list_conversations(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Conversation)
        .where(or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id))
        .order_by(Conversation.last_message_at.desc())
    )
    conversations = result.scalars().all()
    items = [await _conversation_response(session, c, user.id) for c in conversations]
    return success_response(message="Conversations retrieved", data={"items": items})


@router.get("/unread-count")
async def unread_count(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(func.count())
        .select_from(Message)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(
            or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id),
            Message.sender_id != user.id,
            Message.read_at.is_(None),
        )
    )
    return success_response(message="Unread count", data={"count": result.scalar_one()})


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversation = await _owned_conversation(session, conversation_id, user)
    await _mark_read(session, conversation_id, user.id)
    conversation = await _load_conversation(session, conversation_id)
    return success_response(
        message="Conversation retrieved",
        data=await _conversation_response(session, conversation, user.id),
    )


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: int,
    after_id: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _owned_conversation(session, conversation_id, user)
    await _mark_read(session, conversation_id, user.id)

    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.id > after_id)
        .order_by(Message.id.asc())
    )
    messages = result.scalars().all()
    return success_response(
        message="Messages retrieved",
        data={
            "items": [
                MessageResponse.from_entity(m, viewer_id=user.id).model_dump(mode="json")
                for m in messages
            ]
        },
    )


@router.post("/conversations/{conversation_id}/messages")
@limiter.limit("30/minute")
async def send_message(
    request: Request,
    conversation_id: int,
    data: SendMessageRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(require_verified_email),
):
    conversation = await _owned_conversation(session, conversation_id, user)

    message = Message(conversation_id=conversation.id, sender_id=user.id, body=data.body.strip())
    session.add(message)
    conversation.last_message_at = func.now()
    await session.commit()
    await session.refresh(message)

    conversation = await _load_conversation(session, conversation_id)
    await _maybe_notify(session, conversation, user)

    return success_response(
        message="Message sent",
        data=MessageResponse.from_entity(message, viewer_id=user.id).model_dump(mode="json"),
    )
