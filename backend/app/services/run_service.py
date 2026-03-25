import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import (
    AsyncJob,
    CohortAggregate,
    PatientEntity,
    PatientStateEvent,
    Run,
    RunArtifact,
    RunMetricCatalog,
    RunMetricValue,
)
from app.models.evidence import ProbabilityFunction
from app.schemas.runs import RunCreate
from app.services import solver_service


ENGINE_VERSION = "demo-async-0.2.0"
DEFAULT_RANDOM_SEED = 20260325


def create_queued_run(db: Session, model_version_id: UUID, payload: RunCreate) -> Run:
    run = Run(
        project_id=payload.project_id,
        model_version_id=model_version_id,
        analysis_type=payload.analysis_type,
        template_id=payload.template_id,
        status="queued",
        engine_version=ENGINE_VERSION,
        random_seed=payload.random_seed or DEFAULT_RANDOM_SEED,
        sampling_method=payload.sampling_method,
        input_snapshot_json=payload.input_snapshot_json,
        config_json=payload.config_json,
        summary_json={"message": "Run queued"},
    )
    db.add(run)
    db.flush()
    return run


def queue_run(db: Session, model_version_id: UUID, payload: RunCreate) -> Run:
    run = create_queued_run(db, model_version_id, payload)
    db.commit()
    db.refresh(run)
    return run


def execute_run_job(db: Session, job: AsyncJob) -> dict:
    run_id = UUID(str(job.payload_json["run_id"]))
    run = get_run(db, run_id)
    if not run:
        raise ValueError("Run not found for queued job")

    run.status = "running"
    run.started_at = datetime.now(UTC)
    run.summary_json = {
        **run.summary_json,
        "message": "Run is processing",
        "job_id": str(job.id),
    }
    db.commit()

    probability_function = _resolve_probability_function(db, run.model_version_id, run.config_json)
    normalized_config = solver_service.normalize_run_config(probability_function, run.config_json)
    sample_results, base_result = _execute_samples(
        db,
        probability_function=probability_function,
        random_seed=run.random_seed or DEFAULT_RANDOM_SEED,
        sampling_method=run.sampling_method,
        config=normalized_config,
    )

    run.status = "completed"
    run.summary_json = _build_summary(run, job.id, probability_function, normalized_config, sample_results, base_result)
    run.input_snapshot_json = {
        **run.input_snapshot_json,
        "probability_function_id": str(probability_function.id),
        "source_ref_id": str(probability_function.source_ref_id),
        "cycle_length": float(probability_function.cycle_length),
        "sample_size": normalized_config["sample_size"],
    }
    run.finished_at = datetime.now(UTC)

    _delete_previous_results(db, run.id)
    _persist_metrics(db, run, sample_results)
    _persist_cohort_aggregates(db, run, base_result["cohort_points"])
    _persist_patient_traces(
        db,
        run,
        base_probabilities=base_result["interval_probabilities"],
        config=normalized_config,
        random_seed=(run.random_seed or DEFAULT_RANDOM_SEED) + 99,
    )
    artifact_ids = _persist_artifacts(db, run, probability_function, normalized_config, base_result)
    db.commit()
    return {
        "run_id": str(run.id),
        "artifact_ids": artifact_ids,
        "status": run.status,
    }


def get_run(db: Session, run_id: UUID) -> Run | None:
    stmt = select(Run).where(Run.id == run_id)
    return db.scalar(stmt)


def list_runs(db: Session, model_version_id: UUID) -> list[Run]:
    stmt = (
        select(Run)
        .where(Run.model_version_id == model_version_id)
        .order_by(Run.submitted_at.desc())
    )
    return list(db.scalars(stmt).all())


def list_artifacts(db: Session, run_id: UUID) -> list[RunArtifact]:
    stmt = select(RunArtifact).where(RunArtifact.run_id == run_id).order_by(RunArtifact.created_at.asc())
    return list(db.scalars(stmt).all())


def list_metric_catalog(db: Session, run_id: UUID) -> list[RunMetricCatalog]:
    stmt = select(RunMetricCatalog).where(RunMetricCatalog.run_id == run_id).order_by(
        RunMetricCatalog.metric_key.asc()
    )
    return list(db.scalars(stmt).all())


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
        raise ValueError("No probability function is available for this model version")
    return probability_function


def _execute_samples(
    db: Session,
    probability_function: ProbabilityFunction,
    random_seed: int,
    sampling_method: str | None,
    config: dict,
) -> tuple[list[dict], dict]:
    parameter_samples = solver_service.build_parameter_samples(
        int(config["sample_size"]),
        sampling_method,
        random_seed,
    )
    sample_results = []
    for sample_index, sample_params in enumerate(parameter_samples):
        sample_results.append(
            solver_service.simulate_sample(
                db,
                probability_function=probability_function,
                config=config,
                sample_index=sample_index,
                sample_params=sample_params,
            )
        )
    return sample_results, sample_results[0]


def _build_summary(
    run: Run,
    job_id: UUID,
    probability_function: ProbabilityFunction,
    config: dict,
    sample_results: list[dict],
    base_result: dict,
) -> dict:
    mean_cost = sum(result["metrics"]["total_cost"] for result in sample_results) / len(sample_results)
    mean_qalys = sum(result["metrics"]["total_qalys"] for result in sample_results) / len(sample_results)
    mean_lys = sum(result["metrics"]["life_years"] for result in sample_results) / len(sample_results)

    return {
        "run_id": str(run.id),
        "job_id": str(job_id),
        "analysis_type": run.analysis_type,
        "sample_size": len(sample_results),
        "sampling_method": run.sampling_method or "random",
        "probability_function_id": str(probability_function.id),
        "cards": [
            {"label": "Base Cost", "value": base_result["metrics"]["total_cost"], "unit": "USD per patient"},
            {"label": "Base QALYs", "value": base_result["metrics"]["total_qalys"], "unit": "QALYs"},
            {"label": "Base Life Years", "value": base_result["metrics"]["life_years"], "unit": "LYs"},
            {
                "label": "Mean Event Probability",
                "value": base_result["metrics"]["mean_transition_probability"],
                "unit": "probability",
            },
        ],
        "base_metrics": base_result["metrics"],
        "mean_metrics": {
            "total_cost": round(mean_cost, 4),
            "total_qalys": round(mean_qalys, 4),
            "life_years": round(mean_lys, 4),
        },
        "config": config,
    }


def _delete_previous_results(db: Session, run_id: UUID) -> None:
    for artifact in list_artifacts(db, run_id):
        db.delete(artifact)
    for metric in list_metric_catalog(db, run_id):
        db.delete(metric)
    for row in db.scalars(select(CohortAggregate).where(CohortAggregate.run_id == run_id)).all():
        db.delete(row)
    for row in db.scalars(select(PatientEntity).where(PatientEntity.run_id == run_id)).all():
        db.delete(row)
    for row in db.scalars(select(PatientStateEvent).where(PatientStateEvent.run_id == run_id)).all():
        db.delete(row)
    db.flush()


def _persist_metrics(db: Session, run: Run, sample_results: list[dict]) -> None:
    metric_definitions = [
        ("total_cost", "Total Cost", "run", "numeric", "USD per patient"),
        ("total_qalys", "Total QALYs", "run", "numeric", "QALYs"),
        ("life_years", "Life Years", "run", "numeric", "LYs"),
        ("deaths", "Deaths", "run", "numeric", "patients"),
        ("mean_transition_probability", "Mean Transition Probability", "run", "numeric", "probability"),
    ]
    catalog_map = {}
    for metric_key, metric_label, metric_scope, data_type, unit in metric_definitions:
        catalog = RunMetricCatalog(
            run_id=run.id,
            metric_key=metric_key,
            metric_label=metric_label,
            metric_scope=metric_scope,
            data_type=data_type,
            unit=unit,
            metadata_json={},
        )
        db.add(catalog)
        db.flush()
        catalog_map[metric_key] = catalog

    for sample in sample_results:
        for metric_key, metric_value in sample["metrics"].items():
            db.add(
                RunMetricValue(
                    run_id=run.id,
                    sample_index=int(sample["sample_index"]),
                    metric_catalog_id=catalog_map[metric_key].id,
                    numeric_value=float(metric_value),
                )
            )


def _persist_cohort_aggregates(db: Session, run: Run, cohort_points: list[dict]) -> None:
    for point in cohort_points:
        db.add(
            CohortAggregate(
                run_id=run.id,
                bucket_time=float(point["bucket_time"]),
                state_code=point["state_code"],
                subgroup_key=None,
                occupancy_count=int(point["occupancy_count"]),
                inflow_count=int(point["inflow_count"]),
                outflow_count=int(point["outflow_count"]),
                metric_json={},
            )
        )


def _persist_patient_traces(
    db: Session,
    run: Run,
    base_probabilities: list[dict],
    config: dict,
    random_seed: int,
) -> None:
    for patient in solver_service.build_patient_traces(
        base_probabilities,
        int(config["patient_trace_count"]),
        config,
        random_seed,
    ):
        db.add(
            PatientEntity(
                run_id=run.id,
                patient_index=patient["patient_index"],
                baseline_json={"arm": "base", "initial_state": "progression_free"},
            )
        )
        for event in patient["events"]:
            db.add(
                PatientStateEvent(
                    run_id=run.id,
                    patient_index=event["patient_index"],
                    event_seq=event["event_seq"],
                    cycle_index=event["cycle_index"],
                    event_time=event["event_time"],
                    from_state_code=event["from_state_code"],
                    to_state_code=event["to_state_code"],
                    event_type=event["event_type"],
                    tracker_json=event["tracker_json"],
                )
            )


def _persist_artifacts(
    db: Session,
    run: Run,
    probability_function: ProbabilityFunction,
    config: dict,
    base_result: dict,
) -> list[str]:
    artifact_ids = []
    artifacts = [
        (
            "probability-trace",
            "inline://probability-trace",
            {
                "probability_function_id": str(probability_function.id),
                "intervals": base_result["interval_probabilities"],
            },
        ),
        (
            "cohort-trace",
            "inline://cohort-trace",
            {
                "states": ["progression_free", "progressed_disease", "dead"],
                "points": base_result["cohort_points"],
                "survival_points": base_result["survival_points"],
            },
        ),
        (
            "run-config",
            "inline://run-config",
            {
                "config": config,
                "sample_params": base_result["sample_params"],
            },
        ),
    ]

    for artifact_type, storage_uri, metadata_json in artifacts:
        artifact = RunArtifact(
            run_id=run.id,
            artifact_type=artifact_type,
            storage_uri=storage_uri,
            checksum=_checksum_payload(metadata_json),
            metadata_json=metadata_json,
        )
        db.add(artifact)
        db.flush()
        artifact_ids.append(str(artifact.id))
    return artifact_ids


def _checksum_payload(payload: dict) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
