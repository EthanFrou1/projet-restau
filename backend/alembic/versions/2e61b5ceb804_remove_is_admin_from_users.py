"""remove is_admin from users

Revision ID: 2e61b5ceb804
Revises: f4322ea48eb5
Create Date: 2026-01-27 08:49:20.434046

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2e61b5ceb804"
down_revision: Union[str, Sequence[str], None] = "f4322ea48eb5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("users", "is_admin")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "users",
        sa.Column("is_admin", sa.BOOLEAN(), autoincrement=False, nullable=False),
    )
