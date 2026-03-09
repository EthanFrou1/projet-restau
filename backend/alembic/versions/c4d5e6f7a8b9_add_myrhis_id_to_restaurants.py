"""add myrhis_id to restaurants

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-03-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("restaurants")}
    indexes = {index["name"] for index in inspector.get_indexes("restaurants")}

    if "myrhis_id" not in columns:
        op.add_column("restaurants", sa.Column("myrhis_id", sa.Integer(), nullable=True))

    if "ix_restaurants_myrhis_id" not in indexes:
        op.create_index("ix_restaurants_myrhis_id", "restaurants", ["myrhis_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("restaurants")}
    indexes = {index["name"] for index in inspector.get_indexes("restaurants")}

    if "ix_restaurants_myrhis_id" in indexes:
        op.drop_index("ix_restaurants_myrhis_id", table_name="restaurants")

    if "myrhis_id" in columns:
        op.drop_column("restaurants", "myrhis_id")
