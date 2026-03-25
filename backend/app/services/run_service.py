import hashlib
import json
import random
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import (
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
from app.services import probability_service


ENGINE_VERSION = "skeleton-0.1.0"
DEFAULT_RUN_CONFIG = {
    "cycles": 12,
    "initial_population": 1000,
    "sample_size": 48,
    "patient_trace_count": 12,
    "pf_death_probability": 0.01,
    "pd_death_probability": 0.08,
    "pf_state_cost": 4800.0,
    "pd_state_cost": 9100.0,
    "transition_cost": 1800.0,
    "pf_state_utility": 0.82,
    "pd_state_utility": 0.53,
    "discount_rate": 0.03,
}
DEFAULT_RANDOM_SEED = 20260325


def queue_run(db: Session, model_version_id: UUID, payload: RunCreate) -> Run:
    started_at = datetime.now(UTC)
    run = Run(
        project_id=payload.project_id,
        model_version_id=model_version_id,
        analysis_type=payload.analysis_type,
        template_id=payload.template_id,
        status="running",
        engine_version=ENGINE_VERSION,
        random_seed=payload.random_seed or DEFAULT_RANDOM_SEED,
        sampling_method=payload.sampling_method,
        input_snapshot_json=payload.input_snapshot_json,
        config_json=payload.config_json,
        summary_json={"message": "Run started"},
        started_at=started_at,
    )
    db.add(run)
    db.flush()

    try:
        probability_function = _resolve_probability_function(db, model_version_id, payload)
        normalized_config = _normalize_config(probability_function, payload)
        sample_results, base_result = _execute_samples(
            db,
            probability_function=probability_function,
            random_seed=run.random_seed or DEFAULT_RANDOM_SEED,
            sampling_method=payload.sampling_method,
            config=normalized_config,
        )

        run.status = "completed"
        run.summary_json = _build_summary(run, probability_function, normalized_config, sample_results, base_result)
        run.input_snapshot_json = {
            **payload.input_snapshot_json,
            "probability_function_id": str(probability_function.id),
            "source_ref_id": str(probability_function.source_ref_id),
            "cycle_length": float(probability_function.cycle_length),
            "sample_size": normalized_config["sample_size"],
        }
        run.finished_at = datetime.now(UTC)

        _persist_metrics(db, run, sample_results)
        _persist_cohort_aggregates(db, run, base_result["cohort_points"])
        _persist_patient_traces(
            db,
            run,
            base_probabilities=base_result["interval_probabilities"],
            config=normalized_config,
            random_seed=(run.random_seed or DEFAULT_RANDOM_SEED) + 99,
        )
        _persist_artifacts(db, run, probability_function, normalized_config, base_result)
        db.commit()
    except Exception as exc:
        run.status = "failed"
        run.error_log = str(exc)
        run.summary_json = {"message": "Run failed", "error": str(exc)}
        run.finished_at = datetime.now(UTC)
        db.commit()

    db.refresh(run)
    return run


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
    db: Session, model_version_id: UUID, payload: RunCreate
) -> ProbabilityFunction:
    configured_id = payload.config_json.get("probability_function_id")
    if configured_id:
        function = probability_service.get_probability_function(db, UUID(str(configured_id)))
    else:
        function = db.scalar(
            select(ProbabilityFunction)
            .where(ProbabilityFunction.model_version_id == model_version_id)
            .order_by(ProbabilityFunction.created_at.desc())
        )
    if not function:
        raise ValueError("No probability function is available for this model version")
    return function


def _normalize_config(probability_function: ProbabilityFunction, payload: RunCreate) -> dict:
    config = {**DEFAULT_RUN_CONFIG, **payload.config_json}
    config["cycles"] = max(int(config["cycles"]), 1)
    config["initial_population"] = max(int(config["initial_population"]), 50)
    config["sample_size"] = max(int(config["sample_size"]), 8)
    config["patient_trace_count"] = max(int(config["patient_trace_count"]), 3)
    config["cycle_length"] = float(config.get("cycle_length", probability_function.cycle_length))
    return config


def _execute_samples(
    db: Session,
    probability_function: ProbabilityFunction,
    random_seed: int,
    sampling_method: str | None,
    config: dict,
) -> tuple[list[dict], dict]:
    rng = random.Random(random_seed)
    sample_size = int(config["sample_size"])
    parameter_samples = _build_parameter_samples(sample_size, sampling_method, rng)

    base_sample = {"event_scale": 1.0, "pf_cost_mult": 1.0, "pd_cost_mult": 1.0, "utility_shift": 0.0}
    sample_results = []
    base_result = _simulate_sample(
        db,
        probability_function=probability_function,
        config=config,
        sample_index=0,
        sample_params=base_sample,
    )
    sample_results.append(base_result)

    for sample_index, sample_params in enumerate(parameter_samples[1:], start=1):
        sample_results.append(
            _simulate_sample(
                db,
                probability_function=probability_function,
                config=config,
                sample_index=sample_index,
                sample_params=sample_params,
            )
        )

    return sample_results, base_result


def _build_parameter_samples(
    sample_size: int,
    sampling_method: str | None,
    rng: random.Random,
) -> list[dict]:
    if sample_size <= 1:
        return [{"event_scale": 1.0, "pf_cost_mult": 1.0, "pd_cost_mult": 1.0, "utility_shift": 0.0}]

    if (sampling_method or "").lower() == "lhs":
        dimensions = []
        for _ in range(4):
            bins = [((idx + rng.random()) / sample_size) for idx in range(sample_size)]
            rng.shuffle(bins)
            dimensions.append(bins)
        samples = []
        for idx in range(sample_size):
            samples.append(
                {
                    "event_scale": 0.85 + (dimensions[0][idx] * 0.30),
                    "pf_cost_mult": 0.90 + (dimensions[1][idx] * 0.20),
                    "pd_cost_mult": 0.90 + (dimensions[2][idx] * 0.20),
                    "utility_shift": -0.05 + (dimensions[3][idx] * 0.10),
                }
            )
        samples[0] = {"event_scale": 1.0, "pf_cost_mult": 1.0, "pd_cost_mult": 1.0, "utility_shift": 0.0}
        return samples

    samples = [{"event_scale": 1.0, "pf_cost_mult": 1.0, "pd_cost_mult": 1.0, "utility_shift": 0.0}]
    for _ in range(sample_size - 1):
        samples.append(
            {
                "event_scale": rng.uniform(0.85, 1.15),
                "pf_cost_mult": rng.uniform(0.90, 1.10),
                "pd_cost_mult": rng.uniform(0.90, 1.10),
                "utility_shift": rng.uniform(-0.05, 0.05),
            }
        )
    return samples


def _simulate_sample(
    db: Session,
    probability_function: ProbabilityFunction,
    config: dict,
    sample_index: int,
    sample_params: dict,
) -> dict:
    cycle_length = float(config["cycle_length"])
    cycles = int(config["cycles"])
    population = float(config["initial_population"])
    discount_rate = float(config["discount_rate"])
    pf_cost = float(config["pf_state_cost"]) * float(sample_params["pf_cost_mult"])
    pd_cost = float(config["pd_state_cost"]) * float(sample_params["pd_cost_mult"])
    transition_cost = float(config["transition_cost"])
    pf_utility = min(max(float(config["pf_state_utility"]) + float(sample_params["utility_shift"]), 0.0), 1.0)
    pd_utility = min(max(float(config["pd_state_utility"]) + (float(sample_params["utility_shift"]) * 0.7), 0.0), 1.0)
    pf_death_probability = min(max(float(config["pf_death_probability"]), 0.0), 0.3)
    pd_death_probability = min(max(float(config["pd_death_probability"]), 0.0), 0.9)

    progression_free = population
    progressed_disease = 0.0
    dead = 0.0
    total_cost = 0.0
    total_qalys = 0.0
    total_life_years = 0.0
    interval_probabilities = []
    cohort_points = []

    cohort_points.append(
        {
            "bucket_time": 0.0,
            "state_code": "progression_free",
            "occupancy_count": int(round(progression_free)),
            "inflow_count": 0,
            "outflow_count": 0,
        }
    )
    cohort_points.append(
        {
            "bucket_time": 0.0,
            "state_code": "progressed_disease",
            "occupancy_count": int(round(progressed_disease)),
            "inflow_count": 0,
            "outflow_count": 0,
        }
    )
    cohort_points.append(
        {
            "bucket_time": 0.0,
            "state_code": "dead",
            "occupancy_count": int(round(dead)),
            "inflow_count": 0,
            "outflow_count": 0,
        }
    )

    for cycle_index in range(cycles):
        t0 = cycle_index * cycle_length
        t1 = (cycle_index + 1) * cycle_length
        base_probability, trace = probability_service.evaluate_probability(db, probability_function, t0, t1)
        event_probability = min(max(base_probability * float(sample_params["event_scale"]), 0.0), 0.95)
        interval_probabilities.append(
            {
                "cycle_index": cycle_index,
                "t0": t0,
                "t1": t1,
                "probability": event_probability,
                "trace": trace,
            }
        )

        cycle_years = cycle_length / 12.0 if probability_function.time_unit.startswith("month") else cycle_length
        discount_factor = 1.0 / ((1.0 + discount_rate) ** (t0 / 12.0 if probability_function.time_unit.startswith("month") else t0))

        total_qalys += (
            (((progression_free / population) * pf_utility) + ((progressed_disease / population) * pd_utility))
            * cycle_years
            * discount_factor
        )
        total_life_years += (((progression_free + progressed_disease) / population) * cycle_years * discount_factor)
        total_cost += (
            (
                ((progression_free / population) * pf_cost)
                + ((progressed_disease / population) * pd_cost)
                + (((progression_free * event_probability) / population) * transition_cost)
            )
            * discount_factor
        )

        pf_to_pd = progression_free * event_probability
        remaining_pf = max(progression_free - pf_to_pd, 0.0)
        pf_to_dead = remaining_pf * pf_death_probability
        pd_to_dead = progressed_disease * pd_death_probability

        next_progression_free = max(progression_free - pf_to_pd - pf_to_dead, 0.0)
        next_progressed_disease = max(progressed_disease + pf_to_pd - pd_to_dead, 0.0)
        next_dead = dead + pf_to_dead + pd_to_dead

        cohort_points.append(
            {
                "bucket_time": t1,
                "state_code": "progression_free",
                "occupancy_count": int(round(next_progression_free)),
                "inflow_count": 0,
                "outflow_count": int(round(pf_to_pd + pf_to_dead)),
            }
        )
        cohort_points.append(
            {
                "bucket_time": t1,
                "state_code": "progressed_disease",
                "occupancy_count": int(round(next_progressed_disease)),
                "inflow_count": int(round(pf_to_pd)),
                "outflow_count": int(round(pd_to_dead)),
            }
        )
        cohort_points.append(
            {
                "bucket_time": t1,
                "state_code": "dead",
                "occupancy_count": int(round(next_dead)),
                "inflow_count": int(round(pf_to_dead + pd_to_dead)),
                "outflow_count": 0,
            }
        )

        progression_free = next_progression_free
        progressed_disease = next_progressed_disease
        dead = next_dead

    mean_transition_probability = sum(item["probability"] for item in interval_probabilities) / max(
        len(interval_probabilities), 1
    )
    return {
        "sample_index": sample_index,
        "metrics": {
            "total_cost": round(total_cost, 4),
            "total_qalys": round(total_qalys, 4),
            "life_years": round(total_life_years, 4),
            "deaths": round(dead, 2),
            "mean_transition_probability": round(mean_transition_probability, 6),
        },
        "sample_params": sample_params,
        "interval_probabilities": interval_probabilities,
        "cohort_points": cohort_points,
    }


def _build_summary(
    run: Run,
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
        "analysis_type": run.analysis_type,
        "sample_size": len(sample_results),
        "sampling_method": run.sampling_method or "random",
        "probability_function_id": str(probability_function.id),
        "cards": [
            {"label": "Base Cost", "value": base_result["metrics"]["total_cost"], "unit": "USD per patient"},
            {"label": "Base QALYs", "value": base_result["metrics"]["total_qalys"], "unit": "QALYs"},
            {"label": "Base Life Years", "value": base_result["metrics"]["life_years"], "unit": "LYs"},
            {"label": "Mean Event Probability", "value": base_result["metrics"]["mean_transition_probability"], "unit": "probability"},
        ],
        "base_metrics": base_result["metrics"],
        "mean_metrics": {
            "total_cost": round(mean_cost, 4),
            "total_qalys": round(mean_qalys, 4),
            "life_years": round(mean_lys, 4),
        },
        "config": config,
    }


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
    rng = random.Random(random_seed)
    patient_count = int(config["patient_trace_count"])
    pf_death_probability = float(config["pf_death_probability"])
    pd_death_probability = float(config["pd_death_probability"])

    for patient_index in range(patient_count):
        db.add(
            PatientEntity(
                run_id=run.id,
                patient_index=patient_index,
                baseline_json={"arm": "base", "initial_state": "progression_free"},
            )
        )
        db.add(
            PatientStateEvent(
                run_id=run.id,
                patient_index=patient_index,
                event_seq=0,
                cycle_index=0,
                event_time=0.0,
                from_state_code=None,
                to_state_code="progression_free",
                event_type="baseline",
                tracker_json={"state": "progression_free"},
            )
        )

        current_state = "progression_free"
        event_seq = 1
        for interval in base_probabilities:
            cycle_index = int(interval["cycle_index"])
            if current_state == "dead":
                break

            if current_state == "progression_free":
                draw = rng.random()
                progression_threshold = float(interval["probability"])
                death_threshold = progression_threshold + pf_death_probability
                if draw <= progression_threshold:
                    db.add(
                        PatientStateEvent(
                            run_id=run.id,
                            patient_index=patient_index,
                            event_seq=event_seq,
                            cycle_index=cycle_index + 1,
                            event_time=float(interval["t1"]),
                            from_state_code="progression_free",
                            to_state_code="progressed_disease",
                            event_type="transition",
                            tracker_json={"probability": progression_threshold},
                        )
                    )
                    current_state = "progressed_disease"
                    event_seq += 1
                elif draw <= death_threshold:
                    db.add(
                        PatientStateEvent(
                            run_id=run.id,
                            patient_index=patient_index,
                            event_seq=event_seq,
                            cycle_index=cycle_index + 1,
                            event_time=float(interval["t1"]),
                            from_state_code="progression_free",
                            to_state_code="dead",
                            event_type="death",
                            tracker_json={"probability": pf_death_probability},
                        )
                    )
                    current_state = "dead"
                    event_seq += 1
            elif current_state == "progressed_disease" and rng.random() <= pd_death_probability:
                db.add(
                    PatientStateEvent(
                        run_id=run.id,
                        patient_index=patient_index,
                        event_seq=event_seq,
                        cycle_index=cycle_index + 1,
                        event_time=float(interval["t1"]),
                        from_state_code="progressed_disease",
                        to_state_code="dead",
                        event_type="death",
                        tracker_json={"probability": pd_death_probability},
                    )
                )
                current_state = "dead"
                event_seq += 1

        if current_state != "dead":
            final_time = float(base_probabilities[-1]["t1"]) if base_probabilities else 0.0
            db.add(
                PatientStateEvent(
                    run_id=run.id,
                    patient_index=patient_index,
                    event_seq=event_seq,
                    cycle_index=len(base_probabilities),
                    event_time=final_time,
                    from_state_code=current_state,
                    to_state_code=current_state,
                    event_type="censored",
                    tracker_json={"state": current_state},
                )
            )


def _persist_artifacts(
    db: Session,
    run: Run,
    probability_function: ProbabilityFunction,
    config: dict,
    base_result: dict,
) -> None:
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
        db.add(
            RunArtifact(
                run_id=run.id,
                artifact_type=artifact_type,
                storage_uri=storage_uri,
                checksum=_checksum_payload(metadata_json),
                metadata_json=metadata_json,
            )
        )


def _checksum_payload(payload: dict) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
