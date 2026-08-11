import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]


def run_alembic(database: Path, revision: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = f"sqlite+aiosqlite:///{database}"
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", revision],
        cwd=API_ROOT,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )


def test_migrations_upgrade_empty_and_previous_database():
    with tempfile.TemporaryDirectory() as directory:
        database = Path(directory) / "migration.db"
        run_alembic(database, "20260809_0001")
        with sqlite3.connect(database) as connection:
            connection.execute(
                "INSERT INTO categories (id, name, slug, active, sort_order) VALUES (1, '测试', 'test', 1, 0)"
            )
            connection.commit()

        run_alembic(database, "head")
        with sqlite3.connect(database) as connection:
            tables = {
                row[0] for row in connection.execute("SELECT name FROM sqlite_schema WHERE type = 'table'")
            }
            category = connection.execute("SELECT name FROM categories WHERE id = 1").fetchone()
            indexes = {
                row[0] for row in connection.execute("SELECT name FROM sqlite_schema WHERE type = 'index'")
            }
        assert {"product_images", "order_image_snapshots"} <= tables
        assert category == ("测试",)
        assert "ix_product_images_product_id" in indexes
