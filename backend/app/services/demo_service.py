from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import Run
from app.models.evidence import ClinicalSeries, ProbabilityFunction
from app.models.platform import Model, ModelVersion, Organization, Project
from app.schemas.demo import DemoContextRead


DEMO_ORG_SLUG = "demo-org"
DEMO_PROJECT_SLUG = "demo-heor"


def ensure_demo_seed(db: Session) -> DemoContextRead:
    organization = db.scalar(select(Organization).where(Organization.slug == DEMO_ORG_SLUG))
    if not organization:
        organization = Organization(name="Demo Organization", slug=DEMO_ORG_SLUG)
        db.add(organization)
        db.flush()

    project = db.scalar(
        select(Project).where(Project.organization_id == organization.id, Project.slug == DEMO_PROJECT_SLUG)
    )
    if not project:
        project = Project(
            organization_id=organization.id,
            name="HEOR Demo Project",
            slug=DEMO_PROJECT_SLUG,
            domain="healthcare",
        )
        db.add(project)
        db.flush()

    model = db.scalar(select(Model).where(Model.project_id == project.id, Model.name == "Demo Oncology Model"))
    if not model:
        model = Model(project_id=project.id, name="Demo Oncology Model", model_family="markov")
        db.add(model)
        db.flush()

    model_version = db.scalar(
        select(ModelVersion).where(ModelVersion.model_id == model.id, ModelVersion.version_no == 1)
    )
    if not model_version:
        model_version = ModelVersion(
            model_id=model.id,
            version_no=1,
            status="active",
            graph_json={"states": ["progression_free", "progressed_disease", "dead"]},
            model_ir_json={"family": "cohort_markov"},
            expression_catalog_json={},
            compiled_hash="demo-v1",
            engine_compat_version="0.1.0",
        )
        db.add(model_version)
        db.flush()

    if model.current_version_id != model_version.id:
        model.current_version_id = model_version.id

    db.commit()
    return get_demo_context(db)


def get_demo_context(db: Session) -> DemoContextRead:
    organization = db.scalar(select(Organization).where(Organization.slug == DEMO_ORG_SLUG))
    project = db.scalar(
        select(Project).where(Project.organization_id == organization.id, Project.slug == DEMO_PROJECT_SLUG)
    )
    model = db.scalar(select(Model).where(Model.project_id == project.id).order_by(Model.created_at.asc()))
    model_version = db.scalar(
        select(ModelVersion).where(ModelVersion.model_id == model.id).order_by(ModelVersion.version_no.desc())
    )
    latest_series = db.scalar(
        select(ClinicalSeries)
        .where(ClinicalSeries.project_id == project.id)
        .order_by(ClinicalSeries.created_at.desc())
    )
    latest_probability_function = db.scalar(
        select(ProbabilityFunction)
        .where(ProbabilityFunction.model_version_id == model_version.id)
        .order_by(ProbabilityFunction.created_at.desc())
    )
    latest_run = db.scalar(
        select(Run).where(Run.model_version_id == model_version.id).order_by(Run.submitted_at.desc())
    )

    return DemoContextRead(
        organization_id=organization.id,
        organization_slug=organization.slug,
        project_id=project.id,
        project_slug=project.slug,
        model_id=model.id,
        model_version_id=model_version.id,
        model_name=model.name,
        latest_series_id=latest_series.id if latest_series else None,
        latest_probability_function_id=latest_probability_function.id if latest_probability_function else None,
        latest_run_id=latest_run.id if latest_run else None,
    )
