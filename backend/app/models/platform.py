from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import GUID, JSONDict


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(Text, nullable=False, default="healthcare")
    created_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Model(Base):
    __tablename__ = "models"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    model_family: Mapped[str] = mapped_column(Text, nullable=False)
    current_version_id: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    model_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    base_version_id: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    graph_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    model_ir_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    expression_catalog_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    compiled_hash: Mapped[str] = mapped_column(Text, nullable=False)
    engine_compat_version: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ModelParameter(Base):
    __tablename__ = "model_parameters"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    model_version_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    data_type: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_kind: Mapped[str] = mapped_column(Text, nullable=False)
    default_numeric_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    default_text_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    formula_expr: Mapped[str | None] = mapped_column(Text, nullable=True)
    distribution_json: Mapped[dict | None] = mapped_column(JSONDict, nullable=True)
    bounds_json: Mapped[dict | None] = mapped_column(JSONDict, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    is_random: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_calibratable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ModelState(Base):
    __tablename__ = "model_states"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    model_version_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    state_type: Mapped[str] = mapped_column(Text, nullable=False)
    group_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)


class ModelTransition(Base):
    __tablename__ = "model_transitions"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    model_version_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    from_state_code: Mapped[str] = mapped_column(Text, nullable=False)
    to_state_code: Mapped[str] = mapped_column(Text, nullable=False)
    transition_type: Mapped[str] = mapped_column(Text, nullable=False)
    probability_expr: Mapped[str | None] = mapped_column(Text, nullable=True)
    probability_function_id: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    trigger_expr: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
