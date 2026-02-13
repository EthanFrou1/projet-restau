"""add zone to restaurants

Revision ID: 5c7e21a9bf34
Revises: c3d4e5f6a7b8
Create Date: 2026-02-13 15:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5c7e21a9bf34"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

restaurant_zone = sa.Enum(
    "NON_DEFINIE",
    "EST",
    "SUD",
    "NORD",
    "OUEST",
    "CENTRE",
    name="restaurant_zone",
    native_enum=False,
)


def upgrade() -> None:
    op.add_column(
        "restaurants",
        sa.Column("zone", restaurant_zone, nullable=True, server_default="NON_DEFINIE"),
    )
    op.execute("UPDATE restaurants SET zone = 'NON_DEFINIE' WHERE zone IS NULL")
    op.alter_column("restaurants", "zone", nullable=False, server_default=None)


def downgrade() -> None:
    op.drop_column("restaurants", "zone")
