from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.calibration import (
    CalibrationConfigCreate,
    CalibrationConfigRead,
    CalibrationResultRead,
    RunLaunchRequest,
)
from app.schemas.runs import RunRead
from app.services import calibration_service


router = APIRouter()


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
    db: Session = Depends(get_db),
) -> RunRead:
    run = calibration_service.queue_calibration_run(db, config_id, payload)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Calibration config not found"
        )
    return run


@router.get("/runs/{run_id}/calibration-result", response_model=CalibrationResultRead)
def get_calibration_result(run_id: UUID, db: Session = Depends(get_db)) -> CalibrationResultRead:
    result = calibration_service.get_calibration_result(db, run_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Calibration result not found"
        )
    return result

