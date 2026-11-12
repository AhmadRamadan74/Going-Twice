"""
Going Twice API entry point.

Same modular pattern as Teleoceans ecommerce-households-backend:
routers under /api/v1, unified {status, message, data} envelope.
Swagger at /docs locally; disabled in production.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.exceptions import (
    AppError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ThrottledError,
    ValidationError,
)
from app.core.rate_limit import limiter
from app.core.responses import error_response
from app.core.uploads import ensure_upload_root

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.assert_ready()
    logging.getLogger(__name__).info(
        "Starting %s v%s (%s)",
        settings.PROJECT_NAME,
        settings.VERSION,
        settings.ENVIRONMENT,
    )
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.docs_enabled else None,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    fields = [
        {"field": ".".join(str(loc) for loc in err.get("loc", [])), "error": err.get("msg")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=400,
        content=error_response("Validation failed", data=fields),
    )


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError):
    status_map = {
        NotFoundError: 404,
        ConflictError: 409,
        AuthenticationError: 401,
        AuthorizationError: 403,
        ForbiddenError: 403,
        ValidationError: 400,
        ThrottledError: 429,
    }
    code = 400
    for cls, http_status in status_map.items():
        if isinstance(exc, cls):
            code = http_status
            break
    data = getattr(exc, "errors", None)
    headers = {}
    if isinstance(exc, ThrottledError) and exc.retry_after_seconds:
        headers["Retry-After"] = str(exc.retry_after_seconds)
    return JSONResponse(
        status_code=code,
        content=error_response(exc.message, data=data),
        headers=headers or None,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logging.getLogger(__name__).exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content=error_response("Internal server error"),
    )


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "success",
        "message": f"{settings.PROJECT_NAME} is running",
        "data": {"version": settings.VERSION},
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}


# ── Module routers ────────────────────────────────────────────────────
from app.modules.auth.router import router as auth_router  # noqa: E402
from app.modules.categories.router import router as categories_router  # noqa: E402
from app.modules.materials.router import router as materials_router  # noqa: E402
from app.modules.contact.router import router as contact_router  # noqa: E402
from app.modules.faq.router import router as faq_router  # noqa: E402
from app.modules.journal.router import router as journal_router  # noqa: E402
from app.modules.products.router import router as products_router  # noqa: E402
from app.modules.rooms.router import router as rooms_router  # noqa: E402
from app.modules.sell.router import router as sell_router  # noqa: E402
from app.modules.subscribers.router import router as subscribers_router  # noqa: E402
from app.modules.wishlist.router import router as wishlist_router  # noqa: E402
from app.modules.cart.router import router as cart_router  # noqa: E402
from app.modules.orders.router import router as orders_router  # noqa: E402
from app.modules.notifications.router import router as notifications_router  # noqa: E402
from app.modules.messaging.router import router as messaging_router  # noqa: E402
from app.modules.admin.router import router as admin_router  # noqa: E402
from app.modules.uploads.router import router as uploads_router  # noqa: E402

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(categories_router, prefix=settings.API_V1_STR)
app.include_router(materials_router, prefix=settings.API_V1_STR)
app.include_router(rooms_router, prefix=settings.API_V1_STR)
app.include_router(products_router, prefix=settings.API_V1_STR)
app.include_router(sell_router, prefix=settings.API_V1_STR)
app.include_router(wishlist_router, prefix=settings.API_V1_STR)
app.include_router(cart_router, prefix=settings.API_V1_STR)
app.include_router(orders_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(messaging_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(journal_router, prefix=settings.API_V1_STR)
app.include_router(contact_router, prefix=settings.API_V1_STR)
app.include_router(subscribers_router, prefix=settings.API_V1_STR)
app.include_router(faq_router, prefix=settings.API_V1_STR)
app.include_router(uploads_router, prefix=settings.API_V1_STR)

app.mount(
    "/uploads",
    StaticFiles(directory=str(ensure_upload_root())),
    name="uploads",
)
