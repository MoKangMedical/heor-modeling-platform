from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.common import ArtifactRead, MetricCatalogRead
from app.schemas.runs import RunCreate, RunRead
from app.services import job_service, run_service


router = APIRouter()
settings = get_settings()


@router.get("/model-versions/{model_version_id}/runs", response_model=list[RunRead])
def list_runs(model_version_id: UUID, db: Session = Depends(get_db)) -> list[RunRead]:
    return run_service.list_runs(db, model_version_id)


@router.post(
    "/model-versions/{model_version_id}/runs",
    response_model=RunRead,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_run(
    model_version_id: UUID,
    payload: RunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RunRead:
    run = run_service.create_queued_run(db, model_version_id, payload)
    job = job_service.create_job(
        db,
        job_type="run",
        resource_type="run",
        resource_id=run.id,
        payload_json={"run_id": str(run.id)},
    )
    run.summary_json = {
        **run.summary_json,
        "message": "Run queued",
        "job_id": str(job.id),
    }
    db.commit()
    db.refresh(run)

    if settings.async_jobs_auto_start:
        background_tasks.add_task(job_service.process_job_by_id, job.id)
    return run


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
