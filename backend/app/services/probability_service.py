import math
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence import ClinicalSeries, CompoundCurve, ProbabilityFunction
from app.schemas.probability_functions import (
    ProbabilityDebugRequest,
    ProbabilityDebugResponse,
    ProbabilityFunctionCreate,
)


def list_probability_functions(db: Session, model_version_id: UUID) -> list[ProbabilityFunction]:
    stmt = (
        select(ProbabilityFunction)
        .where(ProbabilityFunction.model_version_id == model_version_id)
        .order_by(ProbabilityFunction.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def create_probability_function(
    db: Session, model_version_id: UUID, payload: ProbabilityFunctionCreate
) -> ProbabilityFunction:
    compiled_source = _compile_source(db, payload.source_type, payload.source_ref_id)
    options_json = {
        **payload.options_json,
        "compiled_source": compiled_source,
    }
    function = ProbabilityFunction(
        model_version_id=model_version_id,
        name=payload.name,
        function_kind=payload.function_kind,
        source_type=payload.source_type,
        source_ref_id=payload.source_ref_id,
        cycle_length=payload.cycle_length,
        time_unit=payload.time_unit,
        interpolation_method=payload.interpolation_method,
        options_json=options_json,
    )
    db.add(function)
    db.commit()
    db.refresh(function)
    return function


def get_probability_function(db: Session, function_id: UUID) -> ProbabilityFunction | None:
    stmt = select(ProbabilityFunction).where(ProbabilityFunction.id == function_id)
    return db.scalar(stmt)


def evaluate_probability(
    db: Session,
    function: ProbabilityFunction,
    t0: float,
    t1: float,
) -> tuple[float, dict]:
    compiled_source = function.options_json.get("compiled_source")
    if not compiled_source:
        compiled_source = _compile_source(db, function.source_type, function.source_ref_id)
        function.options_json = {**function.options_json, "compiled_source": compiled_source}
        db.add(function)
        db.commit()
        db.refresh(function)

    width = max(t1 - t0, 0.0)
    if width <= 0:
        return 0.0, {
            "method": function.function_kind,
            "source_type": function.source_type,
            "source_ref_id": str(function.source_ref_id),
            "cycle_length": float(function.cycle_length),
            "compiled_kind": compiled_source["compiled_kind"],
        }

    compiled_kind = compiled_source["compiled_kind"]
    points = compiled_source["points"]
    if compiled_kind == "survival":
        s0 = _interpolate(points, t0)
        s1 = _interpolate(points, t1)
        if s0 <= 0:
            probability = 1.0
        else:
            probability = 1.0 - (s1 / s0)
        trace = {
            "method": function.function_kind,
            "source_type": function.source_type,
            "source_ref_id": str(function.source_ref_id),
            "cycle_length": float(function.cycle_length),
            "compiled_kind": compiled_kind,
            "survival_t0": s0,
            "survival_t1": s1,
        }
    else:
        h0 = _interpolate(points, t0)
        h1 = _interpolate(points, t1)
        mean_hazard = max((h0 + h1) / 2.0, 0.0)
        probability = 1.0 - math.exp(-(mean_hazard * width))
        trace = {
            "method": function.function_kind,
            "source_type": function.source_type,
            "source_ref_id": str(function.source_ref_id),
            "cycle_length": float(function.cycle_length),
            "compiled_kind": compiled_kind,
            "hazard_t0": h0,
            "hazard_t1": h1,
            "mean_hazard": mean_hazard,
        }

    probability = min(max(probability, 0.0), 1.0)
    return probability, trace


def debug_probability_function(
    db: Session, function_id: UUID, payload: ProbabilityDebugRequest
) -> ProbabilityDebugResponse | None:
    function = get_probability_function(db, function_id)
    if not function:
        return None

    probability, trace = evaluate_probability(db, function, payload.t0, payload.t1)
    return ProbabilityDebugResponse(
        function_id=function.id,
        t0=payload.t0,
        t1=payload.t1,
        probability=probability,
        trace=trace,
    )


def _compile_source(db: Session, source_type: str, source_ref_id: UUID) -> dict:
    if source_type == "clinical_series":
        series = db.scalar(select(ClinicalSeries).where(ClinicalSeries.id == source_ref_id))
        if not series:
            raise ValueError("Clinical series not found for probability function source")
        return _compile_clinical_series(series)

    if source_type == "compound_curve":
        curve = db.scalar(select(CompoundCurve).where(CompoundCurve.id == source_ref_id))
        if not curve:
            raise ValueError("Compound curve not found for probability function source")
        raise ValueError("Compound curve compilation is not implemented in this demo runtime")

    raise ValueError(f"Unsupported probability source type: {source_type}")


def _compile_clinical_series(series: ClinicalSeries) -> dict:
    raw_points = [
        (float(point.time_value), float(point.estimate_value))
        for point in sorted(series.points, key=lambda item: (item.seq_no, item.time_value))
        if point.estimate_value is not None
    ]
    if not raw_points:
        raise ValueError("Clinical series has no numeric estimate values to compile")

    compiled_kind = _infer_compiled_kind(series.series_kind, series.value_unit)
    points = raw_points
    if compiled_kind == "survival" and raw_points[0][0] > 0:
        points = [(0.0, 1.0), *raw_points]

    return {
        "compiled_kind": compiled_kind,
        "series_kind": series.series_kind,
        "value_unit": series.value_unit,
        "interpolation_method": series.interpolation_method,
        "points": [{"time": time_value, "value": value} for time_value, value in points],
    }


def _infer_compiled_kind(series_kind: str, value_unit: str) -> str:
    normalized = f"{series_kind} {value_unit}".lower()
    if "hazard" in normalized:
        return "hazard"
    return "survival"


def _interpolate(points: list[dict], time_value: float) -> float:
    if not points:
        return 0.0

    if time_value <= points[0]["time"]:
        return float(points[0]["value"])
    if time_value >= points[-1]["time"]:
        return float(points[-1]["value"])

    for left, right in zip(points, points[1:], strict=False):
        left_time = float(left["time"])
        right_time = float(right["time"])
        if left_time <= time_value <= right_time:
            if right_time == left_time:
                return float(right["value"])
            span = right_time - left_time
            weight = (time_value - left_time) / span
            return float(left["value"]) + ((float(right["value"]) - float(left["value"])) * weight)

    return float(points[-1]["value"])
