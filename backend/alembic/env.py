from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.core.database import Base

# Import all models so Alembic can detect them
from app.modules.auth.domain.entities import (  # noqa: F401
    EmailVerificationCode,
    PasswordResetToken,
    RefreshToken,
    Role,
    User,
)
from app.modules.categories.entities import Category  # noqa: F401
from app.modules.rooms.entities import Room  # noqa: F401
from app.modules.products.entities import Product, ProductImage  # noqa: F401
from app.modules.sell.entities import SellListing  # noqa: F401
from app.modules.journal.entities import Article  # noqa: F401
from app.modules.contact.entities import ContactMessage  # noqa: F401
from app.modules.subscribers.entities import Subscriber  # noqa: F401
from app.modules.faq.entities import FaqItem  # noqa: F401
from app.modules.wishlist.entities import WishlistItem  # noqa: F401
from app.modules.cart.entities import CartItem  # noqa: F401
from app.modules.orders.entities import Order  # noqa: F401
from app.modules.notifications.entities import Notification  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
