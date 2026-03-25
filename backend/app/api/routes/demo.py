from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.demo import DemoContextRead
from app.services import demo_service


router = APIRouter()


@router.get("/demo/context", response_model=DemoContextRead)
def get_demo_context(db: Session = Depends(get_db)) -> DemoContextRead:
    return demo_service.ensure_demo_seed(db)
