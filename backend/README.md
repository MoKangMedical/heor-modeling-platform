# TreeAge Platform Backend

FastAPI backend for the HEOR/HTA modeling platform demo.

## Scope

This scaffold covers:

- API contract aligned route layout
- SQLAlchemy 2.0 ORM models for the core planning entities
- Pydantic request/response schemas
- Demo-ready evidence, probability function, run, and analytics flows
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
uvicorn app.main:app --reload
```

By default, the app now uses `sqlite:///./treeage_platform.db` and auto-seeds a demo organization, project, and model version on startup. You only need PostgreSQL if you explicitly switch `DATABASE_URL`.

## Docs

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- API contract draft: `docs/API_CONTRACT.md`
- OpenAPI draft: `openapi.yaml`

## Next Recommended Steps

1. Add Alembic migrations.
2. Replace demo run logic with validated modeling workflows.
3. Implement async job orchestration for runs and calibration.
4. Add auth, tenancy, and permission checks.
5. Add benchmark-backed integration tests.
