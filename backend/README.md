# Going Twice Backend

FastAPI + PostgreSQL modular backend for a curated P2P vintage marketplace.

The platform handles discovery, listing moderation, order coordination, and
two-sided confirmation. Payment and physical handover happen directly between
buyer and seller.

## Stack

- FastAPI (Swagger at `/docs` locally; hidden when `ENVIRONMENT=production`)
- SQLAlchemy async + asyncpg
- Alembic migrations
- PostgreSQL
- JWT auth (envelope: `{ status, message, data }`)

## Quick start (Docker)

Postgres is **not** started by Docker. Point `POSTGRES_*` in `.env` at the
database service used on deploy (or a local Postgres for development).

```bash
cd backend
cp .env.example .env
docker compose up --build
docker compose exec api python -m scripts.seed
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

### Seed accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@goingtwice.eg` | `admin123` |
| Seller | `seller@goingtwice.eg` | `password123` |
| Buyer | `buyer@goingtwice.eg` | `password123` |

## Main endpoints (`/api/v1`)

| Area | Paths |
|------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/send-verification`, `POST /auth/verify-email` |
| Catalog | `GET /products` (filters: category, room, department, condition, min_price, max_price, q, sort), `GET /products/{slug}`, `GET /products/just-listed`, `GET /products/editors-picks` |
| Taxonomy | `GET /categories`, `GET /rooms` |
| Sell | `POST /sell/list`, `GET /sell/mine`, `GET/PATCH /sell/{id}`, `POST /sell/{id}/resubmit`, `POST /sell/{id}/archive` |
| Wishlist | `GET/POST /wishlist`, `DELETE /wishlist/{product_id}` |
| Cart | `GET /cart`, `POST /cart/items`, `DELETE /cart/items/{product_id}`, `DELETE /cart` |
| Orders | `POST /orders/checkout`, `GET /orders`, `GET /orders/selling`, `GET /orders/{id}`, `POST /orders/{id}/confirm-payment`, `POST /orders/{id}/confirm-handover`, `PATCH /orders/{id}/handover` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /notifications/{id}/read` |
| Admin | `GET /admin/dashboard`, `GET /admin/listings`, `GET /admin/listings/{id}`, `POST /admin/listings/{id}/approve`, `POST /admin/listings/{id}/reject`, `GET /admin/orders` |
| Journal | `GET /journal`, `GET /journal/{slug}` |
| Contact | `POST /contact/messages` |
| Newsletter | `POST /subscribers/subscribe` |
| Help | `GET /faq` |

Roles are `admin` and `customer`. The same customer account can buy and sell.

Listing statuses: `draft` → `pending_review` → `published` (or `rejected`). Also `sold`, `archived`.

Order confirmations are independent flags (`buyer_confirmed_payment`, `seller_confirmed_handover`). When both are true the order becomes `completed` and the piece is `sold`.

`POST /orders/checkout` turns the server-side cart into one order per piece —
each piece is unique and has its own seller. It accepts `handover_type`
(`self_pickup` | `shipping`) for the whole checkout plus an `item_handover`
map of `product_id -> handover_type` for per-piece overrides.

## Email

All transactional mail goes through `app/core/email.py`, which fronts three
senders selected by `MAIL_PROVIDER`:

| Provider | Use |
|----------|-----|
| `console` | logs the message — local development and tests (also used whenever `MAIL_ENABLED=false`) |
| `resend`  | Resend HTTP API, needs `MAIL_API_KEY` |
| `smtp`    | any SMTP server, needs `SMTP_HOST` (+ credentials) |

Sending is **best effort**: a mail outage is logged and reported as `False`, and
never turns a successful registration or password reset into a 500.

Set SPF, DKIM and DMARC on the sending domain or messages will land in spam.

### Email verification

Registration emails a six-digit code. Codes are stored as an HMAC-SHA256 digest
keyed with `JWT_SECRET_KEY` (a plain hash of a six-digit secret would be trivial
to reverse), expire after `EMAIL_VERIFICATION_EXPIRE_MINUTES`, allow
`EMAIL_VERIFICATION_MAX_ATTEMPTS` guesses, and are single-use. Requesting a new
code before `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` returns `429` with a
`Retry-After` header.

`AUTH_ALLOW_MAGIC_OTP_BYPASS=true` makes `AUTH_MAGIC_OTP_CODE` (default
`000000`) verify any account — it is **off by default** and additionally
refused whenever `ENVIRONMENT` is `production`/`prod`/`live`, so it cannot be
switched on in production by accident. Outside production the send response
also carries `debug_code` so you can verify without a mailbox.

## Tests

```bash
pip install -r requirements.txt
pytest
```

The suite runs against in-memory SQLite and a stub mail sender, so it needs
neither Postgres nor a mail provider. `DATABASE_URL_OVERRIDE` (set by
`tests/conftest.py`) points the engine at SQLite; leave it unset in
deployments so the `POSTGRES_*` settings are used.

## Production

Set `ENVIRONMENT=production` and fill `.env.example` on the host (Postgres,
a unique `JWT_SECRET_KEY`, HTTPS `CORS_ORIGINS` / `FRONTEND_URL`, real SMTP).
The process refuses to start if those still look like a developer laptop.
Do not set `DATABASE_URL_OVERRIDE` in production.
