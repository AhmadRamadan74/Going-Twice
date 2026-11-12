DEFAULT_PER_PAGE = 24
MAX_PER_PAGE = 100


def clamp_per_page(per_page: int | None) -> int:
    value = per_page or DEFAULT_PER_PAGE
    return max(1, min(value, MAX_PER_PAGE))


def paginated(items: list, total: int, page: int, per_page: int) -> dict:
    pages = (total + per_page - 1) // per_page if total > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }
