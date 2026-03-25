from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import GUID, JSONDict


class ClinicalSeries(Base):
    __tablename__ = "clinical_series"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    series_kind: Mapped[str] = mapped_column(Text, nullable=False)
    time_unit: Mapped[str] = mapped_column(Text, nullable=False)
    value_unit: Mapped[str] = mapped_column(Text, nullable=False)
    interpolation_method: Mapped[str] = mapped_column(Text, nullable=False, default="piecewise_linear")
    source_file_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_metadata_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    points: Mapped[list["ClinicalSeriesPoint"]] = relationship(
        back_populates="series", cascade="all, delete-orphan", order_by="ClinicalSeriesPoint.seq_no"
    )


class ClinicalSeriesPoint(Base):
    __tablename__ = "clinical_series_points"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    series_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("clinical_series.id", ondelete="CASCADE"), nullable=False)
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    time_value: Mapped[float] = mapped_column(Numeric, nullable=False)
    estimate_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    lower_ci: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    upper_ci: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    at_risk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    events: Mapped[int | None] = mapped_column(Integer, nullable=True)
    censored: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    series: Mapped["ClinicalSeries"] = relationship(back_populates="points")


class CurveFit(Base):
    __tablename__ = "curve_fits"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    series_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("clinical_series.id", ondelete="CASCADE"), nullable=False)
    fit_family: Mapped[str] = mapped_column(Text, nullable=False)
    params_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    fit_stats_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CompoundCurve(Base):
    __tablename__ = "compound_curves"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    curve_kind: Mapped[str] = mapped_column(Text, nullable=False)
    time_unit: Mapped[str] = mapped_column(Text, nullable=False)
    definition_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_by: Mapped[UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    segments: Mapped[list["CompoundCurveSegment"]] = relationship(
        back_populates="compound_curve",
        cascade="all, delete-orphan",
        order_by="CompoundCurveSegment.seq_no",
    )


class CompoundCurveSegment(Base):
    __tablename__ = "compound_curve_segments"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    compound_curve_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("compound_curves.id", ondelete="CASCADE"), nullable=False)
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    segment_kind: Mapped[str] = mapped_column(Text, nullable=False)
    source_ref_id: Mapped[UUID] = mapped_column(GUID(), nullable=False)
    start_time: Mapped[float] = mapped_column(Numeric, nullable=False)
    end_time: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    blend_mode: Mapped[str] = mapped_column(Text, nullable=False, default="hard_switch")
    blend_window: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    transform_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    compound_curve: Mapped["CompoundCurve"] = relationship(back_populates="segments")


class ProbabilityFunction(Base):
    __tablename__ = "probability_functions"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    model_version_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    function_kind: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_ref_id: Mapped[UUID] = mapped_column(GUID(), nullable=False)
    cycle_length: Mapped[float] = mapped_column(Numeric, nullable=False)
    time_unit: Mapped[str] = mapped_column(Text, nullable=False)
    interpolation_method: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[dict] = mapped_column(JSONDict, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
