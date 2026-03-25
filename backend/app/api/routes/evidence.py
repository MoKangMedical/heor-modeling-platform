from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.evidence import (
    ClinicalSeriesCreate,
    ClinicalSeriesRead,
    CompoundCurveCreate,
    CompoundCurveRead,
)
from app.services import evidence_service


router = APIRouter()
lookup_router = APIRouter()


@router.get("/{project_id}/clinical-series", response_model=list[ClinicalSeriesRead])
def list_clinical_series(project_id: UUID, db: Session = Depends(get_db)) -> list[ClinicalSeriesRead]:
    return evidence_service.list_clinical_series(db, project_id)


@router.post(
    "/{project_id}/clinical-series",
    response_model=ClinicalSeriesRead,
    status_code=status.HTTP_201_CREATED,
)
def create_clinical_series(
    project_id: UUID,
    payload: ClinicalSeriesCreate,
    db: Session = Depends(get_db),
) -> ClinicalSeriesRead:
    return evidence_service.create_clinical_series(db, project_id, payload)


@lookup_router.get("/clinical-series/{series_id}", response_model=ClinicalSeriesRead)
def get_clinical_series(series_id: UUID, db: Session = Depends(get_db)) -> ClinicalSeriesRead:
    series = evidence_service.get_clinical_series(db, series_id)
    if not series:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinical series not found")
    return series


@router.post(
    "/{project_id}/compound-curves",
    response_model=CompoundCurveRead,
    status_code=status.HTTP_201_CREATED,
)
def create_compound_curve(
    project_id: UUID,
    payload: CompoundCurveCreate,
    db: Session = Depends(get_db),
) -> CompoundCurveRead:
    return evidence_service.create_compound_curve(db, project_id, payload)


@lookup_router.get("/compound-curves/{curve_id}", response_model=CompoundCurveRead)
def get_compound_curve(curve_id: UUID, db: Session = Depends(get_db)) -> CompoundCurveRead:
    curve = evidence_service.get_compound_curve(db, curve_id)
    if not curve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compound curve not found")
    return curve
