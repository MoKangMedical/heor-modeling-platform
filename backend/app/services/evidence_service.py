from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence import (
    ClinicalSeries,
    ClinicalSeriesPoint,
    CompoundCurve,
    CompoundCurveSegment,
)
from app.schemas.evidence import ClinicalSeriesCreate, CompoundCurveCreate


def list_clinical_series(db: Session, project_id: UUID) -> list[ClinicalSeries]:
    stmt = (
        select(ClinicalSeries)
        .where(ClinicalSeries.project_id == project_id)
        .order_by(ClinicalSeries.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def create_clinical_series(db: Session, project_id: UUID, payload: ClinicalSeriesCreate) -> ClinicalSeries:
    series = ClinicalSeries(
        project_id=project_id,
        name=payload.name,
        series_kind=payload.series_kind,
        time_unit=payload.time_unit,
        value_unit=payload.value_unit,
        interpolation_method=payload.interpolation_method,
        source_file_uri=payload.source_file_uri,
        source_metadata_json=payload.source_metadata_json,
    )
    db.add(series)
    db.flush()

    for point in payload.points:
        db.add(
            ClinicalSeriesPoint(
                series_id=series.id,
                seq_no=point.seq_no,
                time_value=point.time_value,
                estimate_value=point.estimate_value,
                lower_ci=point.lower_ci,
                upper_ci=point.upper_ci,
                at_risk=point.at_risk,
                events=point.events,
                censored=point.censored,
                metadata_json=point.metadata_json,
            )
        )

    db.commit()
    db.refresh(series)
    return series


def get_clinical_series(db: Session, series_id: UUID) -> ClinicalSeries | None:
    stmt = select(ClinicalSeries).where(ClinicalSeries.id == series_id)
    return db.scalar(stmt)


def create_compound_curve(db: Session, project_id: UUID, payload: CompoundCurveCreate) -> CompoundCurve:
    curve = CompoundCurve(
        project_id=project_id,
        name=payload.name,
        curve_kind=payload.curve_kind,
        time_unit=payload.time_unit,
        definition_json=payload.definition_json,
    )
    db.add(curve)
    db.flush()

    for segment in payload.segments:
        db.add(
            CompoundCurveSegment(
                compound_curve_id=curve.id,
                seq_no=segment.seq_no,
                segment_kind=segment.segment_kind,
                source_ref_id=segment.source_ref_id,
                start_time=segment.start_time,
                end_time=segment.end_time,
                blend_mode=segment.blend_mode,
                blend_window=segment.blend_window,
                transform_json=segment.transform_json,
            )
        )

    db.commit()
    db.refresh(curve)
    return curve


def get_compound_curve(db: Session, curve_id: UUID) -> CompoundCurve | None:
    stmt = select(CompoundCurve).where(CompoundCurve.id == curve_id)
    return db.scalar(stmt)
