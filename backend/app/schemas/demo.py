from uuid import UUID

from pydantic import BaseModel


class DemoContextRead(BaseModel):
    organization_id: UUID
    organization_slug: str
    project_id: UUID
    project_slug: str
    model_id: UUID
    model_version_id: UUID
    model_name: str
    latest_series_id: UUID | None = None
    latest_probability_function_id: UUID | None = None
    latest_run_id: UUID | None = None
