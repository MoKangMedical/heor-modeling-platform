from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ScatterPoint(BaseModel):
    sample_index: int
    x: float
    y: float


class ScatterplotResponse(BaseModel):
    run_id: UUID
    x_metric: str
    y_metric: str
    points: list[ScatterPoint]


class CohortPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bucket_time: float
    state_code: str
    subgroup_key: str | None = None
    occupancy_count: int
    inflow_count: int
    outflow_count: int


class CohortDashboardResponse(BaseModel):
    run_id: UUID
    subgroup_key: str | None = None
    points: list[CohortPoint]


class PatientTraceEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient_index: int
    event_seq: int
    cycle_index: int | None = None
    event_time: float
    from_state_code: str | None = None
    to_state_code: str | None = None
    event_type: str
    tracker_json: dict


class PatientTraceResponse(BaseModel):
    run_id: UUID
    patient_index: int
    events: list[PatientTraceEvent]

