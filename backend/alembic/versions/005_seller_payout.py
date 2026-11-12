"""seller payout details

Revision ID: 005_seller_payout
Revises: 004_email_verification
Create Date: 2026-09-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_seller_payout"
down_revision: Union[str, Sequence[str], None] = "004_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_cols = {col["name"] for col in inspector.get_columns("users")}
    for name, column in (
        ("pickup_city", sa.Column("pickup_city", sa.String(length=100), nullable=True)),
        ("pickup_area", sa.Column("pickup_area", sa.String(length=100), nullable=True)),
        ("pickup_street", sa.Column("pickup_street", sa.String(length=255), nullable=True)),
        ("pickup_building", sa.Column("pickup_building", sa.String(length=100), nullable=True)),
        ("payout_wallets", sa.Column("payout_wallets", sa.JSON(), nullable=False, server_default=sa.text("'[]'"))),
        ("payout_bank", sa.Column("payout_bank", sa.JSON(), nullable=True)),
    ):
        if name not in user_cols:
            op.add_column("users", column)

    order_cols = {col["name"] for col in inspector.get_columns("orders")}
    if "payout_instructions" not in order_cols:
        op.add_column("orders", sa.Column("payout_instructions", sa.JSON(), nullable=True))
    if "pickup_address" not in order_cols:
        op.add_column("orders", sa.Column("pickup_address", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "pickup_address")
    op.drop_column("orders", "payout_instructions")
    op.drop_column("users", "payout_bank")
    op.drop_column("users", "payout_wallets")
    op.drop_column("users", "pickup_building")
    op.drop_column("users", "pickup_street")
    op.drop_column("users", "pickup_area")
    op.drop_column("users", "pickup_city")
