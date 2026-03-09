from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel

from app.api.auth_deps import require_roles
from app.core.roles import Role
from app.integrations.myrhis.client import (
    MyRhisClient,
    MyRhisClientError,
    MyRhisConfigError,
    MyRhisNotFoundError,
)
from app.integrations.myrhis.labor import build_labor_summary

router = APIRouter(prefix="/external/myrhis", tags=["external-myrhis"])


class MyRhisRestaurantOut(BaseModel):
    myrhis_id: int
    name: str


@router.get("/restaurants/{myrhis_id}", response_model=MyRhisRestaurantOut)
def get_restaurant_by_myrhis_id(
    myrhis_id: int = Path(..., ge=1),
    _user=Depends(require_roles([Role.DEV])),
):
    # This route is an adapter between the frontend and MyRHIS.
    # Keeping it isolated avoids mixing external API concerns into our internal restaurant routes.
    client = MyRhisClient()
    try:
        payload = client.get_restaurant_by_id(myrhis_id)
    except MyRhisConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MyRhisNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except MyRhisClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return MyRhisRestaurantOut(**payload)


@router.get("/restaurants/{myrhis_id}/labor-debug")
def get_restaurant_labor_debug(
    myrhis_id: int = Path(..., ge=1),
    date_value: str = Query(..., alias="date"),
    _user=Depends(require_roles([Role.DEV])),
) -> dict[str, Any]:
    client = MyRhisClient()
    try:
        plannings = client.get_restaurant_plannings(myrhis_id=myrhis_id, date_value=date_value)
        clockings = client.get_restaurant_clockings(myrhis_id=myrhis_id, date_value=date_value)
    except MyRhisConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MyRhisClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "myrhis_id": myrhis_id,
        "date": date_value,
        "plannings": plannings,
        "clockings": clockings,
    }


@router.get("/restaurants/{myrhis_id}/labor-summary")
def get_restaurant_labor_summary(
    myrhis_id: int = Path(..., ge=1),
    date_value: str = Query(..., alias="date"),
    _user=Depends(require_roles([Role.DEV, Role.ADMIN, Role.MANAGER])),
) -> dict[str, Any]:
    client = MyRhisClient()
    try:
        plannings = client.get_restaurant_plannings(myrhis_id=myrhis_id, date_value=date_value)
        clockings = client.get_restaurant_clockings(myrhis_id=myrhis_id, date_value=date_value)
    except MyRhisConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MyRhisClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    summary = build_labor_summary(plannings=plannings, clockings=clockings)
    return {"myrhis_id": myrhis_id, "date": date_value, **summary}
