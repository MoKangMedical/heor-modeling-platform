from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import CalibrationConfig, CalibrationParameter, CalibrationResult
from app.schemas.calibration import CalibrationConfigCreate, RunLaunchRequest
from app.schemas.runs import RunCreate
from app.services.run_service import queue_run


def create_calibration_config(
    db: Session, model_version_id: UUID, payload: CalibrationConfigCreate
) -> CalibrationConfig:
    config = CalibrationConfig(
        model_version_id=model_version_id,
        name=payload.name,
        target_series_id=payload.target_series_id,
        objective_type=payload.objective_type,
        optimizer_type=payload.optimizer_type,
        max_iterations=payload.max_iterations,
        config_json=payload.config_json,
    )
    db.add(config)
    db.flush()

    for parameter in payload.parameters:
        db.add(
            CalibrationParameter(
                calibration_config_id=config.id,
                parameter_code=parameter.parameter_code,
                lower_bound=parameter.lower_bound,
                upper_bound=parameter.upper_bound,
                initial_value=parameter.initial_value,
                transform_type=parameter.transform_type,
                is_fixed=parameter.is_fixed,
            )
        )

    db.commit()
    db.refresh(config)
    return config


def get_calibration_config(db: Session, config_id: UUID) -> CalibrationConfig | None:
    stmt = select(CalibrationConfig).where(CalibrationConfig.id == config_id)
    return db.scalar(stmt)


def queue_calibration_run(db: Session, config_id: UUID, payload: RunLaunchRequest):
    config = get_calibration_config(db, config_id)
    if not config:
        return None

    run_payload = RunCreate(
        project_id=payload.project_id,
        analysis_type="calibration",
        random_seed=payload.random_seed,
        input_snapshot_json=payload.input_snapshot_json,
        config_json={"calibration_config_id": str(config_id), **payload.config_json},
    )
    return queue_run(db, config.model_version_id, run_payload)


def get_calibration_result(db: Session, run_id: UUID) -> CalibrationResult | None:
    stmt = select(CalibrationResult).where(CalibrationResult.run_id == run_id)
    return db.scalar(stmt)

