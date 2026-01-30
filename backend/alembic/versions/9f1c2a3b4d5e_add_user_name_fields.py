"""add user name fields

Revision ID: 9f1c2a3b4d5e
Revises: e7ea62215ef1
Create Date: 2026-01-30 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f1c2a3b4d5e"
down_revision: Union[str, Sequence[str], None] = "e7ea62215ef1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("first_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=120), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
