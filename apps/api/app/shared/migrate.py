from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from .config import API_ROOT, get_settings

BASELINE_REVISION = "20260809_0001"


def alembic_config() -> Config:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(API_ROOT / "migrations"))
    return config


def stamp_existing_schema(config: Config) -> None:
    sync_url = get_settings().database_url.replace("sqlite+aiosqlite", "sqlite", 1)
    engine = create_engine(sync_url)
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()
    if "alembic_version" in tables or "products" not in tables:
        return
    revision = "head" if {"product_images", "order_image_snapshots"} <= tables else BASELINE_REVISION
    command.stamp(config, revision)


def main() -> None:
    config = alembic_config()
    stamp_existing_schema(config)
    command.upgrade(config, "head")


if __name__ == "__main__":
    main()
