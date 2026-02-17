"""add people and satisfaction kpis

Revision ID: f3a9c1d8e2b4
Revises: d2c8f1a9b7e4
Create Date: 2026-02-17 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3a9c1d8e2b4"
down_revision: Union[str, Sequence[str], None] = "d2c8f1a9b7e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("bk_daily_kpis")}

    for column_name in (
        "heures_personnel",
        "heures_travail",
        "taux_horaire",
        "osat_score",
        "gxi_score",
        "google_score",
    ):
        if column_name not in columns:
            op.add_column(
                "bk_daily_kpis",
                sa.Column(column_name, sa.Numeric(14, 6), nullable=True),
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("bk_daily_kpis")}

    for column_name in (
        "google_score",
        "gxi_score",
        "osat_score",
        "taux_horaire",
        "heures_travail",
        "heures_personnel",
    ):
        if column_name in columns:
            op.drop_column("bk_daily_kpis", column_name)
