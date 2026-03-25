from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import CohortAggregate, PatientStateEvent, RunMetricCatalog, RunMetricValue
from app.schemas.analytics import (
    CohortDashboardResponse,
    CohortPoint,
    PatientTraceEvent,
    PatientTraceResponse,
    ScatterPoint,
    ScatterplotResponse,
)


def build_scatterplot(
    db: Session, run_id: UUID, x_metric: str, y_metric: str
) -> ScatterplotResponse:
    x_catalog = db.scalar(
        select(RunMetricCatalog).where(
            RunMetricCatalog.run_id == run_id,
            RunMetricCatalog.metric_key == x_metric,
        )
    )
    y_catalog = db.scalar(
        select(RunMetricCatalog).where(
            RunMetricCatalog.run_id == run_id,
            RunMetricCatalog.metric_key == y_metric,
        )
    )
    if not x_catalog or not y_catalog:
        return ScatterplotResponse(run_id=run_id, x_metric=x_metric, y_metric=y_metric, points=[])

    x_values = {
        row.sample_index: float(row.numeric_value)
        for row in db.scalars(
            select(RunMetricValue).where(
                RunMetricValue.run_id == run_id,
                RunMetricValue.metric_catalog_id == x_catalog.id,
                RunMetricValue.numeric_value.is_not(None),
            )
        ).all()
    }
    y_values = {
        row.sample_index: float(row.numeric_value)
        for row in db.scalars(
            select(RunMetricValue).where(
                RunMetricValue.run_id == run_id,
                RunMetricValue.metric_catalog_id == y_catalog.id,
                RunMetricValue.numeric_value.is_not(None),
            )
        ).all()
    }

    sample_indices = sorted(set(x_values) & set(y_values))
    points = [ScatterPoint(sample_index=i, x=x_values[i], y=y_values[i]) for i in sample_indices]
    return ScatterplotResponse(run_id=run_id, x_metric=x_metric, y_metric=y_metric, points=points)


def get_cohort_dashboard(
    db: Session, run_id: UUID, subgroup_key: str | None
) -> CohortDashboardResponse:
    stmt = select(CohortAggregate).where(CohortAggregate.run_id == run_id)
    if subgroup_key is not None:
        stmt = stmt.where(CohortAggregate.subgroup_key == subgroup_key)
    rows = list(db.scalars(stmt.order_by(CohortAggregate.bucket_time.asc(), CohortAggregate.state_code.asc())).all())
    points = [
        CohortPoint(
            bucket_time=float(row.bucket_time),
            state_code=row.state_code,
            subgroup_key=row.subgroup_key,
            occupancy_count=row.occupancy_count,
            inflow_count=row.inflow_count,
            outflow_count=row.outflow_count,
        )
        for row in rows
    ]
    return CohortDashboardResponse(run_id=run_id, subgroup_key=subgroup_key, points=points)


def get_patient_trace(db: Session, run_id: UUID, patient_index: int) -> PatientTraceResponse:
    stmt = (
        select(PatientStateEvent)
        .where(
            PatientStateEvent.run_id == run_id,
            PatientStateEvent.patient_index == patient_index,
        )
        .order_by(PatientStateEvent.event_seq.asc())
    )
    rows = list(db.scalars(stmt).all())
    events = [
        PatientTraceEvent(
            patient_index=row.patient_index,
            event_seq=row.event_seq,
            cycle_index=row.cycle_index,
            event_time=float(row.event_time),
            from_state_code=row.from_state_code,
            to_state_code=row.to_state_code,
            event_type=row.event_type,
            tracker_json=row.tracker_json,
        )
        for row in rows
    ]
    return PatientTraceResponse(run_id=run_id, patient_index=patient_index, events=events)
