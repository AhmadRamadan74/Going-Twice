"""
Create (or promote) an admin user by email/password.

Usage (from backend/, with DATABASE env vars pointing at the target DB):
  python -m scripts.create_admin <email> <password> [full_name]

Dokploy (exec into the running api container):
  python -m scripts.create_admin ramadan.fcai@gmail.com 'password123' "Ramadan"
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.modules.auth.domain.entities import Role, User


async def create_admin(email: str, password: str, full_name: str) -> None:
    email = email.strip().lower()
    async with AsyncSessionLocal() as session:
        admin_role = (
            await session.execute(select(Role).where(Role.name == "admin"))
        ).scalar_one_or_none()
        if admin_role is None:
            raise RuntimeError("admin role not found — run migrate_and_seed first")

        user = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if user is None:
            user = User(
                full_name=full_name,
                email=email,
                hashed_password=hash_password(password),
                role_id=admin_role.id,
                is_active=True,
                email_verified=True,
                email_verified_at=datetime.now(timezone.utc),
            )
            session.add(user)
            action = "created"
        else:
            user.hashed_password = hash_password(password)
            user.role_id = admin_role.id
            user.is_active = True
            user.email_verified = True
            action = "updated"

        await session.commit()
        print(f"Admin user {action}: {email}")


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python -m scripts.create_admin <email> <password> [full_name]")
        raise SystemExit(1)
    email = sys.argv[1]
    password = sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Admin"
    asyncio.run(create_admin(email, password, full_name))


if __name__ == "__main__":
    main()
