"""remove zone from restaurants

Revision ID: a4d9f0c1b2e3
Revises: 6d91bb7f22a1
Create Date: 2026-02-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4d9f0c1b2e3"
down_revision: Union[str, Sequence[str], None] = "6d91bb7f22a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


restaurant_zone = sa.Enum(
    "NON_DEFINIE",
    "ZONE_EST",
    "ZONE_OUEST",
    "ZONE_SUD",
    "ZONE_NORD",
    name="restaurant_zone",
    native_enum=False,
)


def upgrade() -> None:
    op.drop_column("restaurants", "zone")


def downgrade() -> None:
    op.add_column(
        "restaurants",
        sa.Column("zone", restaurant_zone, nullable=True, server_default="NON_DEFINIE"),
    )
    op.execute("UPDATE restaurants SET zone = 'NON_DEFINIE' WHERE zone IS NULL")
    op.alter_column("restaurants", "zone", nullable=False, server_default=None)
