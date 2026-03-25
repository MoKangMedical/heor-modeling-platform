from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RunCreate(BaseModel):
    project_id: UUID
    analysis_type: str
    template_id: UUID | None = None
    random_seed: int | None = None
    sampling_method: str | None = None
    input_snapshot_json: dict = Field(default_factory=dict)
    config_json: dict = Field(default_factory=dict)


class RunRead(RunCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    model_version_id: UUID
    status: str
    engine_version: str
    summary_json: dict = Field(default_factory=dict)
    error_log: str | None = None
    submitted_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None

