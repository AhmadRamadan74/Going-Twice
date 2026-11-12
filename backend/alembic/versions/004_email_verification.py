"""email verification codes

Revision ID: 004_email_verification
Revises: 003_password_reset
Create Date: 2026-09-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_email_verification"
down_revision: Union[str, Sequence[str], None] = "003_password_reset"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "email_verified" not in user_columns:
        op.add_column(
            "users",
            sa.Column(
                "email_verified",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
    if "email_verified_at" not in user_columns:
        op.add_column(
            "users",
            sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "email_verification_codes" in inspector.get_table_names():
        return

    op.create_table(
        "email_verification_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "purpose",
            sa.String(length=40),
            nullable=False,
            server_default="email_verification",
        ),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_email_verification_codes_id", "email_verification_codes", ["id"]
    )
    op.create_index(
        "ix_email_verification_codes_user_id", "email_verification_codes", ["user_id"]
    )
    op.create_index(
        "ix_email_verification_codes_purpose", "email_verification_codes", ["purpose"]
    )
    op.create_index(
        "ix_email_verification_codes_code_hash",
        "email_verification_codes",
        ["code_hash"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "email_verification_codes" in inspector.get_table_names():
        op.drop_index(
            "ix_email_verification_codes_code_hash",
            table_name="email_verification_codes",
        )
        op.drop_index(
            "ix_email_verification_codes_purpose",
            table_name="email_verification_codes",
        )
        op.drop_index(
            "ix_email_verification_codes_user_id",
            table_name="email_verification_codes",
        )
        op.drop_index(
            "ix_email_verification_codes_id", table_name="email_verification_codes"
        )
        op.drop_table("email_verification_codes")

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "email_verified_at" in user_columns:
        op.drop_column("users", "email_verified_at")
    if "email_verified" in user_columns:
        op.drop_column("users", "email_verified")
