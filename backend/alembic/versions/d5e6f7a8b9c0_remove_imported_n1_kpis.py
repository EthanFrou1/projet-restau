"""remove imported n1 kpis

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


REMOVED_COLUMNS = [
    "n1_ht",
    "clients_n1",
    "ca_delivery_n1",
    "client_delivery_n1",
    "ca_drive_n1",
    "client_drive_n1",
    "cnc_n1",
    "client_n1",
]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("bk_daily_kpis")}

    for column_name in REMOVED_COLUMNS:
        if column_name in columns:
            op.drop_column("bk_daily_kpis", column_name)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("bk_daily_kpis")}

    column_defs: dict[str, sa.Column] = {
        "n1_ht": sa.Column("n1_ht", sa.Numeric(14, 6), nullable=True),
        "clients_n1": sa.Column("clients_n1", sa.Integer(), nullable=True),
        "ca_delivery_n1": sa.Column("ca_delivery_n1", sa.Numeric(14, 6), nullable=True),
        "client_delivery_n1": sa.Column("client_delivery_n1", sa.Integer(), nullable=True),
        "ca_drive_n1": sa.Column("ca_drive_n1", sa.Numeric(14, 6), nullable=True),
        "client_drive_n1": sa.Column("client_drive_n1", sa.Integer(), nullable=True),
        "cnc_n1": sa.Column("cnc_n1", sa.Numeric(14, 6), nullable=True),
        "client_n1": sa.Column("client_n1", sa.Integer(), nullable=True),
    }

    for column_name in REMOVED_COLUMNS:
        if column_name not in columns:
            op.add_column("bk_daily_kpis", column_defs[column_name])
