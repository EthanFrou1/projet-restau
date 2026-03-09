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
from app.models.restaurant import Restaurant
from app.integrations.myrhis.client import MyRhisClient, MyRhisClientError, MyRhisConfigError
from app.integrations.myrhis.labor import build_labor_summary

router = APIRouter(prefix="/reports/bk", tags=["reports-bk"])


class BKDailyKpiUpdate(BaseModel):
    var_n1: Decimal | None = None
    prev_ht: Decimal | None = None
    cash_diff: Decimal | None = None
    heures_personnel: Decimal | None = None
    heures_travail: Decimal | None = None
    taux_horaire: Decimal | None = None
    osat_score: Decimal | None = None
    gxi_score: Decimal | None = None
    google_score: Decimal | None = None


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


def _validate_decimal_range(value: Decimal | None, *, field_label: str, minimum: Decimal, maximum: Decimal) -> None:
    if value is None:
        return
    if value < minimum or value > maximum:
        raise HTTPException(
            status_code=400,
            detail=f"{field_label} must be between {minimum} and {maximum}.",
        )


def _compute_gxi_score(google_score: Decimal | None, osat_score: Decimal | None) -> Decimal | None:
    if google_score is None or osat_score is None:
        return None
    google_percent = (google_score / Decimal("5")) * Decimal("100")
    return (google_percent * Decimal("0.8")) + (osat_score * Decimal("0.2"))


def _effective_gxi_score(kpi: BKDailyKpi | None) -> Decimal | None:
    if kpi is None:
        return None
    if kpi.gxi_score is not None:
        return kpi.gxi_score
    return _compute_gxi_score(kpi.google_score, kpi.osat_score)


@router.post("/upload")
def upload_bk_report(
    report_date: date = Form(...),
    restaurant_code: str = Form(...),
    comment: str | None = Form(None),
    heures_personnel: str | None = Form(None),
    heures_travail: str | None = Form(None),
    taux_horaire: str | None = Form(None),
    osat_score: str | None = Form(None),
    gxi_score: str | None = Form(None),
    google_score: str | None = Form(None),
    is_reimport: bool = Form(False),
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
    allowed_codes = {r.code for r in _user.restaurants}
    normalized_code = restaurant_code.strip().upper()
    if normalized_code not in allowed_codes:
        raise HTTPException(
            status_code=403,
            detail="Not allowed for this restaurant",
        )

    if report_date > date.today():
        raise HTTPException(status_code=400, detail="Report date cannot be in the future.")

    existing = (
        db.query(BKDailyReport)
        .filter(
            BKDailyReport.restaurant_code == normalized_code,
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
        restaurant_code=normalized_code,
        report_date=report_date,
        comment=comment.strip() if comment else None,
        imported_by_user_id=getattr(_user, "id", None),
        is_reimport=is_reimport,
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
    ca_drive = _sum_decimal(
        [r["ca_net"] for r in channel_rows if _is_group(r["channel_label"], "DRIVE")]
    )
    client_drive = _sum_int(
        [r["tac"] for r in channel_rows if _is_group(r["channel_label"], "DRIVE")]
    )
    ca_click_collect = _sum_decimal(
        [r["ca_net"] for r in channel_rows if _is_group(r["channel_label"], "CLICK & COLLECT")]
    )
    client_click_collect = _sum_int(
        [r["tac"] for r in channel_rows if _is_group(r["channel_label"], "CLICK & COLLECT")]
    )

    kpi_row = BKDailyKpi(
        report_id=report.id,
        ca_real=ca_real,
        clients=clients,
        ca_delivery=ca_delivery,
        client_delivery=client_delivery,
        ca_drive=ca_drive,
        client_drive=client_drive,
        ca_click_collect=ca_click_collect,
        client_click_collect=client_click_collect,
    )
    db.add(kpi_row)

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

    extra_kpi_values = {
        "heures_personnel": _parse_decimal(heures_personnel),
        "heures_travail": _parse_decimal(heures_travail),
        "taux_horaire": _parse_decimal(taux_horaire),
        "osat_score": _parse_decimal(osat_score),
        "gxi_score": _parse_decimal(gxi_score),
        "google_score": _parse_decimal(google_score),
    }
    _validate_decimal_range(
        extra_kpi_values["osat_score"],
        field_label="OSAT score",
        minimum=Decimal("0"),
        maximum=Decimal("100"),
    )
    _validate_decimal_range(
        extra_kpi_values["google_score"],
        field_label="Google score",
        minimum=Decimal("0"),
        maximum=Decimal("5"),
    )
    extra_kpi_values["gxi_score"] = _compute_gxi_score(
        extra_kpi_values["google_score"],
        extra_kpi_values["osat_score"],
    )

    restaurant = (
        db.query(Restaurant)
        .filter(Restaurant.code == normalized_code)
        .first()
    )
    if restaurant and restaurant.myrhis_id:
        client = MyRhisClient()
        try:
            plannings = client.get_restaurant_plannings(
                myrhis_id=restaurant.myrhis_id,
                date_value=report_date.isoformat(),
            )
            clockings = client.get_restaurant_clockings(
                myrhis_id=restaurant.myrhis_id,
                date_value=report_date.isoformat(),
            )
        except (MyRhisConfigError, MyRhisClientError) as exc:
            raise HTTPException(status_code=502, detail=f"MyRHIS labor sync failed: {exc}") from exc

        # For mapped restaurants, RH hours come from the raw MyRHIS planning/clocking payload.
        labor_summary = build_labor_summary(plannings=plannings, clockings=clockings)
        extra_kpi_values["heures_personnel"] = Decimal(str(labor_summary["actualHours"]))
        extra_kpi_values["heures_travail"] = Decimal(str(labor_summary["plannedHours"]))

    for key, value in extra_kpi_values.items():
        setattr(kpi_row, key, value)

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

    if user.role == Role.READONLY.value:
        allowed = [r.code for r in user.restaurants]
        if not allowed:
            return []
        query = query.filter(BKDailyReport.restaurant_code.in_(allowed))

    reports = (
        query.options(joinedload(BKDailyReport.imported_by))
        .order_by(BKDailyReport.report_date.desc(), BKDailyReport.restaurant_code.asc())
        .all()
    )

    return [
        {
            "id": report.id,
            "restaurant_code": report.restaurant_code,
            "report_date": report.report_date.isoformat(),
            "created_at": report.created_at.isoformat(),
            "comment": report.comment,
            "is_reimport": report.is_reimport,
            "imported_by": None
            if not report.imported_by
            else {
                "id": report.imported_by.id,
                "email": report.imported_by.email,
                "first_name": report.imported_by.first_name,
                "last_name": report.imported_by.last_name,
            },
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
    if user.role == Role.READONLY.value:
        allowed_restaurants = [r.code for r in user.restaurants]
        if not allowed_restaurants:
            return []

    query = (
        db.query(BKDailyReport)
        .options(
            joinedload(BKDailyReport.channel_sales),
            joinedload(BKDailyReport.kpi),
            joinedload(BKDailyReport.divers),
        )
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
        marge_total = sum(
            _safe_float(r.net_total_profit) for r in report.channel_sales if not r.is_total
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
        ca_drive = sum(
            _safe_float(r.ca_net)
            for r in report.channel_sales
            if not r.is_total and _is_group(r.channel_label, "DRIVE")
        )
        client_drive = sum(
            (r.tac or 0)
            for r in report.channel_sales
            if not r.is_total and _is_group(r.channel_label, "DRIVE")
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
        divers_row = report.divers[0] if report.divers else None
        pertes_montant = _safe_float(divers_row.montant_annulations) if divers_row else 0.0

        return {
            "ca_net_total": ca_net_total,
            "ca_ttc_total": ca_ttc_total,
            "marge_total": marge_total,
            "tac_total": tac_total,
            "ca_delivery": ca_delivery,
            "client_delivery": client_delivery,
            "ca_drive": ca_drive,
            "client_drive": client_drive,
            "ca_click_collect": ca_click_collect,
            "client_click_collect": client_click_collect,
            "pertes_montant": pertes_montant,
        }

    prev_year = year - 1
    prev_last_day = calendar.monthrange(prev_year, month)[1]
    prev_start = date(prev_year, month, 1)
    prev_end = date(prev_year, month, prev_last_day)

    prev_query = (
        db.query(BKDailyReport)
        .options(
            joinedload(BKDailyReport.channel_sales),
            joinedload(BKDailyReport.kpi),
            joinedload(BKDailyReport.divers),
        )
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

    prev_reports = prev_query.all()
    # Clé normalisée en majuscules pour matcher quel que soit la casse stockée
    prev_by_key: dict[tuple[str, date], BKDailyReport] = {
        (r.restaurant_code.upper(), r.report_date): r for r in prev_reports
    }

    # Calcul des totaux N-1 sur TOUT le mois (pas seulement les jours matchant N)
    # Utilisé par le frontend pour les KPI cards (comparaison mois entier vs mois entier)
    def _safe_float_val(v: Any) -> float:
        try:
            return float(v) if v is not None else 0.0
        except Exception:
            return 0.0

    period_n1_ca = 0.0
    period_n1_clients = 0
    period_n1_ca_delivery = 0.0
    period_n1_ca_drive = 0.0
    period_n1_ca_click_collect = 0.0
    period_n1_marge = 0.0
    period_n1_pertes_montant = 0.0
    period_n1_heures_personnel = 0.0
    period_n1_heures_travail = 0.0
    period_n1_taux_horaire_weighted = 0.0
    period_n1_taux_horaire_weight = 0.0
    period_n1_osat_total = 0.0
    period_n1_osat_count = 0
    period_n1_gxi_total = 0.0
    period_n1_gxi_count = 0
    period_n1_google_total = 0.0
    period_n1_google_count = 0
    prev_items_list: list[dict[str, Any]] = []
    for pr in prev_reports:
        pr_kpi = pr.kpi
        pr_vals = _calc_report_values(pr)
        pr_ca = _safe_float_val(
            pr_kpi.ca_real if pr_kpi and pr_kpi.ca_real is not None else pr_vals["ca_net_total"]
        )
        pr_clients = int(
            pr_kpi.clients if pr_kpi and pr_kpi.clients is not None else pr_vals["tac_total"]
        )
        pr_ca_delivery = _safe_float_val(
            pr_kpi.ca_delivery if pr_kpi and pr_kpi.ca_delivery is not None else pr_vals["ca_delivery"]
        )
        pr_ca_drive = _safe_float_val(
            pr_kpi.ca_drive if pr_kpi and pr_kpi.ca_drive is not None else pr_vals["ca_drive"]
        )
        pr_ca_click_collect = _safe_float_val(
            pr_kpi.ca_click_collect if pr_kpi and pr_kpi.ca_click_collect is not None else pr_vals["ca_click_collect"]
        )
        pr_marge = pr_vals["marge_total"]
        pr_pertes_montant = pr_vals["pertes_montant"]
        pr_heures_personnel = _safe_float_val(pr_kpi.heures_personnel) if pr_kpi and pr_kpi.heures_personnel is not None else None
        pr_heures_travail = _safe_float_val(pr_kpi.heures_travail) if pr_kpi and pr_kpi.heures_travail is not None else None
        pr_taux_horaire = _safe_float_val(pr_kpi.taux_horaire) if pr_kpi and pr_kpi.taux_horaire is not None else None
        pr_osat_score = _safe_float_val(pr_kpi.osat_score) if pr_kpi and pr_kpi.osat_score is not None else None
        pr_gxi_score = _safe_float_val(_effective_gxi_score(pr_kpi)) if _effective_gxi_score(pr_kpi) is not None else None
        pr_google_score = _safe_float_val(pr_kpi.google_score) if pr_kpi and pr_kpi.google_score is not None else None
        period_n1_ca += pr_ca
        period_n1_clients += pr_clients
        period_n1_ca_delivery += pr_ca_delivery
        period_n1_ca_drive += pr_ca_drive
        period_n1_ca_click_collect += pr_ca_click_collect
        period_n1_marge += pr_marge
        period_n1_pertes_montant += pr_pertes_montant
        if pr_heures_personnel is not None:
            period_n1_heures_personnel += pr_heures_personnel
        if pr_heures_travail is not None:
            period_n1_heures_travail += pr_heures_travail
        if pr_taux_horaire is not None:
            taux_weight = pr_heures_travail if pr_heures_travail and pr_heures_travail > 0 else 1.0
            period_n1_taux_horaire_weighted += pr_taux_horaire * taux_weight
            period_n1_taux_horaire_weight += taux_weight
        if pr_osat_score is not None:
            period_n1_osat_total += pr_osat_score
            period_n1_osat_count += 1
        if pr_gxi_score is not None:
            period_n1_gxi_total += pr_gxi_score
            period_n1_gxi_count += 1
        if pr_google_score is not None:
            period_n1_google_total += pr_google_score
            period_n1_google_count += 1
        prev_items_list.append({
            "restaurant_code": pr.restaurant_code,
            "report_date": pr.report_date.isoformat(),
            "ca": pr_ca,
            "clients": pr_clients,
            "ca_delivery": pr_ca_delivery,
            "ca_drive": pr_ca_drive,
            "ca_click_collect": pr_ca_click_collect,
            "marge": pr_marge,
            "pertes_montant": pr_pertes_montant,
            "heures_personnel": pr_heures_personnel,
            "heures_travail": pr_heures_travail,
            "taux_horaire_weighted": (pr_taux_horaire * (pr_heures_travail if pr_heures_travail and pr_heures_travail > 0 else 1.0))
            if pr_taux_horaire is not None
            else 0.0,
            "taux_horaire_weight": (pr_heures_travail if pr_heures_travail and pr_heures_travail > 0 else 1.0)
            if pr_taux_horaire is not None
            else 0.0,
            "osat_total": pr_osat_score or 0.0,
            "osat_count": 1 if pr_osat_score is not None else 0,
            "gxi_total": pr_gxi_score or 0.0,
            "gxi_count": 1 if pr_gxi_score is not None else 0,
            "google_total": pr_google_score or 0.0,
            "google_count": 1 if pr_google_score is not None else 0,
        })

    period_n1 = {
        "ca": period_n1_ca,
        "clients": period_n1_clients,
        "ca_delivery": period_n1_ca_delivery,
        "ca_drive": period_n1_ca_drive,
        "ca_click_collect": period_n1_ca_click_collect,
        "marge": period_n1_marge,
        "pertes_montant": period_n1_pertes_montant,
        "heures_personnel": period_n1_heures_personnel,
        "heures_travail": period_n1_heures_travail,
        "taux_horaire_weighted": period_n1_taux_horaire_weighted,
        "taux_horaire_weight": period_n1_taux_horaire_weight,
        "osat_total": period_n1_osat_total,
        "osat_count": period_n1_osat_count,
        "gxi_total": period_n1_gxi_total,
        "gxi_count": period_n1_gxi_count,
        "google_total": period_n1_google_total,
        "google_count": period_n1_google_count,
    }

    payload = []

    # Quand aucun import n'existe pour la période N, on génère des entrées
    # fantômes à partir des données N-1 afin que le frontend puisse afficher
    # la courbe de comparaison même avant le premier import du mois.
    if not reports and prev_reports:
        for prev_report in prev_reports:
            prev_values = _calc_report_values(prev_report)
            prev_kpi = prev_report.kpi
            prev_ca_real = (
                prev_kpi.ca_real
                if prev_kpi and prev_kpi.ca_real is not None
                else prev_values["ca_net_total"]
            )
            try:
                current_year_date = date(
                    year, prev_report.report_date.month, prev_report.report_date.day
                )
            except ValueError:
                continue
            payload.append(
                {
                    "id": None,
                    "restaurant_code": prev_report.restaurant_code,
                    "report_date": current_year_date.isoformat(),
                    "created_at": None,
                    "comment": None,
                    "comment_n1": prev_report.comment,
                    "ca_net_total": 0,
                    "ca_ttc_total": 0,
                    "marge": 0,
                    "taux_pertes": 0,
                    "pertes_montant": 0,
                    "marge_n1": prev_values["marge_total"],
                    "taux_pertes_n1": None,
                    "pertes_montant_n1": prev_values["pertes_montant"],
                    "tac_total": 0,
                    "kpi": {
                        "n1_ht": prev_ca_real,
                        "var_n1": None,
                        "prev_ht": None,
                        "ca_real": 0,
                        "clients": 0,
                        "clients_n1": prev_kpi.clients if prev_kpi else None,
                        "ca_delivery": 0,
                        "ca_delivery_n1": prev_kpi.ca_delivery if prev_kpi else prev_values["ca_delivery"],
                        "client_delivery": 0,
                        "client_delivery_n1": prev_kpi.client_delivery if prev_kpi else prev_values["client_delivery"],
                        "ca_click_collect": 0,
                        "cnc_n1": prev_kpi.ca_click_collect if prev_kpi else prev_values["ca_click_collect"],
                        "client_click_collect": 0,
                        "client_n1": prev_kpi.client_click_collect if prev_kpi else prev_values["client_click_collect"],
                        "cash_diff": None,
                        "heures_personnel": None,
                        "heures_personnel_n1": prev_kpi.heures_personnel if prev_kpi else None,
                        "heures_travail": None,
                        "heures_travail_n1": prev_kpi.heures_travail if prev_kpi else None,
                        "taux_horaire": None,
                        "taux_horaire_n1": prev_kpi.taux_horaire if prev_kpi else None,
                        "osat_score": None,
                        "osat_score_n1": prev_kpi.osat_score if prev_kpi else None,
                        "gxi_score": None,
                        "gxi_score_n1": _effective_gxi_score(prev_kpi),
                        "google_score": None,
                        "google_score_n1": prev_kpi.google_score if prev_kpi else None,
                    },
                }
            )
        return {"items": payload, "period_n1": period_n1, "prev_items": prev_items_list}

    for report in reports:
        values = _calc_report_values(report)
        ca_net_total = values["ca_net_total"]
        ca_ttc_total = values["ca_ttc_total"]
        marge_total = values["marge_total"]
        pertes_montant = values["pertes_montant"]
        tac_total = values["tac_total"]

        kpi = report.kpi
        ca_real = kpi.ca_real if kpi and kpi.ca_real is not None else ca_net_total
        ca_real_float = _safe_float(ca_real)
        clients = kpi.clients if kpi and kpi.clients is not None else tac_total

        prev_date = None
        try:
            prev_date = date(report.report_date.year - 1, report.report_date.month, report.report_date.day)
        except ValueError:
            prev_date = None

        prev_report = prev_by_key.get((report.restaurant_code.upper(), prev_date)) if prev_date else None
        prev_values = _calc_report_values(prev_report) if prev_report else None
        prev_kpi = prev_report.kpi if prev_report else None

        prev_ca_real = None
        prev_ca_real_float = 0.0
        prev_clients = None
        prev_ca_delivery = None
        prev_client_delivery = None
        prev_ca_drive = None
        prev_client_drive = None
        prev_ca_click_collect = None
        prev_client_click_collect = None
        prev_heures_personnel = None
        prev_heures_travail = None
        prev_taux_horaire = None
        prev_osat_score = None
        prev_gxi_score = None
        prev_google_score = None
        prev_marge_total = None
        prev_pertes_montant = None
        if prev_report:
            prev_ca_real = (
                prev_kpi.ca_real
                if prev_kpi and prev_kpi.ca_real is not None
                else prev_values["ca_net_total"]
            )
            prev_ca_real_float = _safe_float(prev_ca_real)
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
            prev_ca_drive = (
                prev_kpi.ca_drive
                if prev_kpi and prev_kpi.ca_drive is not None
                else prev_values["ca_drive"]
            )
            prev_client_drive = (
                prev_kpi.client_drive
                if prev_kpi and prev_kpi.client_drive is not None
                else prev_values["client_drive"]
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
            prev_heures_personnel = prev_kpi.heures_personnel if prev_kpi else None
            prev_heures_travail = prev_kpi.heures_travail if prev_kpi else None
            prev_taux_horaire = prev_kpi.taux_horaire if prev_kpi else None
            prev_osat_score = prev_kpi.osat_score if prev_kpi else None
            prev_gxi_score = _effective_gxi_score(prev_kpi)
            prev_google_score = prev_kpi.google_score if prev_kpi else None
            prev_marge_total = prev_values["marge_total"]
            prev_pertes_montant = prev_values["pertes_montant"]

        payload.append(
            {
                "id": report.id,
                "restaurant_code": report.restaurant_code,
                "report_date": report.report_date.isoformat(),
                "created_at": report.created_at.isoformat(),
                "comment": report.comment,
                "comment_n1": prev_report.comment if prev_report else None,
                "ca_net_total": ca_net_total,
                "ca_ttc_total": ca_ttc_total,
                "marge": marge_total,
                "taux_pertes": (pertes_montant / ca_real_float) if ca_real_float else 0.0,
                "pertes_montant": pertes_montant,
                "marge_n1": prev_marge_total,
                "taux_pertes_n1": (
                    (prev_pertes_montant / prev_ca_real_float)
                    if prev_pertes_montant is not None and prev_ca_real_float
                    else None
                ),
                "pertes_montant_n1": prev_pertes_montant,
                "tac_total": tac_total,
                "kpi": {
                    # Priorité aux vraies données N-1 depuis la BDD (prev_report).
                    # Les valeurs stockées dans le KPI (n1_ht, clients_n1…) ne servent
                    # que de fallback quand l'année précédente n'a pas encore été importée.
                    "n1_ht": prev_ca_real,
                    "var_n1": (
                        round((ca_real_float - prev_ca_real_float) / prev_ca_real_float, 6)
                        if prev_ca_real_float
                        else (kpi.var_n1 if kpi else None)
                    ),
                    "prev_ht": kpi.prev_ht if kpi else None,
                    "ca_real": ca_real,
                    "clients": clients,
                    "clients_n1": prev_clients,
                    "ca_delivery": kpi.ca_delivery if kpi and kpi.ca_delivery is not None else values["ca_delivery"],
                    "ca_delivery_n1": prev_ca_delivery,
                    "client_delivery": kpi.client_delivery if kpi and kpi.client_delivery is not None else values["client_delivery"],
                    "client_delivery_n1": prev_client_delivery,
                    "ca_drive": kpi.ca_drive if kpi and kpi.ca_drive is not None else values["ca_drive"],
                    "ca_drive_n1": prev_ca_drive,
                    "client_drive": kpi.client_drive if kpi and kpi.client_drive is not None else values["client_drive"],
                    "client_drive_n1": prev_client_drive,
                    "ca_click_collect": kpi.ca_click_collect if kpi and kpi.ca_click_collect is not None else values["ca_click_collect"],
                    "cnc_n1": prev_ca_click_collect,
                    "client_click_collect": kpi.client_click_collect if kpi and kpi.client_click_collect is not None else values["client_click_collect"],
                    "client_n1": prev_client_click_collect,
                    "cash_diff": kpi.cash_diff if kpi else None,
                    "heures_personnel": kpi.heures_personnel if kpi else None,
                    "heures_personnel_n1": prev_heures_personnel,
                    "heures_travail": kpi.heures_travail if kpi else None,
                    "heures_travail_n1": prev_heures_travail,
                    "taux_horaire": kpi.taux_horaire if kpi else None,
                    "taux_horaire_n1": prev_taux_horaire,
                    "osat_score": kpi.osat_score if kpi else None,
                    "osat_score_n1": prev_osat_score,
                    "gxi_score": _effective_gxi_score(kpi),
                    "gxi_score_n1": prev_gxi_score,
                    "google_score": kpi.google_score if kpi else None,
                    "google_score_n1": prev_google_score,
                },
            }
        )

    return {"items": payload, "period_n1": period_n1, "prev_items": prev_items_list}


@router.get("/{report_id}")
def get_bk_report(
    report_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.MANAGER, Role.ADMIN, Role.DEV, Role.READONLY])),
):
    report = db.query(BKDailyReport).filter(BKDailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if _user.role == Role.READONLY.value:
        allowed = {r.code for r in _user.restaurants}
        if report.restaurant_code not in allowed:
            raise HTTPException(status_code=403, detail="Not allowed for this restaurant")

    prev_comment = None
    try:
        prev_date = date(report.report_date.year - 1, report.report_date.month, report.report_date.day)
    except ValueError:
        prev_date = None
    if prev_date:
        prev_report = (
            db.query(BKDailyReport)
            .filter(
                BKDailyReport.restaurant_code == report.restaurant_code,
                BKDailyReport.report_date == prev_date,
            )
            .first()
        )
        if prev_report:
            prev_comment = prev_report.comment

    return {
        "id": report.id,
        "client_code": report.client_code,
        "restaurant_code": report.restaurant_code,
        "report_date": report.report_date.isoformat(),
        "created_at": report.created_at.isoformat(),
        "comment": report.comment,
        "comment_n1": prev_comment,
        "kpi": None
        if not report.kpi
        else {
            "n1_ht": prev_report.kpi.ca_real if prev_report and prev_report.kpi else None,
            "var_n1": report.kpi.var_n1,
            "prev_ht": report.kpi.prev_ht,
            "ca_real": report.kpi.ca_real,
            "clients": report.kpi.clients,
            "clients_n1": prev_report.kpi.clients if prev_report and prev_report.kpi else None,
            "ca_delivery": report.kpi.ca_delivery,
            "ca_delivery_n1": prev_report.kpi.ca_delivery if prev_report and prev_report.kpi else None,
            "client_delivery": report.kpi.client_delivery,
            "client_delivery_n1": prev_report.kpi.client_delivery if prev_report and prev_report.kpi else None,
            "ca_drive": report.kpi.ca_drive,
            "ca_drive_n1": prev_report.kpi.ca_drive if prev_report and prev_report.kpi else None,
            "client_drive": report.kpi.client_drive,
            "client_drive_n1": prev_report.kpi.client_drive if prev_report and prev_report.kpi else None,
            "ca_click_collect": report.kpi.ca_click_collect,
            "cnc_n1": prev_report.kpi.ca_click_collect if prev_report and prev_report.kpi else None,
            "client_click_collect": report.kpi.client_click_collect,
            "client_n1": prev_report.kpi.client_click_collect if prev_report and prev_report.kpi else None,
            "cash_diff": report.kpi.cash_diff,
            "heures_personnel": report.kpi.heures_personnel,
            "heures_travail": report.kpi.heures_travail,
            "taux_horaire": report.kpi.taux_horaire,
            "osat_score": report.kpi.osat_score,
            "gxi_score": _effective_gxi_score(report.kpi),
            "google_score": report.kpi.google_score,
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

    allowed_codes = {r.code for r in _user.restaurants}
    if report.restaurant_code not in allowed_codes:
        raise HTTPException(status_code=403, detail="Not allowed for this restaurant")

    if report.kpi is None:
        report.kpi = BKDailyKpi(report_id=report.id)

    report.kpi.var_n1 = payload.var_n1
    report.kpi.prev_ht = payload.prev_ht
    report.kpi.cash_diff = payload.cash_diff
    report.kpi.heures_personnel = payload.heures_personnel
    report.kpi.heures_travail = payload.heures_travail
    report.kpi.taux_horaire = payload.taux_horaire
    report.kpi.osat_score = payload.osat_score
    report.kpi.google_score = payload.google_score
    report.kpi.gxi_score = (
        payload.gxi_score
        if payload.gxi_score is not None
        else _compute_gxi_score(payload.google_score, payload.osat_score)
    )

    db.add(report)
    db.commit()

    return {"status": "ok"}


@router.delete("/{report_id}")
def delete_bk_report(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles([Role.ADMIN, Role.DEV, Role.MANAGER])),
):
    report = db.query(BKDailyReport).filter(BKDailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    allowed = {r.code for r in user.restaurants}
    if report.restaurant_code not in allowed:
        raise HTTPException(status_code=403, detail="Not allowed for this restaurant")

    db.delete(report)
    db.commit()
    return {"status": "deleted"}
