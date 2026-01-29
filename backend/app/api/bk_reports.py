import csv
import calendar
from datetime import date
from decimal import Decimal
from io import StringIO
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db
from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.models.bk_report import (
    BKDailyKpi,
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


class BKDailyKpiUpdate(BaseModel):
    n1_ht: Decimal | None = None
    var_n1: Decimal | None = None
    prev_ht: Decimal | None = None
    clients_n1: int | None = None
    ca_delivery_n1: Decimal | None = None
    client_delivery_n1: int | None = None
    cnc_n1: Decimal | None = None
    client_n1: int | None = None
    cash_diff: Decimal | None = None


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
    channel_rows: list[dict[str, Any]] = []
    for row in _read_csv_rows(caparprofit):
        channel_label = str(row.get("profit", "")).strip()
        channel_rows.append(
            {
                "channel_label": channel_label,
                "tac": _parse_int(row.get("tac")),
                "ca_net": _parse_decimal(row.get("net")),
                "ca_ttc": _parse_decimal(row.get("ttc")),
                "pm_net": _parse_decimal(row.get("panierMoyenNet")),
                "pm_ttc": _parse_decimal(row.get("panierMoyenTTC")),
                "net_total_profit": _parse_decimal(row.get("netTotalProfit")),
            }
        )

    for row in channel_rows:
        db.add(
            BKChannelSales(
                report_id=report.id,
                channel_label=row["channel_label"],
                is_total=False,
                tac=row["tac"],
                ca_net=row["ca_net"],
                ca_ttc=row["ca_ttc"],
                pm_net=row["pm_net"],
                pm_ttc=row["pm_ttc"],
                net_total_profit=row["net_total_profit"],
            )
        )

    def _sum_decimal(values: list[Decimal | None]) -> Decimal:
        total = Decimal("0")
        for value in values:
            if value is not None:
                total += value
        return total

    def _sum_int(values: list[int | None]) -> int:
        return sum(v or 0 for v in values)

    def _total_row(label: str, rows: list[dict[str, Any]]) -> BKChannelSales | None:
        if not rows:
            return None
        tac_total = _sum_int([r["tac"] for r in rows])
        ca_net_total = _sum_decimal([r["ca_net"] for r in rows])
        ca_ttc_total = _sum_decimal([r["ca_ttc"] for r in rows])
        net_total_profit = _sum_decimal([r["net_total_profit"] for r in rows])
        pm_net = (ca_net_total / tac_total) if tac_total else None
        pm_ttc = (ca_ttc_total / tac_total) if tac_total else None
        return BKChannelSales(
            report_id=report.id,
            channel_label=label,
            is_total=True,
            tac=tac_total,
            ca_net=ca_net_total,
            ca_ttc=ca_ttc_total,
            pm_net=pm_net,
            pm_ttc=pm_ttc,
            net_total_profit=net_total_profit,
        )

    def _is_group(label: str, prefix: str) -> bool:
        return label.upper().startswith(prefix)

    groups = [
        ("TOTAL CLICK & COLLECT", "CLICK & COLLECT"),
        ("TOTAL COMPTOIR", "COMPTOIR"),
        ("TOTAL DRIVE", "DRIVE"),
        ("TOTAL HOME DELIVERY", "HOME DELIVERY"),
        ("TOTAL KIOSK", "KIOSK"),
    ]

    for total_label, prefix in groups:
        rows = [r for r in channel_rows if _is_group(r["channel_label"], prefix)]
        total_row = _total_row(total_label, rows)
        if total_row:
            db.add(total_row)

    total_all = _total_row("TOTAL", channel_rows)
    if total_all:
        db.add(total_all)

    ca_real = _sum_decimal([r["ca_net"] for r in channel_rows])
    clients = _sum_int([r["tac"] for r in channel_rows])
    ca_delivery = _sum_decimal(
        [r["ca_net"] for r in channel_rows if _is_group(r["channel_label"], "HOME DELIVERY")]
    )
    client_delivery = _sum_int(
        [r["tac"] for r in channel_rows if _is_group(r["channel_label"], "HOME DELIVERY")]
    )
    ca_click_collect = _sum_decimal(
        [r["ca_net"] for r in channel_rows if _is_group(r["channel_label"], "CLICK & COLLECT")]
    )
    client_click_collect = _sum_int(
        [r["tac"] for r in channel_rows if _is_group(r["channel_label"], "CLICK & COLLECT")]
    )

    db.add(
        BKDailyKpi(
            report_id=report.id,
            ca_real=ca_real,
            clients=clients,
            ca_delivery=ca_delivery,
            client_delivery=client_delivery,
            ca_click_collect=ca_click_collect,
            client_click_collect=client_click_collect,
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


@router.get("")
def list_bk_reports(
    start_date: date | None = None,
    end_date: date | None = None,
    restaurant_code: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles([Role.MANAGER, Role.ADMIN, Role.DEV, Role.READONLY])),
):
    query = db.query(BKDailyReport)

    if start_date:
        query = query.filter(BKDailyReport.report_date >= start_date)
    if end_date:
        query = query.filter(BKDailyReport.report_date <= end_date)

    if restaurant_code:
        query = query.filter(
            BKDailyReport.restaurant_code == restaurant_code.strip().upper()
        )

    if user.role not in (Role.ADMIN.value, Role.DEV.value):
        allowed = [r.code for r in user.restaurants]
        if not allowed:
            return []
        query = query.filter(BKDailyReport.restaurant_code.in_(allowed))

    reports = (
        query.order_by(BKDailyReport.report_date.desc(), BKDailyReport.restaurant_code.asc())
        .all()
    )

    return [
        {
            "id": report.id,
            "restaurant_code": report.restaurant_code,
            "report_date": report.report_date.isoformat(),
            "created_at": report.created_at.isoformat(),
        }
        for report in reports
    ]


@router.get("/monthly")
def list_bk_reports_monthly(
    year: int,
    month: int,
    restaurant_code: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_roles([Role.MANAGER, Role.ADMIN, Role.DEV, Role.READONLY])),
):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")

    last_day = calendar.monthrange(year, month)[1]
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    allowed_restaurants: list[str] | None = None
    if user.role not in (Role.ADMIN.value, Role.DEV.value):
        allowed_restaurants = [r.code for r in user.restaurants]
        if not allowed_restaurants:
            return []

    query = (
        db.query(BKDailyReport)
        .options(joinedload(BKDailyReport.channel_sales), joinedload(BKDailyReport.kpi))
        .filter(
            BKDailyReport.report_date >= start_date,
            BKDailyReport.report_date <= end_date,
        )
    )

    if restaurant_code:
        query = query.filter(
            BKDailyReport.restaurant_code == restaurant_code.strip().upper()
        )

    if allowed_restaurants is not None:
        query = query.filter(BKDailyReport.restaurant_code.in_(allowed_restaurants))

    reports = (
        query.order_by(BKDailyReport.report_date.asc(), BKDailyReport.restaurant_code.asc())
        .all()
    )

    def _safe_float(value: Any) -> float:
        if value is None:
            return 0.0
        try:
            return float(value)
        except Exception:
            return 0.0

    def _is_group(label: str, prefix: str) -> bool:
        return label.upper().startswith(prefix)

    def _calc_report_values(report: BKDailyReport) -> dict[str, Any]:
        ca_net_total = sum(
            _safe_float(r.ca_net) for r in report.channel_sales if not r.is_total
        )
        ca_ttc_total = sum(
            _safe_float(r.ca_ttc) for r in report.channel_sales if not r.is_total
        )
        tac_total = sum((r.tac or 0) for r in report.channel_sales if not r.is_total)
        ca_delivery = sum(
            _safe_float(r.ca_net)
            for r in report.channel_sales
            if not r.is_total and _is_group(r.channel_label, "HOME DELIVERY")
        )
        client_delivery = sum(
            (r.tac or 0)
            for r in report.channel_sales
            if not r.is_total and _is_group(r.channel_label, "HOME DELIVERY")
        )
        ca_click_collect = sum(
            _safe_float(r.ca_net)
            for r in report.channel_sales
            if not r.is_total and _is_group(r.channel_label, "CLICK & COLLECT")
        )
        client_click_collect = sum(
            (r.tac or 0)
            for r in report.channel_sales
            if not r.is_total and _is_group(r.channel_label, "CLICK & COLLECT")
        )

        return {
            "ca_net_total": ca_net_total,
            "ca_ttc_total": ca_ttc_total,
            "tac_total": tac_total,
            "ca_delivery": ca_delivery,
            "client_delivery": client_delivery,
            "ca_click_collect": ca_click_collect,
            "client_click_collect": client_click_collect,
        }

    prev_by_key: dict[tuple[str, date], BKDailyReport] = {}
    if reports:
        prev_year = year - 1
        prev_last_day = calendar.monthrange(prev_year, month)[1]
        prev_start = date(prev_year, month, 1)
        prev_end = date(prev_year, month, prev_last_day)

        prev_query = (
            db.query(BKDailyReport)
            .options(joinedload(BKDailyReport.channel_sales), joinedload(BKDailyReport.kpi))
            .filter(
                BKDailyReport.report_date >= prev_start,
                BKDailyReport.report_date <= prev_end,
            )
        )

        if restaurant_code:
            prev_query = prev_query.filter(
                BKDailyReport.restaurant_code == restaurant_code.strip().upper()
            )

        if allowed_restaurants is not None:
            prev_query = prev_query.filter(BKDailyReport.restaurant_code.in_(allowed_restaurants))
        else:
            codes = {r.restaurant_code for r in reports}
            if codes:
                prev_query = prev_query.filter(BKDailyReport.restaurant_code.in_(codes))

        prev_reports = prev_query.all()
        prev_by_key = {(r.restaurant_code, r.report_date): r for r in prev_reports}

    payload = []
    for report in reports:
        values = _calc_report_values(report)
        ca_net_total = values["ca_net_total"]
        ca_ttc_total = values["ca_ttc_total"]
        tac_total = values["tac_total"]

        kpi = report.kpi
        ca_real = kpi.ca_real if kpi and kpi.ca_real is not None else ca_net_total
        clients = kpi.clients if kpi and kpi.clients is not None else tac_total

        prev_date = None
        try:
            prev_date = date(report.report_date.year - 1, report.report_date.month, report.report_date.day)
        except ValueError:
            prev_date = None

        prev_report = prev_by_key.get((report.restaurant_code, prev_date)) if prev_date else None
        prev_values = _calc_report_values(prev_report) if prev_report else None
        prev_kpi = prev_report.kpi if prev_report else None

        prev_ca_real = None
        prev_clients = None
        prev_ca_delivery = None
        prev_client_delivery = None
        prev_ca_click_collect = None
        prev_client_click_collect = None
        if prev_report:
            prev_ca_real = (
                prev_kpi.ca_real
                if prev_kpi and prev_kpi.ca_real is not None
                else prev_values["ca_net_total"]
            )
            prev_clients = (
                prev_kpi.clients
                if prev_kpi and prev_kpi.clients is not None
                else prev_values["tac_total"]
            )
            prev_ca_delivery = (
                prev_kpi.ca_delivery
                if prev_kpi and prev_kpi.ca_delivery is not None
                else prev_values["ca_delivery"]
            )
            prev_client_delivery = (
                prev_kpi.client_delivery
                if prev_kpi and prev_kpi.client_delivery is not None
                else prev_values["client_delivery"]
            )
            prev_ca_click_collect = (
                prev_kpi.ca_click_collect
                if prev_kpi and prev_kpi.ca_click_collect is not None
                else prev_values["ca_click_collect"]
            )
            prev_client_click_collect = (
                prev_kpi.client_click_collect
                if prev_kpi and prev_kpi.client_click_collect is not None
                else prev_values["client_click_collect"]
            )

        payload.append(
            {
                "id": report.id,
                "restaurant_code": report.restaurant_code,
                "report_date": report.report_date.isoformat(),
                "created_at": report.created_at.isoformat(),
                "ca_net_total": ca_net_total,
                "ca_ttc_total": ca_ttc_total,
                "tac_total": tac_total,
                "kpi": {
                    "n1_ht": kpi.n1_ht if kpi and kpi.n1_ht is not None else prev_ca_real,
                    "var_n1": kpi.var_n1 if kpi else None,
                    "prev_ht": kpi.prev_ht if kpi else None,
                    "ca_real": ca_real,
                    "clients": clients,
                    "clients_n1": kpi.clients_n1 if kpi and kpi.clients_n1 is not None else prev_clients,
                    "ca_delivery": kpi.ca_delivery if kpi and kpi.ca_delivery is not None else values["ca_delivery"],
                    "ca_delivery_n1": kpi.ca_delivery_n1 if kpi and kpi.ca_delivery_n1 is not None else prev_ca_delivery,
                    "client_delivery": kpi.client_delivery if kpi and kpi.client_delivery is not None else values["client_delivery"],
                    "client_delivery_n1": kpi.client_delivery_n1 if kpi and kpi.client_delivery_n1 is not None else prev_client_delivery,
                    "ca_click_collect": kpi.ca_click_collect if kpi and kpi.ca_click_collect is not None else values["ca_click_collect"],
                    "cnc_n1": kpi.cnc_n1 if kpi and kpi.cnc_n1 is not None else prev_ca_click_collect,
                    "client_click_collect": kpi.client_click_collect if kpi and kpi.client_click_collect is not None else values["client_click_collect"],
                    "client_n1": kpi.client_n1 if kpi and kpi.client_n1 is not None else prev_client_click_collect,
                    "cash_diff": kpi.cash_diff if kpi else None,
                },
            }
        )

    return payload


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
        "kpi": None
        if not report.kpi
        else {
            "n1_ht": report.kpi.n1_ht,
            "var_n1": report.kpi.var_n1,
            "prev_ht": report.kpi.prev_ht,
            "ca_real": report.kpi.ca_real,
            "clients": report.kpi.clients,
            "clients_n1": report.kpi.clients_n1,
            "ca_delivery": report.kpi.ca_delivery,
            "ca_delivery_n1": report.kpi.ca_delivery_n1,
            "client_delivery": report.kpi.client_delivery,
            "client_delivery_n1": report.kpi.client_delivery_n1,
            "ca_click_collect": report.kpi.ca_click_collect,
            "cnc_n1": report.kpi.cnc_n1,
            "client_click_collect": report.kpi.client_click_collect,
            "client_n1": report.kpi.client_n1,
            "cash_diff": report.kpi.cash_diff,
        },
        "channel_sales": [
            {
                "channel_label": r.channel_label,
                "is_total": r.is_total,
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


@router.put("/{report_id}/kpi")
def update_bk_report_kpi(
    report_id: int,
    payload: BKDailyKpiUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.MANAGER, Role.ADMIN, Role.DEV])),
):
    report = db.query(BKDailyReport).filter(BKDailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.kpi is None:
        report.kpi = BKDailyKpi(report_id=report.id)

    report.kpi.n1_ht = payload.n1_ht
    report.kpi.var_n1 = payload.var_n1
    report.kpi.prev_ht = payload.prev_ht
    report.kpi.clients_n1 = payload.clients_n1
    report.kpi.ca_delivery_n1 = payload.ca_delivery_n1
    report.kpi.client_delivery_n1 = payload.client_delivery_n1
    report.kpi.cnc_n1 = payload.cnc_n1
    report.kpi.client_n1 = payload.client_n1
    report.kpi.cash_diff = payload.cash_diff

    db.add(report)
    db.commit()

    return {"status": "ok"}


@router.delete("/{report_id}")
def delete_bk_report(
    report_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.ADMIN, Role.DEV])),
):
    report = db.query(BKDailyReport).filter(BKDailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    db.delete(report)
    db.commit()
    return {"status": "deleted"}
