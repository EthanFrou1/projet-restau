#!/usr/bin/env python3
"""
Script de seed démo — Génère des données fictives pour Mars 2025.

Usage (dans le container Docker) :
    docker compose exec api python /app/seed_demo.py

Le script récupère les restaurants et utilisateurs existants, puis crée
un rapport BK complet pour chaque jour du 01/03/2025 au 31/03/2025.
Il skippe silencieusement les jours déjà importés.
"""

import os
import sys
import random
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.restaurant import Restaurant
from app.models.user import User
from app.models.bk_report import (
    BKDailyReport,
    BKChannelSales,
    BKConsumptionMode,
    BKCorrections,
    BKDivers,
    BKPayment,
    BKRemises,
    BKTvaSummary,
    BKAnnexSale,
    BKDailyKpi,
)

# Graine fixe pour des résultats reproductibles (même données à chaque run)
random.seed(42)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def rf(lo: float, hi: float, decimals: int = 2) -> float:
    return round(random.uniform(lo, hi), decimals)


def ri(lo: int, hi: int) -> int:
    return random.randint(lo, hi)


def day_factor(d: date) -> float:
    """Coefficient de fréquentation selon le jour de la semaine."""
    return {0: 1.0, 1: 1.0, 2: 1.05, 3: 1.05, 4: 1.15, 5: 1.30, 6: 1.40}[d.weekday()]


# ---------------------------------------------------------------------------
# Core seeding
# ---------------------------------------------------------------------------

def seed_report(db: Session, restaurant: Restaurant, user: User, report_date: date) -> None:
    # Skip si déjà importé
    exists = db.execute(
        select(BKDailyReport).where(
            BKDailyReport.restaurant_code == restaurant.code,
            BKDailyReport.report_date == report_date,
        )
    ).scalar_one_or_none()
    if exists:
        print(f"  [SKIP] {restaurant.code} — {report_date} (déjà en base)")
        return

    # --- Paramètres globaux du jour ---
    factor = day_factor(report_date)
    base_tac = int(rf(180, 280) * factor)
    pm_ttc_avg = rf(11.5, 14.5)
    ca_ttc_total = round(base_tac * pm_ttc_avg, 2)

    # Répartition par canal (%)
    pct_delivery = rf(0.25, 0.35)
    pct_cnc = rf(0.10, 0.15)
    pct_drive = rf(0.15, 0.22)
    pct_counter = round(1.0 - pct_delivery - pct_cnc - pct_drive, 4)

    ca_delivery = round(ca_ttc_total * pct_delivery, 2)
    ca_cnc = round(ca_ttc_total * pct_cnc, 2)
    ca_drive = round(ca_ttc_total * pct_drive, 2)
    ca_counter = round(ca_ttc_total * pct_counter, 2)

    tac_delivery = max(1, int(base_tac * pct_delivery))
    tac_cnc = max(1, int(base_tac * pct_cnc))
    tac_drive = max(1, int(base_tac * pct_drive))
    tac_counter = max(1, base_tac - tac_delivery - tac_cnc - tac_drive)

    # -----------------------------------------------------------------------
    # BKDailyReport
    # -----------------------------------------------------------------------
    report = BKDailyReport(
        client_code="BK",
        restaurant_code=restaurant.code.strip().upper(),
        report_date=report_date,
        imported_by_user_id=user.id,
        is_reimport=False,
        comment=None,
    )
    db.add(report)
    db.flush()  # Génère l'ID

    # -----------------------------------------------------------------------
    # BKChannelSales
    # -----------------------------------------------------------------------
    tac_cnc_emp = max(1, int(tac_cnc * 0.60))
    tac_cnc_sp = max(1, tac_cnc - tac_cnc_emp)
    ca_cnc_emp = round(ca_cnc * 0.60, 2)
    ca_cnc_sp = round(ca_cnc - ca_cnc_emp, 2)

    tac_cpt_emp = max(1, int(tac_counter * 0.55))
    tac_cpt_sp = max(1, tac_counter - tac_cpt_emp)
    ca_cpt_emp = round(ca_counter * 0.55, 2)
    ca_cpt_sp = round(ca_counter - ca_cpt_emp, 2)

    channels = [
        # (label, tac, ca_ttc, is_total)
        ("HOME DELIVERY", tac_delivery, ca_delivery, False),
        ("CLICK & COLLECT EMPORTÉ", tac_cnc_emp, ca_cnc_emp, False),
        ("CLICK & COLLECT SUR PLACE", tac_cnc_sp, ca_cnc_sp, False),
        ("DRIVE EMPORTÉ", tac_drive, ca_drive, False),
        ("COMPTOIR EMPORTÉ", tac_cpt_emp, ca_cpt_emp, False),
        ("COMPTOIR SUR PLACE", tac_cpt_sp, ca_cpt_sp, False),
        # Totaux agrégés
        ("TOTAL HOME DELIVERY", tac_delivery, ca_delivery, True),
        ("TOTAL CLICK & COLLECT", tac_cnc, ca_cnc, True),
        ("TOTAL DRIVE", tac_drive, ca_drive, True),
        ("TOTAL COMPTOIR", tac_counter, ca_counter, True),
        ("TOTAL", base_tac, ca_ttc_total, True),
    ]

    for label, tac, ca_ttc, is_total in channels:
        ca_net = round(ca_ttc / 1.10, 6)
        pm_net = round(ca_net / tac, 6) if tac else 0.0
        pm_ttc = round(ca_ttc / tac, 6) if tac else 0.0
        profit = round(ca_net * rf(0.12, 0.18), 6)
        db.add(BKChannelSales(
            report_id=report.id,
            channel_label=label,
            is_total=is_total,
            tac=tac,
            ca_net=ca_net,
            ca_ttc=ca_ttc,
            pm_net=pm_net,
            pm_ttc=pm_ttc,
            net_total_profit=profit,
        ))

    # -----------------------------------------------------------------------
    # BKConsumptionMode (SP = Sur Place, AE = À Emporter)
    # -----------------------------------------------------------------------
    sp_pct = rf(0.35, 0.45)
    sp_tac = max(1, int(base_tac * sp_pct))
    ae_tac = max(1, base_tac - sp_tac)
    sp_ca_ttc = round(ca_ttc_total * sp_pct, 2)
    ae_ca_ttc = round(ca_ttc_total - sp_ca_ttc, 2)

    for mode, tac, ca_ttc, pct in [
        ("SP", sp_tac, sp_ca_ttc, sp_pct),
        ("AE", ae_tac, ae_ca_ttc, round(1.0 - sp_pct, 4)),
    ]:
        db.add(BKConsumptionMode(
            report_id=report.id,
            mode=mode,
            tac=tac,
            ca_ht=round(ca_ttc / 1.10, 6),
            ca_ttc=ca_ttc,
            pct=round(pct, 6),
        ))

    # -----------------------------------------------------------------------
    # BKCorrections
    # -----------------------------------------------------------------------
    nb_corrections = ri(80, 200)
    mt_corrections = round(ca_ttc_total * rf(0.04, 0.08), 2)
    db.add(BKCorrections(
        report_id=report.id,
        taux=round(mt_corrections / ca_ttc_total, 6),
        montant=mt_corrections,
        nombre=nb_corrections,
    ))

    # -----------------------------------------------------------------------
    # BKDivers
    # -----------------------------------------------------------------------
    nb_repas_emp = ri(8, 20)
    mt_repas_emp = round(nb_repas_emp * rf(9.0, 12.0), 2)
    nb_cmd_ouv = ri(2, 8)
    mt_cmd_ouv = round(rf(100, 250), 2)
    nb_annul = ri(0, 5)
    mt_annul = round(rf(0, 80), 2)
    db.add(BKDivers(
        report_id=report.id,
        nombre_repas_employes=nb_repas_emp,
        montant_valorise_repas_employes=mt_repas_emp,
        nombre_commandes_ouvertes=nb_cmd_ouv,
        montant_commandes_ouvertes=mt_cmd_ouv,
        nombre_annulations=nb_annul,
        montant_annulations=mt_annul,
        taux_repas_employes=round(mt_repas_emp / ca_ttc_total, 6),
        taux_commandes_ouvertes=round(mt_cmd_ouv / ca_ttc_total, 6),
        taux_annulations=round(mt_annul / ca_ttc_total, 6),
    ))

    # -----------------------------------------------------------------------
    # BKPayment
    # -----------------------------------------------------------------------
    pct_cb = rf(0.55, 0.68)
    pct_especes = rf(0.05, 0.10)
    deliveroo_amt = round(ca_delivery * 0.50, 2)
    uber_amt = round(ca_delivery * 0.50, 2)
    ancv_amt = round(ca_ttc_total * rf(0.01, 0.03), 2)
    cb_amt = round(ca_ttc_total * pct_cb, 2)
    especes_amt = round(ca_ttc_total * pct_especes, 2)

    for ptype, amount in [
        ("CB", cb_amt),
        ("ESPECES", especes_amt),
        ("DELIVEROO", deliveroo_amt),
        ("UBER EATS", uber_amt),
        ("ANCV", ancv_amt),
    ]:
        ecart = round(rf(-5, 5), 2)
        db.add(BKPayment(
            report_id=report.id,
            payment_type=ptype,
            theorique=amount,
            preleve=amount,
            compte=round(amount + ecart, 2),
            ecart=ecart,
        ))

    # -----------------------------------------------------------------------
    # BKRemises
    # -----------------------------------------------------------------------
    mt_remises = round(ca_ttc_total * rf(0.03, 0.06), 2)
    nb_remises = ri(80, 150)
    mt_sauces = round(rf(0.25, 0.40) * ri(800, 1500), 2)
    nb_sauces = ri(800, 1500)
    db.add(BKRemises(
        report_id=report.id,
        taux_remises=round(mt_remises / ca_ttc_total, 6),
        montant_remises=mt_remises,
        nombre_remises=nb_remises,
        taux_sauces_offertes=round(mt_sauces / ca_ttc_total, 6),
        montant_sauces_offertes=mt_sauces,
        nbr_sauces_offertes=nb_sauces,
    ))

    # -----------------------------------------------------------------------
    # BKTvaSummary (TVA 5,5% / TVA 10% / TVA 20%)
    # -----------------------------------------------------------------------
    ca_5_ttc = round(ca_ttc_total * rf(0.05, 0.10), 2)
    ca_10_ttc = round(ca_ttc_total * rf(0.68, 0.78), 2)
    ca_20_ttc = round(ca_ttc_total - ca_5_ttc - ca_10_ttc, 2)

    for label, ttc, rate in [
        ("TVA 5,5%", ca_5_ttc, 0.055),
        ("TVA 10%", ca_10_ttc, 0.10),
        ("TVA 20%", ca_20_ttc, 0.20),
    ]:
        ht = round(ttc / (1 + rate), 6)
        tva = round(ttc - ht, 6)
        db.add(BKTvaSummary(
            report_id=report.id,
            tva_label=label,
            ht=ht,
            tva=tva,
            ttc=ttc,
        ))

    # -----------------------------------------------------------------------
    # BKAnnexSale
    # -----------------------------------------------------------------------
    annex_products = [
        ("WHOPPER",            ri(30, 80),  rf(3.50, 4.50)),
        ("BIG KING",           ri(15, 55),  rf(3.20, 4.00)),
        ("CHICKEN ROYALE",     ri(15, 50),  rf(3.00, 3.80)),
        ("FRITES MOYENNES",    ri(50, 120), rf(0.80, 1.20)),
        ("COCA COLA MEDIUM",   ri(40, 100), rf(0.90, 1.30)),
        ("ICE CREAM",          ri(10, 40),  rf(0.80, 1.00)),
    ]
    for libelle, nbr, price_ht in annex_products:
        mt_ht = round(nbr * price_ht, 2)
        db.add(BKAnnexSale(
            report_id=report.id,
            libelle=libelle,
            nbr=nbr,
            montant_ht=mt_ht,
            montant_ttc=round(mt_ht * 1.10, 2),
        ))

    # -----------------------------------------------------------------------
    # BKDailyKpi
    # -----------------------------------------------------------------------
    n1_factor = rf(0.90, 0.96)
    ca_real = round(ca_ttc_total / 1.10, 2)  # CA HT approximatif
    n1_ht = round(ca_real * n1_factor, 2)
    var_n1 = round((ca_real - n1_ht) / n1_ht, 6) if n1_ht else 0.0

    heures_personnel = round(base_tac / rf(15, 20), 2)
    heures_travail = round(heures_personnel * rf(0.85, 0.95), 2)

    db.add(BKDailyKpi(
        report_id=report.id,
        ca_real=ca_real,
        n1_ht=n1_ht,
        var_n1=var_n1,
        prev_ht=round(ca_real * rf(0.95, 1.05), 2),
        clients=base_tac,
        clients_n1=max(1, int(base_tac * n1_factor)),
        ca_delivery=ca_delivery,
        ca_delivery_n1=round(ca_delivery * n1_factor, 2),
        client_delivery=tac_delivery,
        client_delivery_n1=max(1, int(tac_delivery * n1_factor)),
        ca_click_collect=ca_cnc,
        cnc_n1=round(ca_cnc * n1_factor, 2),
        client_click_collect=tac_cnc,
        client_n1=max(1, int(base_tac * n1_factor)),
        cash_diff=round(rf(-20, 20), 2),
        heures_personnel=heures_personnel,
        heures_travail=heures_travail,
        taux_horaire=round(rf(11.50, 13.50), 2),
        osat_score=round(rf(75, 95), 1),
        gxi_score=round(rf(70, 90), 1),
        google_score=round(rf(3.5, 4.8), 1),
    ))

    db.commit()
    print(f"  [OK]   {restaurant.code} — {report_date.strftime('%a %d/%m/%Y')}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def seed_period(db: Session, restaurants: list, user: User, year: int, month: int) -> None:
    import calendar
    last_day = calendar.monthrange(year, month)[1]
    start = date(year, month, 1)
    end = date(year, month, last_day)
    print(f"\n[INFO] Période : {start.strftime('%d/%m/%Y')} → {end.strftime('%d/%m/%Y')}")
    current = start
    while current <= end:
        print(f"[DATE] {current.strftime('%A %d/%m/%Y')}")
        for restaurant in restaurants:
            seed_report(db, restaurant, user, current)
        current += timedelta(days=1)
    total = (end - start).days + 1
    print(f"\n[OK] {total} jours × {len(restaurants)} restaurant(s) = {total * len(restaurants)} rapports générés.")


def main() -> None:
    # Usage : python seed_demo.py [year] [month]
    # Défaut : seed Mars 2025 ET Mars 2026
    args = sys.argv[1:]

    db: Session = SessionLocal()
    try:
        restaurants = db.execute(select(Restaurant)).scalars().all()
        if not restaurants:
            print("[ERREUR] Aucun restaurant trouvé. Créez-en d'abord via l'interface.")
            sys.exit(1)

        print(f"[INFO] Restaurants en base : {[r.code for r in restaurants]}")

        user = db.execute(
            select(User).where(User.is_active == True).limit(1)
        ).scalar_one_or_none()
        if not user:
            print("[ERREUR] Aucun utilisateur actif trouvé.")
            sys.exit(1)

        print(f"[INFO] Import simulé par : {user.email}")

        if len(args) >= 2:
            # Période spécifique : python seed_demo.py 2025 2
            year, month = int(args[0]), int(args[1])
            seed_period(db, restaurants, user, year, month)
        else:
            # Par défaut : Février 2025 + Mars 2025 (données N-1 pour la démo)
            seed_period(db, restaurants, user, 2025, 2)
            seed_period(db, restaurants, user, 2025, 3)

        print("\n[DONE] Seed terminé.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
