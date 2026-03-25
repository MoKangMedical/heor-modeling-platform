from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    status: str
    app_name: str


class ArtifactRead(ORMModel):
    id: UUID
    run_id: UUID
    artifact_type: str
    storage_uri: str
    checksum: str | None = None
    metadata_json: dict = {}
    created_at: datetime


class MetricCatalogRead(ORMModel):
    id: UUID
    run_id: UUID
    metric_key: str
    metric_label: str
    metric_scope: str
    data_type: str
    unit: str | None = None
    strategy_code: str | None = None
    comparator_strategy_code: str | None = None
    metadata_json: dict = {}

