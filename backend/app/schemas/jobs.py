from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AsyncJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_type: str
    resource_type: str
    resource_id: UUID | None = None
    status: str
    payload_json: dict = Field(default_factory=dict)
    result_json: dict = Field(default_factory=dict)
    error_log: str | None = None
    attempt_count: int
    queued_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
