"""marketplace listings, orders, wishlist, cart, notifications

Revision ID: 002_marketplace
Revises: 001_initial
Create Date: 2026-08-19

Idempotent so it can run on a fresh 001 schema or a database that already
has a partial marketplace schema from an older untracked revision.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_marketplace"
down_revision: Union[str, Sequence[str], None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(inspector, table: str) -> set[str]:
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def _indexes(inspector, table: str) -> set[str]:
    if table not in inspector.get_table_names():
        return set()
    return {idx["name"] for idx in inspector.get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    product_cols = _columns(inspector, "products")

    if "status" not in product_cols:
        op.add_column(
            "products",
            sa.Column("status", sa.String(length=30), nullable=False, server_default="published"),
        )
        op.create_index("ix_products_status", "products", ["status"])
        op.alter_column("products", "status", server_default="pending_review")
    if "rejection_reason" not in product_cols:
        op.add_column("products", sa.Column("rejection_reason", sa.Text(), nullable=True))
    if "location_city" not in product_cols:
        op.add_column("products", sa.Column("location_city", sa.String(length=120), nullable=True))
    if "payment_methods" not in product_cols:
        op.add_column(
            "products",
            sa.Column(
                "payment_methods",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'[]'::json"),
            ),
        )
    if "is_sold" not in product_cols:
        op.add_column(
            "products",
            sa.Column("is_sold", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
        op.create_index("ix_products_is_sold", "products", ["is_sold"])

    inspector = sa.inspect(bind)
    product_cols = _columns(inspector, "products")
    if "status" in product_cols and "is_sold" in product_cols:
        op.execute("UPDATE products SET status = 'sold' WHERE is_sold = true AND status = 'published'")

    if "product_images" not in tables:
        op.create_table(
            "product_images",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "product_id",
                sa.Integer(),
                sa.ForeignKey("products.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("image_url", sa.String(length=500), nullable=False),
            sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index("ix_product_images_id", "product_images", ["id"])
        op.create_index("ix_product_images_product_id", "product_images", ["product_id"])
        op.execute(
            """
            INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
            SELECT id, image_url, true, 0
            FROM products
            WHERE image_url IS NOT NULL AND image_url <> ''
            """
        )

    if "wishlist_items" not in tables:
        op.create_table(
            "wishlist_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "product_id",
                sa.Integer(),
                sa.ForeignKey("products.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),
        )
        op.create_index("ix_wishlist_items_id", "wishlist_items", ["id"])
        op.create_index("ix_wishlist_items_user_id", "wishlist_items", ["user_id"])
        op.create_index("ix_wishlist_items_product_id", "wishlist_items", ["product_id"])

    if "cart_items" not in tables:
        op.create_table(
            "cart_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "product_id",
                sa.Integer(),
                sa.ForeignKey("products.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("price_at_addition", sa.Numeric(12, 2), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
            sa.Column(
                "added_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
        )
        op.create_index("ix_cart_items_id", "cart_items", ["id"])
        op.create_index("ix_cart_items_user_id", "cart_items", ["user_id"])
        op.create_index("ix_cart_items_product_id", "cart_items", ["product_id"])
    else:
        cart_cols = _columns(inspector, "cart_items")
        if "price_at_addition" not in cart_cols:
            op.add_column("cart_items", sa.Column("price_at_addition", sa.Numeric(12, 2), nullable=True))
            op.execute(
                """
                UPDATE cart_items AS c
                SET price_at_addition = p.price
                FROM products AS p
                WHERE c.product_id = p.id AND c.price_at_addition IS NULL
                """
            )
            op.execute("UPDATE cart_items SET price_at_addition = 0 WHERE price_at_addition IS NULL")
            op.alter_column("cart_items", "price_at_addition", nullable=False)
        if "quantity" not in cart_cols:
            op.add_column(
                "cart_items",
                sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
            )

    if "orders" not in tables:
        op.create_table(
            "orders",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("order_number", sa.String(length=40), nullable=False),
            sa.Column("buyer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("seller_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
            sa.Column("product_name", sa.String(length=255), nullable=False),
            sa.Column("product_image_url", sa.String(length=500), nullable=False),
            sa.Column("seller_name", sa.String(length=255), nullable=False),
            sa.Column("price", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(length=3), nullable=False, server_default="EGP"),
            sa.Column("payment_method", sa.String(length=40), nullable=False),
            sa.Column("handover_type", sa.String(length=30), nullable=False, server_default="self_pickup"),
            sa.Column("handover_location", sa.String(length=255), nullable=True),
            sa.Column("handover_time", sa.DateTime(timezone=True), nullable=True),
            sa.Column("handover_notes", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="order_placed"),
            sa.Column(
                "buyer_confirmed_payment",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("buyer_confirmed_payment_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "seller_confirmed_handover",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("seller_confirmed_handover_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index("ix_orders_id", "orders", ["id"])
        op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)
        op.create_index("ix_orders_buyer_id", "orders", ["buyer_id"])
        op.create_index("ix_orders_seller_id", "orders", ["seller_id"])
        op.create_index("ix_orders_product_id", "orders", ["product_id"])
        op.create_index("ix_orders_status", "orders", ["status"])
        op.create_index("ix_orders_created_at", "orders", ["created_at"])

    inspector = sa.inspect(bind)
    if "orders" in inspector.get_table_names():
        order_indexes = _indexes(inspector, "orders")
        if "ux_orders_active_product" not in order_indexes:
            op.create_index(
                "ux_orders_active_product",
                "orders",
                ["product_id"],
                unique=True,
                postgresql_where=sa.text("status <> 'cancelled'"),
            )

    inspector = sa.inspect(bind)
    if "notifications" not in inspector.get_table_names():
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("link", sa.String(length=500), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index("ix_notifications_id", "notifications", ["id"])
        op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
        op.create_index("ix_notifications_type", "notifications", ["type"])
        op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
        op.create_index("ix_notifications_created_at", "notifications", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "notifications" in tables:
        op.drop_table("notifications")
    if "orders" in tables:
        indexes = _indexes(inspector, "orders")
        if "ux_orders_active_product" in indexes:
            op.drop_index("ux_orders_active_product", table_name="orders")
        op.drop_table("orders")
    if "cart_items" in tables:
        op.drop_table("cart_items")
    if "wishlist_items" in tables:
        op.drop_table("wishlist_items")
    if "product_images" in tables:
        op.drop_table("product_images")
    product_cols = _columns(inspector, "products")
    if "ix_products_status" in _indexes(inspector, "products"):
        op.drop_index("ix_products_status", table_name="products")
    for col in ("payment_methods", "location_city", "rejection_reason", "status"):
        if col in product_cols:
            op.drop_column("products", col)
