from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import CohortDashboardResponse, PatientTraceResponse, ScatterplotResponse
from app.services import analytics_service


router = APIRouter()


@router.get("/runs/{run_id}/scatterplot", response_model=ScatterplotResponse)
def get_scatterplot(
    run_id: UUID,
    x_metric: str,
    y_metric: str,
    db: Session = Depends(get_db),
) -> ScatterplotResponse:
    return analytics_service.build_scatterplot(db, run_id, x_metric, y_metric)


@router.get("/runs/{run_id}/cohort-dashboard", response_model=CohortDashboardResponse)
def get_cohort_dashboard(
    run_id: UUID,
    subgroup_key: str | None = None,
    db: Session = Depends(get_db),
) -> CohortDashboardResponse:
    return analytics_service.get_cohort_dashboard(db, run_id, subgroup_key)


@router.get("/runs/{run_id}/patients/{patient_index}/trace", response_model=PatientTraceResponse)
def get_patient_trace(
    run_id: UUID,
    patient_index: int,
    db: Session = Depends(get_db),
) -> PatientTraceResponse:
    return analytics_service.get_patient_trace(db, run_id, patient_index)

