from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ArtifactRead, MetricCatalogRead
from app.schemas.runs import RunCreate, RunRead
from app.services import run_service


router = APIRouter()


@router.post(
    "/model-versions/{model_version_id}/runs",
    response_model=RunRead,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_run(
    model_version_id: UUID,
    payload: RunCreate,
    db: Session = Depends(get_db),
) -> RunRead:
    return run_service.queue_run(db, model_version_id, payload)


@router.get("/runs/{run_id}", response_model=RunRead)
def get_run(run_id: UUID, db: Session = Depends(get_db)) -> RunRead:
    run = run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run


@router.get("/runs/{run_id}/artifacts", response_model=list[ArtifactRead])
def list_run_artifacts(run_id: UUID, db: Session = Depends(get_db)) -> list[ArtifactRead]:
    return run_service.list_artifacts(db, run_id)


@router.get("/runs/{run_id}/metrics", response_model=list[MetricCatalogRead])
def list_run_metrics(run_id: UUID, db: Session = Depends(get_db)) -> list[MetricCatalogRead]:
    return run_service.list_metric_catalog(db, run_id)

