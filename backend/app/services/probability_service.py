from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence import ProbabilityFunction
from app.schemas.probability_functions import (
    ProbabilityDebugRequest,
    ProbabilityDebugResponse,
    ProbabilityFunctionCreate,
)


def create_probability_function(
    db: Session, model_version_id: UUID, payload: ProbabilityFunctionCreate
) -> ProbabilityFunction:
    function = ProbabilityFunction(
        model_version_id=model_version_id,
        name=payload.name,
        function_kind=payload.function_kind,
        source_type=payload.source_type,
        source_ref_id=payload.source_ref_id,
        cycle_length=payload.cycle_length,
        time_unit=payload.time_unit,
        interpolation_method=payload.interpolation_method,
        options_json=payload.options_json,
    )
    db.add(function)
    db.commit()
    db.refresh(function)
    return function


def get_probability_function(db: Session, function_id: UUID) -> ProbabilityFunction | None:
    stmt = select(ProbabilityFunction).where(ProbabilityFunction.id == function_id)
    return db.scalar(stmt)


def debug_probability_function(
    db: Session, function_id: UUID, payload: ProbabilityDebugRequest
) -> ProbabilityDebugResponse | None:
    function = get_probability_function(db, function_id)
    if not function:
        return None

    width = max(payload.t1 - payload.t0, 0.0)
    probability = min(max(width / max(float(function.cycle_length), 1.0) * 0.05, 0.0), 1.0)
    trace = {
        "method": function.function_kind,
        "source_type": function.source_type,
        "source_ref_id": str(function.source_ref_id),
        "cycle_length": float(function.cycle_length),
    }
    return ProbabilityDebugResponse(
        function_id=function.id,
        t0=payload.t0,
        t1=payload.t1,
        probability=probability,
        trace=trace,
    )

