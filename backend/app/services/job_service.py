from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.analysis import AsyncJob


def create_job(
    db: Session,
    *,
    job_type: str,
    resource_type: str,
    resource_id: UUID | None,
    payload_json: dict,
) -> AsyncJob:
    job = AsyncJob(
        job_type=job_type,
        resource_type=resource_type,
        resource_id=resource_id,
        status="queued",
        payload_json=payload_json,
        result_json={},
        attempt_count=0,
    )
    db.add(job)
    db.flush()
    return job


def get_job(db: Session, job_id: UUID) -> AsyncJob | None:
    return db.scalar(select(AsyncJob).where(AsyncJob.id == job_id))


def process_job_by_id(job_id: UUID) -> None:
    db = SessionLocal()
    try:
        job = get_job(db, job_id)
        if not job or job.status not in {"queued", "failed"}:
            return

        job.status = "running"
        job.started_at = datetime.now(UTC)
        job.finished_at = None
        job.error_log = None
        job.attempt_count += 1
        db.commit()

        if job.job_type == "run":
            from app.services import run_service

            result_json = run_service.execute_run_job(db, job)
        elif job.job_type == "calibration":
            from app.services import calibration_service

            result_json = calibration_service.execute_calibration_job(db, job)
        else:
            raise ValueError(f"Unsupported job type: {job.job_type}")

        job = get_job(db, job_id)
        if not job:
            return
        job.status = "completed"
        job.result_json = result_json
        job.finished_at = datetime.now(UTC)
        db.commit()
    except Exception as exc:
        db.rollback()
        job = get_job(db, job_id)
        if job:
            job.status = "failed"
            job.error_log = str(exc)
            job.finished_at = datetime.now(UTC)
            db.commit()
    finally:
        db.close()
