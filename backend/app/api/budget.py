"""Budget journalier : import CSV + lecture."""

import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.auth_deps import get_current_user, require_roles
from app.api.deps import get_db
from app.core.roles import Role
from app.models.budget import BudgetDaily
from app.models.restaurant import Restaurant

router = APIRouter(prefix="/budget", tags=["budget"])

_ALLOWED_ROLES = [Role.MANAGER, Role.ADMIN, Role.DEV]


def _parse_decimal(value: str) -> Decimal | None:
    """Accepte virgule ou point comme séparateur décimal."""
    try:
        return Decimal(value.strip().replace(",", "."))
    except (InvalidOperation, AttributeError):
        return None


@router.post("/import")
def import_budget_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(_ALLOWED_ROLES)),
):
    """
    Importe un CSV de budget journalier.

    Format attendu (séparateur ; ou ,) :
        date;restaurant_code;ca_target
        2026-03-01;TLS-AA;10000
        2026-03-02;TLS-AA;11500.50
    """
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Fichier vide.")

    text = raw.decode("utf-8-sig", errors="replace")
    # Détection automatique du séparateur
    delimiter = ";" if ";" in text.split("\n")[0] else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV invalide ou vide.")

    # Normalise les noms de colonnes
    fieldnames = [f.strip().lower() for f in reader.fieldnames]
    required = {"date", "restaurant_code", "ca_target"}
    if not required.issubset(set(fieldnames)):
        raise HTTPException(
            status_code=400,
            detail=f"Colonnes requises : date, restaurant_code, ca_target. Trouvé : {reader.fieldnames}",
        )

    # Codes restaurants autorisés pour cet utilisateur
    allowed_codes: set[str] | None = None
    if _user.role not in (Role.DEV.value, Role.ADMIN.value):
        allowed_codes = {r.code for r in _user.restaurants}

    inserted = 0
    updated = 0
    errors: list[str] = []

    for i, raw_row in enumerate(reader, start=2):
        # Normalise les clés
        row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}

        raw_date = row.get("date", "")
        raw_code = row.get("restaurant_code", "").strip().upper()
        raw_target = row.get("ca_target", "")

        # Validation date
        try:
            budget_date = date.fromisoformat(raw_date)
        except ValueError:
            errors.append(f"Ligne {i} : date invalide '{raw_date}'")
            continue

        # Validation restaurant
        if not raw_code:
            errors.append(f"Ligne {i} : restaurant_code vide")
            continue
        if allowed_codes is not None and raw_code not in allowed_codes:
            errors.append(f"Ligne {i} : restaurant '{raw_code}' non autorisé")
            continue

        # Validation CA
        ca_target = _parse_decimal(raw_target)
        if ca_target is None or ca_target < 0:
            errors.append(f"Ligne {i} : ca_target invalide '{raw_target}'")
            continue

        # Upsert
        existing = (
            db.query(BudgetDaily)
            .filter(
                BudgetDaily.restaurant_code == raw_code,
                BudgetDaily.budget_date == budget_date,
            )
            .first()
        )
        if existing:
            existing.ca_target = ca_target
            updated += 1
        else:
            db.add(
                BudgetDaily(
                    restaurant_code=raw_code,
                    budget_date=budget_date,
                    ca_target=ca_target,
                    created_by_user_id=getattr(_user, "id", None),
                )
            )
            inserted += 1

    if errors and inserted == 0 and updated == 0:
        raise HTTPException(status_code=400, detail={"errors": errors})

    db.commit()
    return {"inserted": inserted, "updated": updated, "errors": errors}


@router.get("/")
def get_budget(
    date_from: date = Query(...),
    date_to: date = Query(...),
    restaurant_code: str | None = Query(None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles(_ALLOWED_ROLES)),
):
    """
    Retourne les entrées de budget pour une période et optionnellement un restaurant.
    """
    allowed_codes: set[str] | None = None
    if _user.role not in (Role.DEV.value, Role.ADMIN.value):
        allowed_codes = {r.code for r in _user.restaurants}

    query = db.query(BudgetDaily).filter(
        BudgetDaily.budget_date >= date_from,
        BudgetDaily.budget_date <= date_to,
    )

    if restaurant_code:
        code = restaurant_code.strip().upper()
        if allowed_codes is not None and code not in allowed_codes:
            raise HTTPException(status_code=403, detail="Restaurant non autorisé.")
        query = query.filter(BudgetDaily.restaurant_code == code)
    elif allowed_codes is not None:
        query = query.filter(BudgetDaily.restaurant_code.in_(allowed_codes))

    rows = query.order_by(BudgetDaily.budget_date.asc(), BudgetDaily.restaurant_code.asc()).all()

    return [
        {
            "id": r.id,
            "restaurant_code": r.restaurant_code,
            "budget_date": r.budget_date.isoformat(),
            "ca_target": float(r.ca_target),
        }
        for r in rows
    ]


@router.delete("/")
def delete_budget(
    date_from: date = Query(...),
    date_to: date = Query(...),
    restaurant_code: str | None = Query(None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles([Role.ADMIN, Role.DEV])),
):
    """Supprime les entrées de budget pour une période (ADMIN/DEV uniquement)."""
    query = db.query(BudgetDaily).filter(
        BudgetDaily.budget_date >= date_from,
        BudgetDaily.budget_date <= date_to,
    )
    if restaurant_code:
        query = query.filter(BudgetDaily.restaurant_code == restaurant_code.strip().upper())

    count = query.count()
    query.delete(synchronize_session=False)
    db.commit()
    return {"deleted": count}
