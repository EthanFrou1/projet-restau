"""normalize restaurant zone enum values

Revision ID: 6d91bb7f22a1
Revises: 5c7e21a9bf34
Create Date: 2026-02-13 16:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6d91bb7f22a1"
down_revision: Union[str, Sequence[str], None] = "5c7e21a9bf34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Normalize legacy values to the new enum naming scheme.
    op.execute("UPDATE restaurants SET zone = 'ZONE_EST' WHERE zone = 'EST'")
    op.execute("UPDATE restaurants SET zone = 'ZONE_OUEST' WHERE zone = 'OUEST'")
    op.execute("UPDATE restaurants SET zone = 'ZONE_SUD' WHERE zone = 'SUD'")
    op.execute("UPDATE restaurants SET zone = 'ZONE_NORD' WHERE zone = 'NORD'")
    op.execute("UPDATE restaurants SET zone = 'NON_DEFINIE' WHERE zone = 'CENTRE'")

    # Rebuild a strict check constraint to enforce valid enum-like values in DB.
    op.execute(
        """
        DO $$
        DECLARE c_name text;
        BEGIN
          SELECT conname INTO c_name
          FROM pg_constraint
          WHERE conrelid = 'restaurants'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) ILIKE '%zone%';

          IF c_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE restaurants DROP CONSTRAINT %I', c_name);
          END IF;
        END
        $$;
        """
    )
    op.create_check_constraint(
        "ck_restaurants_zone_allowed",
        "restaurants",
        "zone IN ('NON_DEFINIE', 'ZONE_EST', 'ZONE_OUEST', 'ZONE_SUD', 'ZONE_NORD')",
    )
    op.alter_column(
        "restaurants",
        "zone",
        existing_type=sa.String(length=50),
        server_default="NON_DEFINIE",
        existing_nullable=False,
    )


def downgrade() -> None:
    op.drop_constraint("ck_restaurants_zone_allowed", "restaurants", type_="check")
    op.execute("UPDATE restaurants SET zone = 'EST' WHERE zone = 'ZONE_EST'")
    op.execute("UPDATE restaurants SET zone = 'OUEST' WHERE zone = 'ZONE_OUEST'")
    op.execute("UPDATE restaurants SET zone = 'SUD' WHERE zone = 'ZONE_SUD'")
    op.execute("UPDATE restaurants SET zone = 'NORD' WHERE zone = 'ZONE_NORD'")

