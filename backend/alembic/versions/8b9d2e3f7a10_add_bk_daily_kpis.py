"""add bk daily kpis

Revision ID: 8b9d2e3f7a10
Revises: 3f4c2a9b6d10
Create Date: 2026-01-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8b9d2e3f7a10"
down_revision = "3f4c2a9b6d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bk_daily_kpis",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("bk_daily_reports.id"), nullable=False, unique=True),
        sa.Column("n1_ht", sa.Numeric(14, 6), nullable=True),
        sa.Column("var_n1", sa.Numeric(14, 6), nullable=True),
        sa.Column("prev_ht", sa.Numeric(14, 6), nullable=True),
        sa.Column("ca_real", sa.Numeric(14, 6), nullable=True),
        sa.Column("clients", sa.Integer(), nullable=True),
        sa.Column("clients_n1", sa.Integer(), nullable=True),
        sa.Column("ca_delivery", sa.Numeric(14, 6), nullable=True),
        sa.Column("ca_delivery_n1", sa.Numeric(14, 6), nullable=True),
        sa.Column("client_delivery", sa.Integer(), nullable=True),
        sa.Column("client_delivery_n1", sa.Integer(), nullable=True),
        sa.Column("ca_click_collect", sa.Numeric(14, 6), nullable=True),
        sa.Column("cnc_n1", sa.Numeric(14, 6), nullable=True),
        sa.Column("client_click_collect", sa.Integer(), nullable=True),
        sa.Column("client_n1", sa.Integer(), nullable=True),
        sa.Column("cash_diff", sa.Numeric(14, 6), nullable=True),
    )
    op.create_index("ix_bk_daily_kpis_report_id", "bk_daily_kpis", ["report_id"])


def downgrade() -> None:
    op.drop_index("ix_bk_daily_kpis_report_id", table_name="bk_daily_kpis")
    op.drop_table("bk_daily_kpis")
