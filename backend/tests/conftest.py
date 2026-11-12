"""Shared test fixtures.

The suite runs against in-memory SQLite so it needs neither Postgres nor a
mail provider. Environment is pinned *before* importing the app because the
engine and settings are built at import time.
"""

import os

os.environ["DATABASE_URL_OVERRIDE"] = "sqlite+aiosqlite:///:memory:"
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"
os.environ["MAIL_ENABLED"] = "False"
os.environ["AUTH_ALLOW_MAGIC_OTP_BYPASS"] = "False"
os.environ["AUTH_EXPOSE_VERIFICATION_CODE"] = "True"
os.environ["BCRYPT_ROUNDS"] = "4"  # keep hashing fast in tests

from datetime import datetime, timezone  # noqa: E402
from decimal import Decimal  # noqa: E402

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.database import Base, get_db  # noqa: E402
from app.core.marketplace import ListingStatus  # noqa: E402
from app.core.rate_limit import limiter  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402

# Import every entity module so Base.metadata knows all tables.
from app.modules.auth.domain.entities import (  # noqa: E402,F401
    EmailVerificationCode,
    PasswordResetToken,
    RefreshToken,
    Role,
    User,
)
from app.modules.cart.entities import CartItem  # noqa: E402,F401
from app.modules.categories.entities import Category  # noqa: E402,F401
from app.modules.contact.entities import ContactMessage  # noqa: E402,F401
from app.modules.faq.entities import FaqItem  # noqa: E402,F401
from app.modules.journal.entities import Article  # noqa: E402,F401
from app.modules.materials.entities import Material  # noqa: E402,F401
from app.modules.messaging.entities import Conversation, Message  # noqa: E402,F401
from app.modules.notifications.entities import Notification  # noqa: E402,F401
from app.modules.orders.entities import Order  # noqa: E402,F401
from app.modules.products.entities import Product, ProductImage  # noqa: E402,F401
from app.modules.rooms.entities import Room  # noqa: E402,F401
from app.modules.sell.entities import SellListing  # noqa: E402,F401
from app.modules.subscribers.entities import Subscriber  # noqa: E402,F401
from app.modules.wishlist.entities import WishlistItem  # noqa: E402,F401

API = "/api/v1"


@pytest.fixture(autouse=True)
def _disable_rate_limits():
    """Route-level limits would trip on the repeated calls tests make."""
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture(autouse=True)
def _capture_emails(monkeypatch):
    """Collects outbound mail instead of sending it."""
    sent: list[dict] = []

    async def fake_send(*, to, subject, html, text, reply_to=None):
        sent.append(
            {
                "to": to,
                "subject": subject,
                "html": html,
                "text": text,
                "reply_to": reply_to,
            }
        )
        return True

    # Patched at both import sites so either module path is covered.
    monkeypatch.setattr("app.core.email.send_email", fake_send)
    monkeypatch.setattr("app.modules.auth.service.send_email", fake_send)
    return sent


@pytest.fixture
def emails(_capture_emails):
    return _capture_emails


@pytest_asyncio.fixture
async def session_factory():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest_asyncio.fixture
async def db(session_factory):
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def roles(db):
    customer = Role(name="customer", description="Buyer and seller")
    admin = Role(name="admin", description="Moderator")
    db.add_all([customer, admin])
    await db.commit()
    await db.refresh(customer)
    await db.refresh(admin)
    return {"customer": customer, "admin": admin}


@pytest_asyncio.fixture
async def make_user(db, roles):
    async def _make(
        email: str,
        *,
        full_name: str = "Test Person",
        password: str = "password123",
        role: str = "customer",
        email_verified: bool = True,
    ) -> User:
        user = User(
            full_name=full_name,
            email=email.lower(),
            hashed_password=hash_password(password),
            role_id=roles[role].id,
            is_active=True,
            email_verified=email_verified,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    return _make


@pytest_asyncio.fixture
async def make_product(db):
    counter = {"n": 0}

    async def _make(
        *,
        seller: User,
        name: str = "Walnut Lounge Chair",
        price: str = "8500",
        status: str = ListingStatus.PUBLISHED,
        payment_methods: list[str] | None = None,
    ) -> Product:
        counter["n"] += 1
        product = Product(
            slug=f"{name.lower().replace(' ', '-')}-{counter['n']}",
            name=name,
            seller_name=seller.full_name,
            seller_user_id=seller.id,
            price=Decimal(price),
            currency="EGP",
            image_url="https://example.test/chair.jpg",
            description="A remarkable vintage piece.",
            condition="Excellent",
            category_slug="chairs",
            department="furniture",
            room_slug="living-room",
            payment_methods=payment_methods or ["instapay", "bank_transfer"],
            status=status,
            is_active=True,
            listed_at=datetime.now(timezone.utc),
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)
        return product

    return _make


@pytest_asyncio.fixture
async def auth(client):
    """Logs a user in and returns the Authorization header."""

    async def _auth(email: str, password: str = "password123") -> dict:
        response = await client.post(
            f"{API}/auth/login", json={"email": email, "password": password}
        )
        assert response.status_code == 200, response.text
        token = response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _auth
