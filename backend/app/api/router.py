from fastapi import APIRouter

from app.api.routes import analytics, calibration, demo, evidence, jobs, probability_functions, runs


api_router = APIRouter()
api_router.include_router(demo.router, tags=["demo"])
api_router.include_router(evidence.router, prefix="/projects", tags=["evidence"])
api_router.include_router(evidence.lookup_router, tags=["evidence"])
api_router.include_router(probability_functions.router, tags=["probability"])
api_router.include_router(runs.router, tags=["runs"])
api_router.include_router(calibration.router, tags=["calibration"])
api_router.include_router(analytics.router, tags=["analytics"])
api_router.include_router(jobs.router, tags=["jobs"])
