"""
Apply Alembic migrations, then seed roles, users, and catalog data.

Usage (from backend/):
  python -m scripts.migrate_and_seed

Dokploy (exec into the api container):
  python -m scripts.migrate_and_seed
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config

from scripts.seed import seed


def run_migrations() -> None:
    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    print("Running migrations to head…")
    command.upgrade(cfg, "head")
    print("Migrations complete.")


def main() -> None:
    run_migrations()
    print("Seeding database…")
    asyncio.run(seed())


if __name__ == "__main__":
    main()
