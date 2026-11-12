"""initial schema (applies database/schema.sql)

Revision ID: 0001
Revises:
"""
from pathlib import Path

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _schema_path() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "database" / "schema.sql"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("database/schema.sql not found")


def upgrade() -> None:
    # Raw DBAPI cursor with no bind params -> psycopg uses the simple query protocol,
    # which allows a multi-statement script (functions, triggers, DO blocks).
    raw = op.get_bind().connection
    with raw.cursor() as cur:
        cur.execute(_schema_path().read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
