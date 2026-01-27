"""add bk reports

Revision ID: 7a8b1d2c9f01
Revises: 2e61b5ceb804
Create Date: 2026-01-27 20:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7a8b1d2c9f01"
down_revision: Union[str, Sequence[str], None] = "2e61b5ceb804"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "bk_daily_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_code", sa.String(length=10), nullable=False),
        sa.Column("restaurant_code", sa.String(length=50), nullable=False),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_daily_reports_report_date"),
        "bk_daily_reports",
        ["report_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_bk_daily_reports_restaurant_code"),
        "bk_daily_reports",
        ["restaurant_code"],
        unique=False,
    )

    op.create_table(
        "bk_channel_sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("channel_label", sa.String(length=120), nullable=False),
        sa.Column("tac", sa.Integer(), nullable=True),
        sa.Column("ca_net", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("ca_ttc", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("pm_net", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("pm_ttc", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("net_total_profit", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_channel_sales_report_id"),
        "bk_channel_sales",
        ["report_id"],
        unique=False,
    )

    op.create_table(
        "bk_consumption_modes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("mode", sa.String(length=10), nullable=False),
        sa.Column("tac", sa.Integer(), nullable=True),
        sa.Column("ca_ht", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("ca_ttc", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("pct", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_consumption_modes_report_id"),
        "bk_consumption_modes",
        ["report_id"],
        unique=False,
    )

    op.create_table(
        "bk_corrections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("taux", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("montant", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("nombre", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_corrections_report_id"),
        "bk_corrections",
        ["report_id"],
        unique=False,
    )

    op.create_table(
        "bk_divers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("nombre_repas_employes", sa.Integer(), nullable=True),
        sa.Column("nombre_commandes_ouvertes", sa.Integer(), nullable=True),
        sa.Column(
            "montant_valorise_repas_employes",
            sa.Numeric(precision=14, scale=6),
            nullable=True,
        ),
        sa.Column("nombre_annulations", sa.Integer(), nullable=True),
        sa.Column("montant_annulations", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("taux_commandes_ouvertes", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("taux_repas_employes", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column(
            "montant_commandes_ouvertes",
            sa.Numeric(precision=14, scale=6),
            nullable=True,
        ),
        sa.Column("taux_annulations", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_divers_report_id"),
        "bk_divers",
        ["report_id"],
        unique=False,
    )

    op.create_table(
        "bk_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("payment_type", sa.String(length=80), nullable=False),
        sa.Column("theorique", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("preleve", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("compte", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("ecart", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_payments_report_id"),
        "bk_payments",
        ["report_id"],
        unique=False,
    )

    op.create_table(
        "bk_remises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("taux_remises", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("montant_remises", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("nombre_remises", sa.Integer(), nullable=True),
        sa.Column("taux_sauces_offertes", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("montant_sauces_offertes", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("nbr_sauces_offertes", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_remises_report_id"),
        "bk_remises",
        ["report_id"],
        unique=False,
    )

    op.create_table(
        "bk_tva_summary",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("tva_label", sa.String(length=30), nullable=False),
        sa.Column("ht", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("tva", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("ttc", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_tva_summary_report_id"),
        "bk_tva_summary",
        ["report_id"],
        unique=False,
    )

    op.create_table(
        "bk_annex_sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("libelle", sa.String(length=255), nullable=False),
        sa.Column("nbr", sa.Integer(), nullable=True),
        sa.Column("montant_ht", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.Column("montant_ttc", sa.Numeric(precision=14, scale=6), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["bk_daily_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_bk_annex_sales_report_id"),
        "bk_annex_sales",
        ["report_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_bk_annex_sales_report_id"), table_name="bk_annex_sales")
    op.drop_table("bk_annex_sales")
    op.drop_index(op.f("ix_bk_tva_summary_report_id"), table_name="bk_tva_summary")
    op.drop_table("bk_tva_summary")
    op.drop_index(op.f("ix_bk_remises_report_id"), table_name="bk_remises")
    op.drop_table("bk_remises")
    op.drop_index(op.f("ix_bk_payments_report_id"), table_name="bk_payments")
    op.drop_table("bk_payments")
    op.drop_index(op.f("ix_bk_divers_report_id"), table_name="bk_divers")
    op.drop_table("bk_divers")
    op.drop_index(op.f("ix_bk_corrections_report_id"), table_name="bk_corrections")
    op.drop_table("bk_corrections")
    op.drop_index(op.f("ix_bk_consumption_modes_report_id"), table_name="bk_consumption_modes")
    op.drop_table("bk_consumption_modes")
    op.drop_index(op.f("ix_bk_channel_sales_report_id"), table_name="bk_channel_sales")
    op.drop_table("bk_channel_sales")
    op.drop_index(op.f("ix_bk_daily_reports_restaurant_code"), table_name="bk_daily_reports")
    op.drop_index(op.f("ix_bk_daily_reports_report_date"), table_name="bk_daily_reports")
    op.drop_table("bk_daily_reports")
