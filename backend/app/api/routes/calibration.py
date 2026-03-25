from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.calibration import (
    CalibrationConfigCreate,
    CalibrationConfigRead,
    CalibrationResultRead,
    RunLaunchRequest,
)
from app.schemas.runs import RunRead
from app.services import calibration_service, job_service


router = APIRouter()
settings = get_settings()


@router.get(
    "/model-versions/{model_version_id}/calibration-configs",
    response_model=list[CalibrationConfigRead],
)
def list_calibration_configs(
    model_version_id: UUID,
    db: Session = Depends(get_db),
) -> list[CalibrationConfigRead]:
    return calibration_service.list_calibration_configs(db, model_version_id)


@router.post(
    "/model-versions/{model_version_id}/calibration-configs",
    response_model=CalibrationConfigRead,
    status_code=status.HTTP_201_CREATED,
)
def create_calibration_config(
    model_version_id: UUID,
    payload: CalibrationConfigCreate,
    db: Session = Depends(get_db),
) -> CalibrationConfigRead:
    return calibration_service.create_calibration_config(db, model_version_id, payload)


@router.post(
    "/calibration-configs/{config_id}/run",
    response_model=RunRead,
    status_code=status.HTTP_202_ACCEPTED,
)
def run_calibration(
    config_id: UUID,
    payload: RunLaunchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RunRead:
    run = calibration_service.queue_calibration_run(db, config_id, payload)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Calibration config not found"
        )
    job = job_service.create_job(
        db,
        job_type="calibration",
        resource_type="run",
        resource_id=run.id,
        payload_json={"run_id": str(run.id)},
    )
    run.summary_json = {
        **run.summary_json,
        "message": "Calibration queued",
        "job_id": str(job.id),
    }
    db.commit()
    db.refresh(run)
    if settings.async_jobs_auto_start:
        background_tasks.add_task(job_service.process_job_by_id, job.id)
    return run


@router.get("/runs/{run_id}/calibration-result", response_model=CalibrationResultRead)
def get_calibration_result(run_id: UUID, db: Session = Depends(get_db)) -> CalibrationResultRead:
    result = calibration_service.get_calibration_result(db, run_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Calibration result not found"
        )
    return result
