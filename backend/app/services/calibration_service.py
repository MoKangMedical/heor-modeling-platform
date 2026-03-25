import hashlib
import json
import math
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import (
    AsyncJob,
    CalibrationConfig,
    CalibrationParameter,
    CalibrationResult,
    Run,
    RunArtifact,
)
from app.models.evidence import ClinicalSeries, ProbabilityFunction
from app.schemas.calibration import CalibrationConfigCreate, RunLaunchRequest
from app.schemas.runs import RunCreate
from app.services import solver_service
from app.services.run_service import create_queued_run, get_run


SUPPORTED_PARAMETER_CODES = {
    "event_scale",
    "pf_death_probability",
    "pd_death_probability",
}


def list_calibration_configs(db: Session, model_version_id: UUID) -> list[CalibrationConfig]:
    stmt = (
        select(CalibrationConfig)
        .where(CalibrationConfig.model_version_id == model_version_id)
        .order_by(CalibrationConfig.created_at.desc())
    )
    return list(db.scalars(stmt).all())


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


def queue_calibration_run(db: Session, config_id: UUID, payload: RunLaunchRequest) -> Run | None:
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
    run = create_queued_run(db, config.model_version_id, run_payload)
    db.commit()
    db.refresh(run)
    return run


def execute_calibration_job(db: Session, job: AsyncJob) -> dict:
    run_id = UUID(str(job.payload_json["run_id"]))
    run = get_run(db, run_id)
    if not run:
        raise ValueError("Run not found for calibration job")

    calibration_config_id = UUID(str(run.config_json["calibration_config_id"]))
    calibration_config = get_calibration_config(db, calibration_config_id)
    if not calibration_config:
        raise ValueError("Calibration config not found")

    target_series = db.scalar(
        select(ClinicalSeries).where(ClinicalSeries.id == calibration_config.target_series_id)
    )
    if not target_series:
        raise ValueError("Calibration target series not found")

    probability_function = _resolve_probability_function(db, run.model_version_id, run.config_json)
    config = solver_service.normalize_run_config(probability_function, run.config_json)
    target_points = _extract_target_points(target_series)
    if not target_points:
        raise ValueError("Calibration target series has no usable estimate values")

    max_time = max(point["time"] for point in target_points)
    config["cycles"] = max(int(config["cycles"]), math.ceil(max_time / float(config["cycle_length"])))

    run.status = "running"
    run.started_at = datetime.now(UTC)
    run.summary_json = {
        "message": "Calibration is running",
        "job_id": str(job.id),
        "calibration_config_id": str(calibration_config.id),
    }
    db.commit()

    candidate_history = []
    best_result = None
    for iteration, params in enumerate(_generate_candidates(calibration_config.parameters, calibration_config.max_iterations), start=1):
        candidate = _evaluate_candidate(
            db,
            probability_function=probability_function,
            base_config=config,
            target_points=target_points,
            parameter_values=params,
        )
        candidate["iteration"] = iteration
        candidate_history.append(candidate)
        if not best_result or candidate["objective"] < best_result["objective"]:
            best_result = candidate

    if not best_result:
        raise ValueError("Calibration did not evaluate any candidates")

    overlay_artifact = _create_overlay_artifact(db, run.id, target_points, best_result)
    _upsert_calibration_result(db, run.id, calibration_config.id, best_result, candidate_history, overlay_artifact.id)

    run.status = "completed"
    run.finished_at = datetime.now(UTC)
    run.summary_json = {
        "message": "Calibration completed",
        "job_id": str(job.id),
        "calibration_config_id": str(calibration_config.id),
        "cards": [
            {"label": "Best RMSE", "value": best_result["objective"], "unit": "RMSE"},
            {"label": "Iterations", "value": len(candidate_history), "unit": "candidates"},
            {"label": "Target Series", "value": target_series.name, "unit": "series"},
            {"label": "Best Event Scale", "value": best_result["parameter_values"].get("event_scale", 1.0), "unit": "scale"},
        ],
        "best_params": best_result["parameter_values"],
    }
    db.commit()
    return {
        "run_id": str(run.id),
        "calibration_config_id": str(calibration_config.id),
        "overlay_artifact_id": str(overlay_artifact.id),
        "best_objective_value": best_result["objective"],
    }


def get_calibration_result(db: Session, run_id: UUID) -> CalibrationResult | None:
    stmt = select(CalibrationResult).where(CalibrationResult.run_id == run_id)
    return db.scalar(stmt)


def _resolve_probability_function(
    db: Session,
    model_version_id: UUID,
    config_json: dict,
) -> ProbabilityFunction:
    configured_id = config_json.get("probability_function_id")
    if configured_id:
        probability_function = db.scalar(
            select(ProbabilityFunction).where(ProbabilityFunction.id == UUID(str(configured_id)))
        )
    else:
        probability_function = db.scalar(
            select(ProbabilityFunction)
            .where(ProbabilityFunction.model_version_id == model_version_id)
            .order_by(ProbabilityFunction.created_at.desc())
        )
    if not probability_function:
        raise ValueError("Probability function not found for calibration")
    return probability_function


def _extract_target_points(series: ClinicalSeries) -> list[dict]:
    return [
        {"time": float(point.time_value), "estimate": float(point.estimate_value)}
        for point in sorted(series.points, key=lambda item: (item.seq_no, item.time_value))
        if point.estimate_value is not None
    ]


def _generate_candidates(
    parameters: list[CalibrationParameter],
    max_iterations: int,
) -> list[dict]:
    supported = [parameter for parameter in parameters if parameter.parameter_code in SUPPORTED_PARAMETER_CODES]
    if not supported:
        return [{"event_scale": 1.0}]

    candidates = []
    for iteration in range(max_iterations):
        parameter_values = {}
        for index, parameter in enumerate(supported):
            lower = float(parameter.lower_bound)
            upper = float(parameter.upper_bound)
            if parameter.is_fixed:
                parameter_values[parameter.parameter_code] = float(parameter.initial_value or lower)
                continue

            if iteration == 0 and parameter.initial_value is not None:
                value = float(parameter.initial_value)
            else:
                fraction = (((iteration * (index + 2)) + (index * 3)) % max_iterations + 0.5) / max_iterations
                value = lower + ((upper - lower) * fraction)
            parameter_values[parameter.parameter_code] = round(min(max(value, lower), upper), 6)

        candidates.append(parameter_values)
    return candidates


def _evaluate_candidate(
    db: Session,
    *,
    probability_function: ProbabilityFunction,
    base_config: dict,
    target_points: list[dict],
    parameter_values: dict,
) -> dict:
    config = {**base_config}
    sample_params = {
        "event_scale": float(parameter_values.get("event_scale", 1.0)),
        "pf_cost_mult": 1.0,
        "pd_cost_mult": 1.0,
        "utility_shift": 0.0,
    }
    if "pf_death_probability" in parameter_values:
        config["pf_death_probability"] = float(parameter_values["pf_death_probability"])
    if "pd_death_probability" in parameter_values:
        config["pd_death_probability"] = float(parameter_values["pd_death_probability"])

    result = solver_service.simulate_sample(
        db,
        probability_function=probability_function,
        config=config,
        sample_index=0,
        sample_params=sample_params,
    )
    predicted_points = [
        {
            "time": point["time"],
            "estimate": solver_service.interpolate_series(result["survival_points"], point["time"], "alive_probability"),
        }
        for point in target_points
    ]
    squared_errors = [
        (target["estimate"] - predicted["estimate"]) ** 2
        for target, predicted in zip(target_points, predicted_points, strict=False)
    ]
    rmse = math.sqrt(sum(squared_errors) / max(len(squared_errors), 1))
    return {
        "objective": round(rmse, 8),
        "parameter_values": parameter_values,
        "predicted_points": predicted_points,
        "survival_points": result["survival_points"],
        "config": config,
    }


def _create_overlay_artifact(
    db: Session,
    run_id: UUID,
    target_points: list[dict],
    best_result: dict,
) -> RunArtifact:
    metadata_json = {
        "observed_points": target_points,
        "predicted_points": best_result["predicted_points"],
        "full_predicted_curve": best_result["survival_points"],
        "best_params": best_result["parameter_values"],
        "best_objective_value": best_result["objective"],
    }
    artifact = RunArtifact(
        run_id=run_id,
        artifact_type="calibration-overlay",
        storage_uri="inline://calibration-overlay",
        checksum=_checksum_payload(metadata_json),
        metadata_json=metadata_json,
    )
    db.add(artifact)
    db.flush()
    return artifact


def _upsert_calibration_result(
    db: Session,
    run_id: UUID,
    calibration_config_id: UUID,
    best_result: dict,
    history: list[dict],
    overlay_artifact_id: UUID,
) -> None:
    existing = get_calibration_result(db, run_id)
    diagnostics_json = {
        "history": history[: min(len(history), 40)],
        "optimizer_type": "deterministic_grid",
    }
    if existing:
        existing.convergence_status = "completed"
        existing.best_objective_value = best_result["objective"]
        existing.best_params_json = best_result["parameter_values"]
        existing.diagnostics_json = diagnostics_json
        existing.overlay_artifact_id = overlay_artifact_id
        return

    db.add(
        CalibrationResult(
            run_id=run_id,
            calibration_config_id=calibration_config_id,
            convergence_status="completed",
            best_objective_value=best_result["objective"],
            best_params_json=best_result["parameter_values"],
            diagnostics_json=diagnostics_json,
            overlay_artifact_id=overlay_artifact_id,
        )
    )


def _checksum_payload(payload: dict) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
