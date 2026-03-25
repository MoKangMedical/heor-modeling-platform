"""Initial schema baseline."""

from __future__ import annotations

from alembic import op

from app.db.base import Base
from app.models import analysis, evidence, platform  # noqa: F401


revision = "20260325_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
