import time

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.analysis import AsyncJob
from app.services import job_service


settings = get_settings()


def run_once() -> bool:
    db = SessionLocal()
    try:
        job = db.scalar(
            select(AsyncJob)
            .where(AsyncJob.status == "queued")
            .order_by(AsyncJob.queued_at.asc())
        )
        if not job:
            return False
        job_id = job.id
    finally:
        db.close()

    job_service.process_job_by_id(job_id)
    return True


def run_forever() -> None:
    while True:
        processed = run_once()
        if not processed:
            time.sleep(settings.job_poll_interval_seconds)


if __name__ == "__main__":
    run_forever()
