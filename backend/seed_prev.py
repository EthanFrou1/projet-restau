"""
Seed script : remplit le champ prev_ht dans bk_daily_kpis.

Pour chaque KPI sans prev_ht, on génère une prévision réaliste :
  prev_ht = n1_ht * facteur_croissance  (entre +3% et +8%)
  + petit bruit aléatoire par jour de semaine

Usage :
  docker compose exec api python /app/seed_prev.py

Options :
  --force   : écrase les prev_ht déjà renseignés
  --year    : ne traite que cette année (ex: --year 2025)
"""
import os
import sys
import random
from datetime import date

# Ajoute le dossier parent (=/app dans le container) au path
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.models.bk_report import BKDailyKpi, BKDailyReport

GROWTH_BASE = 0.05   # +5% de base vs N-1
NOISE_RANGE = 0.03   # ±3% de bruit aléatoire


def day_factor(report_date: date) -> float:
    """Légère variation selon le jour de la semaine."""
    factors = {
        0: 1.00,  # Lundi
        1: 1.00,  # Mardi
        2: 1.01,  # Mercredi
        3: 1.01,  # Jeudi
        4: 1.04,  # Vendredi
        5: 1.06,  # Samedi
        6: 1.05,  # Dimanche
    }
    return factors.get(report_date.weekday(), 1.0)


def main():
    force = "--force" in sys.argv
    year_filter: int | None = None
    for arg in sys.argv:
        if arg.startswith("--year="):
            year_filter = int(arg.split("=")[1])

    db = SessionLocal()
    try:
        query = (
            db.query(BKDailyKpi)
            .join(BKDailyReport, BKDailyKpi.report_id == BKDailyReport.id)
        )
        if year_filter:
            query = query.filter(
                BKDailyReport.report_date >= date(year_filter, 1, 1),
                BKDailyReport.report_date <= date(year_filter, 12, 31),
            )
        if not force:
            query = query.filter(BKDailyKpi.prev_ht.is_(None))

        kpis = query.all()
        print(f"[seed_prev] {len(kpis)} KPI(s) à traiter (force={force})")

        updated = 0
        skipped = 0

        for kpi in kpis:
            report = db.get(BKDailyReport, kpi.report_id)
            if report is None:
                skipped += 1
                continue

            # Base : utilise n1_ht si disponible, sinon ca_real
            base = float(kpi.n1_ht or kpi.ca_real or 0)
            if base <= 0:
                skipped += 1
                continue

            # Calcul prévision
            growth = GROWTH_BASE + random.uniform(-NOISE_RANGE, NOISE_RANGE)
            dfactor = day_factor(report.report_date)
            prev_ht = round(base * (1 + growth) * dfactor, 2)

            kpi.prev_ht = prev_ht
            updated += 1

        db.commit()
        print(f"[seed_prev] Terminé : {updated} mis à jour, {skipped} ignorés.")

    finally:
        db.close()


if __name__ == "__main__":
    random.seed(42)  # reproductible
    main()
