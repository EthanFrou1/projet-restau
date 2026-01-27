import csv
from datetime import date
from decimal import Decimal
from io import StringIO
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.models.bk_report import (
    BKAnnexSale,
    BKChannelSales,
    BKConsumptionMode,
    BKCorrections,
    BKDailyReport,
    BKDivers,
    BKPayment,
    BKRemises,
    BKTvaSummary,
)

router = APIRouter(prefix="/reports/bk", tags=["reports-bk"])


def _decode_csv_bytes(raw: bytes) -> str:
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", errors="replace")


def _parse_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    s = str(value).strip()
    if s == "":
        return None
    s = s.replace(" ", "").replace(",", ".")
    try:
        return Decimal(s)
    except Exception:
        return None


def _parse_int(value: Any) -> int | None:
    if value is None:
        return None
    s = str(value).strip()
    if s == "":
        return None
    s = s.replace(" ", "").replace(",", ".")
    try:
        return int(float(s))
    except Exception:
        return None


def _read_csv_rows(file: UploadFile) -> list[dict[str, str]]:
    raw = file.file.read()
    if not raw:
        return []
    text = _decode_csv_bytes(raw)
    reader = csv.DictReader(StringIO(text), delimiter=";")
    return [row for row in reader]


@router.post("/upload")
def upload_bk_report(
    report_date: date = Form(...),
    restaurant_code: str = Form(...),
    caparprofit: UploadFile = File(...),
    consommationparprofit: UploadFile = File(...),
    corrections: UploadFile = File(...),
    divers: UploadFile = File(...),
    reglement: UploadFile = File(...),
    remises: UploadFile = File(...),
    tva: UploadFile = File(...),
    vente_annexes: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.MANAGER, Role.ADMIN, Role.DEV])),
):
    existing = (
        db.query(BKDailyReport)
        .filter(
            BKDailyReport.restaurant_code == restaurant_code,
            BKDailyReport.report_date == report_date,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Report already exists for this restaurant and date.",
        )

    report = BKDailyReport(
        client_code="BK",
        restaurant_code=restaurant_code.strip().upper(),
        report_date=report_date,
    )
    db.add(report)
    db.flush()

    # caparprofit
    for row in _read_csv_rows(caparprofit):
        db.add(
            BKChannelSales(
                report_id=report.id,
                channel_label=str(row.get("profit", "")).strip(),
                tac=_parse_int(row.get("tac")),
                ca_net=_parse_decimal(row.get("net")),
                ca_ttc=_parse_decimal(row.get("ttc")),
                pm_net=_parse_decimal(row.get("panierMoyenNet")),
                pm_ttc=_parse_decimal(row.get("panierMoyenTTC")),
                net_total_profit=_parse_decimal(row.get("netTotalProfit")),
            )
        )

    # consommation par profit (1 ligne)
    rows = _read_csv_rows(consommationparprofit)
    if rows:
        row = rows[0]
        db.add(
            BKConsumptionMode(
                report_id=report.id,
                mode="SP",
                tac=_parse_int(row.get("SP_tac")),
                ca_ht=_parse_decimal(row.get("SP_caht")),
                ca_ttc=_parse_decimal(row.get("SP_cattc")),
                pct=_parse_decimal(row.get("SP_pourcent")),
            )
        )
        db.add(
            BKConsumptionMode(
                report_id=report.id,
                mode="AE",
                tac=_parse_int(row.get("AE_tac")),
                ca_ht=_parse_decimal(row.get("AE_caht")),
                ca_ttc=_parse_decimal(row.get("AE_cattc")),
                pct=_parse_decimal(row.get("AE_pourcent")),
            )
        )

    # corrections (1 ligne)
    rows = _read_csv_rows(corrections)
    if rows:
        row = rows[0]
        db.add(
            BKCorrections(
                report_id=report.id,
                taux=_parse_decimal(row.get("tauxCorrection")),
                montant=_parse_decimal(row.get("montantCorrection")),
                nombre=_parse_int(row.get("nombreCorrection")),
            )
        )

    # divers (1 ligne)
    rows = _read_csv_rows(divers)
    if rows:
        row = rows[0]
        db.add(
            BKDivers(
                report_id=report.id,
                nombre_repas_employes=_parse_int(row.get("nombreRepasEmployes")),
                nombre_commandes_ouvertes=_parse_int(row.get("nombreCommandeOuvertes")),
                montant_valorise_repas_employes=_parse_decimal(
                    row.get("montantValoriseRepasEmployes")
                ),
                nombre_annulations=_parse_int(row.get("nombreAnnulations")),
                montant_annulations=_parse_decimal(row.get("montantAnnulations")),
                taux_commandes_ouvertes=_parse_decimal(row.get("tauxCommandeOuvertes")),
                taux_repas_employes=_parse_decimal(row.get("tauxRepasEmployes")),
                montant_commandes_ouvertes=_parse_decimal(
                    row.get("montantCommandeOuvertes")
                ),
                taux_annulations=_parse_decimal(row.get("tauxAnnulations")),
            )
        )

    # reglement (multi)
    for row in _read_csv_rows(reglement):
        db.add(
            BKPayment(
                report_id=report.id,
                payment_type=str(row.get("type", "")).strip(),
                theorique=_parse_decimal(row.get("theorique")),
                preleve=_parse_decimal(row.get("preleve")),
                compte=_parse_decimal(row.get("compte")),
                ecart=_parse_decimal(row.get("ecart")),
            )
        )

    # remises (1 ligne)
    rows = _read_csv_rows(remises)
    if rows:
        row = rows[0]
        db.add(
            BKRemises(
                report_id=report.id,
                taux_remises=_parse_decimal(row.get("tauxRemises")),
                montant_remises=_parse_decimal(row.get("montantRemises")),
                nombre_remises=_parse_int(row.get("nombreRemises")),
                taux_sauces_offertes=_parse_decimal(row.get("tauxSaucesOffertes")),
                montant_sauces_offertes=_parse_decimal(row.get("montantSaucesOffertes")),
                nbr_sauces_offertes=_parse_int(row.get("nbrSaucesOffertes")),
            )
        )

    # tva (multi)
    for row in _read_csv_rows(tva):
        db.add(
            BKTvaSummary(
                report_id=report.id,
                tva_label=str(row.get("libelle", "")).strip(),
                ht=_parse_decimal(row.get("HT")),
                tva=_parse_decimal(row.get("TVA")),
                ttc=_parse_decimal(row.get("TTC")),
            )
        )

    # ventes annexes (multi)
    for row in _read_csv_rows(vente_annexes):
        db.add(
            BKAnnexSale(
                report_id=report.id,
                libelle=str(row.get("libelle", "")).strip(),
                nbr=_parse_int(row.get("nbr")),
                montant_ht=_parse_decimal(row.get("montantHT")),
                montant_ttc=_parse_decimal(row.get("montantttc")),
            )
        )

    db.commit()

    return {"report_id": report.id}


@router.get("/{report_id}")
def get_bk_report(
    report_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.MANAGER, Role.ADMIN, Role.DEV, Role.READONLY])),
):
    report = db.query(BKDailyReport).filter(BKDailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "id": report.id,
        "client_code": report.client_code,
        "restaurant_code": report.restaurant_code,
        "report_date": report.report_date.isoformat(),
        "created_at": report.created_at.isoformat(),
        "channel_sales": [
            {
                "channel_label": r.channel_label,
                "tac": r.tac,
                "ca_net": r.ca_net,
                "ca_ttc": r.ca_ttc,
                "pm_net": r.pm_net,
                "pm_ttc": r.pm_ttc,
                "net_total_profit": r.net_total_profit,
            }
            for r in report.channel_sales
        ],
        "consumption_modes": [
            {
                "mode": r.mode,
                "tac": r.tac,
                "ca_ht": r.ca_ht,
                "ca_ttc": r.ca_ttc,
                "pct": r.pct,
            }
            for r in report.consumption_modes
        ],
        "corrections": [
            {"taux": r.taux, "montant": r.montant, "nombre": r.nombre}
            for r in report.corrections
        ],
        "divers": [
            {
                "nombre_repas_employes": r.nombre_repas_employes,
                "nombre_commandes_ouvertes": r.nombre_commandes_ouvertes,
                "montant_valorise_repas_employes": r.montant_valorise_repas_employes,
                "nombre_annulations": r.nombre_annulations,
                "montant_annulations": r.montant_annulations,
                "taux_commandes_ouvertes": r.taux_commandes_ouvertes,
                "taux_repas_employes": r.taux_repas_employes,
                "montant_commandes_ouvertes": r.montant_commandes_ouvertes,
                "taux_annulations": r.taux_annulations,
            }
            for r in report.divers
        ],
        "payments": [
            {
                "payment_type": r.payment_type,
                "theorique": r.theorique,
                "preleve": r.preleve,
                "compte": r.compte,
                "ecart": r.ecart,
            }
            for r in report.payments
        ],
        "remises": [
            {
                "taux_remises": r.taux_remises,
                "montant_remises": r.montant_remises,
                "nombre_remises": r.nombre_remises,
                "taux_sauces_offertes": r.taux_sauces_offertes,
                "montant_sauces_offertes": r.montant_sauces_offertes,
                "nbr_sauces_offertes": r.nbr_sauces_offertes,
            }
            for r in report.remises
        ],
        "tva_summary": [
            {"tva_label": r.tva_label, "ht": r.ht, "tva": r.tva, "ttc": r.ttc}
            for r in report.tva_summary
        ],
        "annex_sales": [
            {"libelle": r.libelle, "nbr": r.nbr, "montant_ht": r.montant_ht, "montant_ttc": r.montant_ttc}
            for r in report.annex_sales
        ],
    }

