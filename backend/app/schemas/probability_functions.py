from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProbabilityFunctionCreate(BaseModel):
    name: str
    function_kind: str
    source_type: str
    source_ref_id: UUID
    cycle_length: float
    time_unit: str
    interpolation_method: str
    options_json: dict = Field(default_factory=dict)


class ProbabilityFunctionRead(ProbabilityFunctionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    model_version_id: UUID
    created_at: datetime


class ProbabilityDebugRequest(BaseModel):
    t0: float
    t1: float


class ProbabilityDebugResponse(BaseModel):
    function_id: UUID
    t0: float
    t1: float
    probability: float
    trace: dict

