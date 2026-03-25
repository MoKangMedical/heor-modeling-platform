import math
import random
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.evidence import ProbabilityFunction
from app.services import probability_service


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


def normalize_run_config(probability_function: ProbabilityFunction, overrides: dict) -> dict:
    config = {**DEFAULT_RUN_CONFIG, **overrides}
    config["cycles"] = max(int(config["cycles"]), 1)
    config["initial_population"] = max(int(config["initial_population"]), 50)
    config["sample_size"] = max(int(config["sample_size"]), 8)
    config["patient_trace_count"] = max(int(config["patient_trace_count"]), 3)
    config["cycle_length"] = float(config.get("cycle_length", probability_function.cycle_length))
    return config


def build_parameter_samples(
    sample_size: int,
    sampling_method: str | None,
    random_seed: int,
) -> list[dict]:
    rng = random.Random(random_seed)
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


def simulate_sample(
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
    pd_utility = min(
        max(float(config["pd_state_utility"]) + (float(sample_params["utility_shift"]) * 0.7), 0.0),
        1.0,
    )
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
    survival_points = [{"time": 0.0, "alive_probability": 1.0}]

    add_cohort_point(cohort_points, 0.0, "progression_free", progression_free, 0, 0)
    add_cohort_point(cohort_points, 0.0, "progressed_disease", progressed_disease, 0, 0)
    add_cohort_point(cohort_points, 0.0, "dead", dead, 0, 0)

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
        discount_base = t0 / 12.0 if probability_function.time_unit.startswith("month") else t0
        discount_factor = 1.0 / ((1.0 + discount_rate) ** discount_base)

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

        add_cohort_point(cohort_points, t1, "progression_free", next_progression_free, 0, pf_to_pd + pf_to_dead)
        add_cohort_point(cohort_points, t1, "progressed_disease", next_progressed_disease, pf_to_pd, pd_to_dead)
        add_cohort_point(cohort_points, t1, "dead", next_dead, pf_to_dead + pd_to_dead, 0)
        survival_points.append({"time": t1, "alive_probability": (next_progression_free + next_progressed_disease) / population})

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
        "survival_points": survival_points,
    }


def build_patient_traces(
    base_probabilities: list[dict],
    patient_count: int,
    config: dict,
    random_seed: int,
) -> list[dict]:
    rng = random.Random(random_seed)
    pf_death_probability = float(config["pf_death_probability"])
    pd_death_probability = float(config["pd_death_probability"])
    events = []

    for patient_index in range(patient_count):
        patient_events = [
            {
                "patient_index": patient_index,
                "event_seq": 0,
                "cycle_index": 0,
                "event_time": 0.0,
                "from_state_code": None,
                "to_state_code": "progression_free",
                "event_type": "baseline",
                "tracker_json": {"state": "progression_free"},
            }
        ]
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
                    patient_events.append(
                        {
                            "patient_index": patient_index,
                            "event_seq": event_seq,
                            "cycle_index": cycle_index + 1,
                            "event_time": float(interval["t1"]),
                            "from_state_code": "progression_free",
                            "to_state_code": "progressed_disease",
                            "event_type": "transition",
                            "tracker_json": {"probability": progression_threshold},
                        }
                    )
                    current_state = "progressed_disease"
                    event_seq += 1
                elif draw <= death_threshold:
                    patient_events.append(
                        {
                            "patient_index": patient_index,
                            "event_seq": event_seq,
                            "cycle_index": cycle_index + 1,
                            "event_time": float(interval["t1"]),
                            "from_state_code": "progression_free",
                            "to_state_code": "dead",
                            "event_type": "death",
                            "tracker_json": {"probability": pf_death_probability},
                        }
                    )
                    current_state = "dead"
                    event_seq += 1
            elif current_state == "progressed_disease" and rng.random() <= pd_death_probability:
                patient_events.append(
                    {
                        "patient_index": patient_index,
                        "event_seq": event_seq,
                        "cycle_index": cycle_index + 1,
                        "event_time": float(interval["t1"]),
                        "from_state_code": "progressed_disease",
                        "to_state_code": "dead",
                        "event_type": "death",
                        "tracker_json": {"probability": pd_death_probability},
                    }
                )
                current_state = "dead"
                event_seq += 1

        if current_state != "dead":
            final_time = float(base_probabilities[-1]["t1"]) if base_probabilities else 0.0
            patient_events.append(
                {
                    "patient_index": patient_index,
                    "event_seq": event_seq,
                    "cycle_index": len(base_probabilities),
                    "event_time": final_time,
                    "from_state_code": current_state,
                    "to_state_code": current_state,
                    "event_type": "censored",
                    "tracker_json": {"state": current_state},
                }
            )

        events.append({"patient_index": patient_index, "events": patient_events})

    return events


def interpolate_series(points: list[dict], time_value: float, value_key: str) -> float:
    if not points:
        return 0.0
    if time_value <= float(points[0]["time"]):
        return float(points[0][value_key])
    if time_value >= float(points[-1]["time"]):
        return float(points[-1][value_key])

    for left, right in zip(points, points[1:], strict=False):
        left_time = float(left["time"])
        right_time = float(right["time"])
        if left_time <= time_value <= right_time:
            if right_time == left_time:
                return float(right[value_key])
            ratio = (time_value - left_time) / (right_time - left_time)
            return float(left[value_key]) + ((float(right[value_key]) - float(left[value_key])) * ratio)
    return float(points[-1][value_key])


def add_cohort_point(
    collection: list[dict],
    bucket_time: float,
    state_code: str,
    occupancy_count: float,
    inflow_count: float,
    outflow_count: float,
) -> None:
    collection.append(
        {
            "bucket_time": float(bucket_time),
            "state_code": state_code,
            "occupancy_count": int(round(occupancy_count)),
            "inflow_count": int(round(inflow_count)),
            "outflow_count": int(round(outflow_count)),
        }
    )
