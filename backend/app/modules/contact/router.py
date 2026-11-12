from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.marketplace import NotificationType
from app.core.responses import success_response
from app.core.transactional import notify_contact_message
from app.modules.auth.domain.entities import Role, User
from app.modules.contact.entities import ContactMessage
from app.modules.contact.schemas import ContactMessageRequest
from app.modules.notifications.service import notify_admins

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("/messages")
async def submit_contact(
    data: ContactMessageRequest,
    session: AsyncSession = Depends(get_db),
):
    msg = ContactMessage(
        full_name=data.full_name.strip(),
        email=str(data.email).lower(),
        phone=data.phone,
        subject=data.subject.strip() or "General enquiry",
        message=data.message.strip(),
    )
    session.add(msg)
    await notify_admins(
        session,
        type=NotificationType.CONTACT_MESSAGE,
        title="New contact form message",
        message=f"{msg.full_name}: {msg.subject}",
        link="/admin",
    )
    await session.commit()
    await session.refresh(msg)

    recipients = list(settings.contact_inbox_list)
    admins = await session.execute(
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(Role.name == "admin", User.is_active.is_(True))
    )
    for admin in admins.scalars().all():
        if admin.email:
            recipients.append(admin.email)
    await notify_contact_message(recipients=recipients, message=msg)

    return success_response(
        message="Message received — we'll be in touch",
        data={"id": msg.id},
    )
