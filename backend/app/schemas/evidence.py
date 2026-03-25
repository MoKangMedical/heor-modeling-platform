from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ClinicalSeriesPointIn(BaseModel):
    seq_no: int
    time_value: float
    estimate_value: float | None = None
    lower_ci: float | None = None
    upper_ci: float | None = None
    at_risk: int | None = None
    events: int | None = None
    censored: int | None = None
    metadata_json: dict = Field(default_factory=dict)


class ClinicalSeriesCreate(BaseModel):
    name: str
    series_kind: str
    time_unit: str
    value_unit: str
    interpolation_method: str = "piecewise_linear"
    source_file_uri: str | None = None
    source_metadata_json: dict = Field(default_factory=dict)
    points: list[ClinicalSeriesPointIn]


class ClinicalSeriesRead(ClinicalSeriesCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    created_at: datetime


class CompoundCurveSegmentIn(BaseModel):
    seq_no: int
    segment_kind: str
    source_ref_id: UUID
    start_time: float
    end_time: float | None = None
    blend_mode: str = "hard_switch"
    blend_window: float | None = None
    transform_json: dict = Field(default_factory=dict)


class CompoundCurveCreate(BaseModel):
    name: str
    curve_kind: str
    time_unit: str
    definition_json: dict = Field(default_factory=dict)
    segments: list[CompoundCurveSegmentIn]


class CompoundCurveRead(CompoundCurveCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    created_at: datetime

