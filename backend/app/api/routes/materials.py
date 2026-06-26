from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.domain.materials import SUPPORTED_VERSIONS
from app.services.material_repository import MaterialRepository

router = APIRouter(prefix="/materials", tags=["materials"])


def get_repository() -> MaterialRepository:
    # Lazy global repository; version chosen per-request via query param.
    return MaterialRepository(version="1.20.1")


@router.get("", response_model_exclude_none=True)
def list_materials(version: str = Query("1.20.1", description="Minecraft data version")):
    if version not in SUPPORTED_VERSIONS:
        raise HTTPException(status_code=400, detail=f"unsupported version {version}")
    repo = MaterialRepository(version=version)
    return repo.list_materials()


@router.get("/versions")
def supported_versions() -> dict:
    return {"versions": SUPPORTED_VERSIONS, "default": "1.20.1"}


@router.post("/refresh")
def refresh_database(version: str = Query("1.20.1")) -> dict:
    if version not in SUPPORTED_VERSIONS:
        raise HTTPException(status_code=400, detail=f"unsupported version {version}")
    repo = MaterialRepository(version=version)
    try:
        count = repo.refresh()
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"version": version, "count": count, "refreshed": True}
