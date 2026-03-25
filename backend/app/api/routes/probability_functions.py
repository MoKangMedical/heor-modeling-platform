from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.probability_functions import (
    ProbabilityDebugRequest,
    ProbabilityDebugResponse,
    ProbabilityFunctionCreate,
    ProbabilityFunctionRead,
)
from app.services import probability_service


router = APIRouter()


@router.get(
    "/model-versions/{model_version_id}/probability-functions",
    response_model=list[ProbabilityFunctionRead],
)
def list_probability_functions(
    model_version_id: UUID,
    db: Session = Depends(get_db),
) -> list[ProbabilityFunctionRead]:
    return probability_service.list_probability_functions(db, model_version_id)


@router.post(
    "/model-versions/{model_version_id}/probability-functions",
    response_model=ProbabilityFunctionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_probability_function(
    model_version_id: UUID,
    payload: ProbabilityFunctionCreate,
    db: Session = Depends(get_db),
) -> ProbabilityFunctionRead:
    try:
        return probability_service.create_probability_function(db, model_version_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/probability-functions/{function_id}", response_model=ProbabilityFunctionRead)
def get_probability_function(function_id: UUID, db: Session = Depends(get_db)) -> ProbabilityFunctionRead:
    function = probability_service.get_probability_function(db, function_id)
    if not function:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Probability function not found"
        )
    return function


@router.post(
    "/probability-functions/{function_id}/debug",
    response_model=ProbabilityDebugResponse,
)
def debug_probability_function(
    function_id: UUID,
    payload: ProbabilityDebugRequest,
    db: Session = Depends(get_db),
) -> ProbabilityDebugResponse:
    result = probability_service.debug_probability_function(db, function_id, payload)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Probability function not found"
        )
    return result
