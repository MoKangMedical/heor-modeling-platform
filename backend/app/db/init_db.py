from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import analysis, evidence, platform  # noqa: F401
from app.services.demo_service import ensure_demo_seed


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_demo_seed(db)
    finally:
        db.close()
