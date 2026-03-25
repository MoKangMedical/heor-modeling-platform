from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.jobs import AsyncJobRead
from app.services import job_service


router = APIRouter()


@router.get("/jobs/{job_id}", response_model=AsyncJobRead)
def get_job(job_id: UUID, db: Session = Depends(get_db)) -> AsyncJobRead:
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job
