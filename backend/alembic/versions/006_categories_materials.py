"""category subcategories + materials taxonomy

Revision ID: 006_categories_materials
Revises: 005_seller_payout
Create Date: 2026-09-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_categories_materials"
down_revision: Union[str, Sequence[str], None] = "005_seller_payout"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(inspector, table: str) -> set[str]:
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    category_cols = _columns(inspector, "categories")
    if "parent_id" not in category_cols:
        with op.batch_alter_table("categories") as batch_op:
            batch_op.add_column(sa.Column("parent_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_categories_parent_id_categories", "categories", ["parent_id"], ["id"]
            )
            batch_op.create_index("ix_categories_parent_id", ["parent_id"])

    if "materials" not in tables:
        op.create_table(
            "materials",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=150), nullable=False, unique=True),
            sa.Column("slug", sa.String(length=150), nullable=False, unique=True),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
        )
        op.create_index("ix_materials_id", "materials", ["id"])
        op.create_index("ix_materials_slug", "materials", ["slug"])
        op.create_index("ix_materials_deleted_at", "materials", ["deleted_at"])

    inspector = sa.inspect(bind)
    product_cols = _columns(inspector, "products")
    if "subcategory_id" not in product_cols:
        with op.batch_alter_table("products") as batch_op:
            batch_op.add_column(sa.Column("subcategory_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_products_subcategory_id_categories", "categories", ["subcategory_id"], ["id"]
            )
            batch_op.create_index("ix_products_subcategory_id", ["subcategory_id"])
    if "material_id" not in product_cols:
        with op.batch_alter_table("products") as batch_op:
            batch_op.add_column(sa.Column("material_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_products_material_id_materials", "materials", ["material_id"], ["id"]
            )
            batch_op.create_index("ix_products_material_id", ["material_id"])


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    inspector = sa.inspect(bind)
    product_cols = _columns(inspector, "products")
    if "material_id" in product_cols:
        with op.batch_alter_table("products") as batch_op:
            if not is_sqlite:
                batch_op.drop_constraint("fk_products_material_id_materials", type_="foreignkey")
            batch_op.drop_index("ix_products_material_id")
            batch_op.drop_column("material_id")
    if "subcategory_id" in product_cols:
        with op.batch_alter_table("products") as batch_op:
            if not is_sqlite:
                batch_op.drop_constraint(
                    "fk_products_subcategory_id_categories", type_="foreignkey"
                )
            batch_op.drop_index("ix_products_subcategory_id")
            batch_op.drop_column("subcategory_id")

    if "materials" in inspector.get_table_names():
        op.drop_table("materials")

    category_cols = _columns(inspector, "categories")
    if "parent_id" in category_cols:
        with op.batch_alter_table("categories") as batch_op:
            if not is_sqlite:
                batch_op.drop_constraint(
                    "fk_categories_parent_id_categories", type_="foreignkey"
                )
            batch_op.drop_index("ix_categories_parent_id")
            batch_op.drop_column("parent_id")
