"""Soft-delete helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import ColumnElement, inspect
from sqlalchemy.orm import InstrumentedAttribute


def apply_soft_delete(entity: Any, *, deactivate: bool = True) -> None:
    now = datetime.now(timezone.utc)
    entity.deleted_at = now
    if deactivate and hasattr(entity, "is_active"):
        entity.is_active = False


def not_deleted(column: InstrumentedAttribute[datetime | None]) -> ColumnElement[bool]:
    return column.is_(None)


def has_soft_delete(model: type) -> bool:
    return "deleted_at" in inspect(model).columns
