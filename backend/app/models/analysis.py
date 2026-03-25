from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import GUID, JSONDict


class AnalysisTemplate(Base):
    __tablename__ = "analysis_templates"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    model_version_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    analysis_type: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    config_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    allowed_overrides_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    model_version_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("model_versions.id"), nullable=False)
    analysis_type: Mapped[str] = mapped_column(Text, nullable=False)
    template_id: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    parent_run_id: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    engine_version: Mapped[str] = mapped_column(Text, nullable=False)
    random_seed: Mapped[int | None] = mapped_column(nullable=True)
    sampling_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_snapshot_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    config_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    summary_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    error_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AsyncJob(Base):
    __tablename__ = "async_jobs"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    job_type: Mapped[str] = mapped_column(Text, nullable=False)
    resource_type: Mapped[str] = mapped_column(Text, nullable=False)
    resource_id: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    result_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    error_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    queued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RunArtifact(Base):
    __tablename__ = "run_artifacts"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    artifact_type: Mapped[str] = mapped_column(Text, nullable=False)
    storage_uri: Mapped[str] = mapped_column(Text, nullable=False)
    checksum: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RunMetricCatalog(Base):
    __tablename__ = "run_metric_catalog"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    metric_key: Mapped[str] = mapped_column(Text, nullable=False)
    metric_label: Mapped[str] = mapped_column(Text, nullable=False)
    metric_scope: Mapped[str] = mapped_column(Text, nullable=False)
    data_type: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    strategy_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    comparator_strategy_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)


class RunMetricValue(Base):
    __tablename__ = "run_metric_values"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    sample_index: Mapped[int] = mapped_column(Integer, nullable=False)
    metric_catalog_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("run_metric_catalog.id", ondelete="CASCADE"), nullable=False)
    numeric_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    text_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SampleSet(Base):
    __tablename__ = "sample_sets"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    sampler_type: Mapped[str] = mapped_column(Text, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    dimension_count: Mapped[int] = mapped_column(Integer, nullable=False)
    random_seed: Mapped[int] = mapped_column(nullable=False)
    storage_uri: Mapped[str] = mapped_column(Text, nullable=False)
    checksum: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CalibrationConfig(Base):
    __tablename__ = "calibration_configs"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    model_version_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    target_series_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("clinical_series.id"), nullable=False)
    objective_type: Mapped[str] = mapped_column(Text, nullable=False)
    optimizer_type: Mapped[str] = mapped_column(Text, nullable=False)
    max_iterations: Mapped[int] = mapped_column(Integer, nullable=False)
    config_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    parameters: Mapped[list["CalibrationParameter"]] = relationship(
        back_populates="calibration_config",
        cascade="all, delete-orphan",
        order_by="CalibrationParameter.parameter_code",
    )


class CalibrationParameter(Base):
    __tablename__ = "calibration_parameters"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    calibration_config_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("calibration_configs.id", ondelete="CASCADE"), nullable=False)
    parameter_code: Mapped[str] = mapped_column(Text, nullable=False)
    lower_bound: Mapped[float] = mapped_column(Numeric, nullable=False)
    upper_bound: Mapped[float] = mapped_column(Numeric, nullable=False)
    initial_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    transform_type: Mapped[str] = mapped_column(Text, nullable=False, default="identity")
    is_fixed: Mapped[bool] = mapped_column(nullable=False, default=False)
    calibration_config: Mapped["CalibrationConfig"] = relationship(back_populates="parameters")


class CalibrationResult(Base):
    __tablename__ = "calibration_results"

    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), primary_key=True)
    calibration_config_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("calibration_configs.id"), nullable=False)
    convergence_status: Mapped[str] = mapped_column(Text, nullable=False)
    best_objective_value: Mapped[float] = mapped_column(Numeric, nullable=False)
    best_params_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    diagnostics_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    overlay_artifact_id: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PatientEntity(Base):
    __tablename__ = "patient_entities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    patient_index: Mapped[int] = mapped_column(Integer, nullable=False)
    baseline_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    subgroup_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PatientStateEvent(Base):
    __tablename__ = "patient_state_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    patient_index: Mapped[int] = mapped_column(Integer, nullable=False)
    event_seq: Mapped[int] = mapped_column(Integer, nullable=False)
    cycle_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event_time: Mapped[float] = mapped_column(Numeric, nullable=False)
    from_state_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_state_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    tracker_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CohortAggregate(Base):
    __tablename__ = "cohort_aggregates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    bucket_time: Mapped[float] = mapped_column(Numeric, nullable=False)
    state_code: Mapped[str] = mapped_column(Text, nullable=False)
    subgroup_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    occupancy_count: Mapped[int] = mapped_column(Integer, nullable=False)
    inflow_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    outflow_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metric_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
