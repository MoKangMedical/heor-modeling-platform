# TreeAge Platform Backend

FastAPI backend for the HEOR/HTA modeling platform demo.

## Scope

This scaffold covers:

- API contract aligned route layout
- SQLAlchemy 2.0 ORM models for the core planning entities
- Pydantic request/response schemas
- Demo-ready evidence, probability function, run, calibration, and analytics flows
- Async job orchestration for runs and calibration requests
- Alembic migration scaffold for schema evolution
- OpenAPI draft in `openapi.yaml`

This is still a demo foundation, not a production implementation.

## Project Layout

```text
app/
  api/
  core/
  db/
  models/
  schemas/
  services/
docs/
openapi.yaml
docker-compose.yml
pyproject.toml
```

## Quick Start

1. Create and activate a Python 3.12 virtual environment.
2. Install dependencies:

```bash
python3.12 -m venv .venv312
. .venv312/bin/activate
python -m pip install --upgrade pip
python -m pip install .
```

3. Run the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

By default, the app now uses `sqlite:///./treeage_platform.db` and auto-seeds a demo organization, project, and model version on startup. You only need PostgreSQL if you explicitly switch `DATABASE_URL`.

4. Optional: run the async worker separately when you want run/calibration jobs to be processed outside the web process.

```bash
python -m app.workers.job_worker --once
# or continuous polling
python -m app.workers.job_worker
```

## Docs

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- API contract draft: `docs/API_CONTRACT.md`
- OpenAPI draft: `openapi.yaml`

## Next Recommended Steps

1. Replace demo run logic with validated modeling workflows.
2. Add auth, tenancy, and permission checks.
3. Expand worker orchestration and retry policy.
4. Add benchmark-backed integration tests.
5. Add artifact/object storage integration beyond inline demo payloads.
