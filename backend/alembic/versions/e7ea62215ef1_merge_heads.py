"""merge heads

Revision ID: e7ea62215ef1
Revises: 2b3a6c9d1e00, 8b9d2e3f7a10
Create Date: 2026-01-29 08:45:50.023656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7ea62215ef1'
down_revision: Union[str, Sequence[str], None] = ('2b3a6c9d1e00', '8b9d2e3f7a10')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
