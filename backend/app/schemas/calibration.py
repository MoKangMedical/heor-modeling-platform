from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CalibrationParameterCreate(BaseModel):
    parameter_code: str
    lower_bound: float
    upper_bound: float
    initial_value: float | None = None
    transform_type: str = "identity"
    is_fixed: bool = False


class CalibrationConfigCreate(BaseModel):
    name: str
    target_series_id: UUID
    objective_type: str
    optimizer_type: str
    max_iterations: int
    config_json: dict = Field(default_factory=dict)
    parameters: list[CalibrationParameterCreate]


class CalibrationConfigRead(CalibrationConfigCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    model_version_id: UUID
    created_at: datetime


class RunLaunchRequest(BaseModel):
    project_id: UUID
    random_seed: int | None = None
    input_snapshot_json: dict = Field(default_factory=dict)
    config_json: dict = Field(default_factory=dict)


class CalibrationResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run_id: UUID
    calibration_config_id: UUID
    convergence_status: str
    best_objective_value: float
    best_params_json: dict
    diagnostics_json: dict
    overlay_artifact_id: UUID | None = None
    created_at: datetime

