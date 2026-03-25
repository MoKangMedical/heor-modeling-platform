from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import Run, RunArtifact, RunMetricCatalog
from app.schemas.runs import RunCreate


ENGINE_VERSION = "skeleton-0.1.0"


def queue_run(db: Session, model_version_id: UUID, payload: RunCreate) -> Run:
    run = Run(
        project_id=payload.project_id,
        model_version_id=model_version_id,
        analysis_type=payload.analysis_type,
        template_id=payload.template_id,
        status="queued",
        engine_version=ENGINE_VERSION,
        random_seed=payload.random_seed,
        sampling_method=payload.sampling_method,
        input_snapshot_json=payload.input_snapshot_json,
        config_json=payload.config_json,
        summary_json={"message": "Queued by API skeleton"},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def get_run(db: Session, run_id: UUID) -> Run | None:
    stmt = select(Run).where(Run.id == run_id)
    return db.scalar(stmt)


def list_artifacts(db: Session, run_id: UUID) -> list[RunArtifact]:
    stmt = select(RunArtifact).where(RunArtifact.run_id == run_id)
    return list(db.scalars(stmt).all())


def list_metric_catalog(db: Session, run_id: UUID) -> list[RunMetricCatalog]:
    stmt = select(RunMetricCatalog).where(RunMetricCatalog.run_id == run_id)
    return list(db.scalars(stmt).all())

