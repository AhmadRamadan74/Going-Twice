<p align="center">
  <img src="frontend/public/logo/logo-primary.png" alt="Going Twice" width="220" />
</p>

<h3 align="center">A Home Less Ordinary.</h3>

<p align="center">
  Cairo's curated peer-to-peer marketplace for vintage furniture, lighting, art and decor.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" />
</p>

---

## About

**Going Twice** connects people who have beautiful old pieces with people who want them.
Anyone can sell: list a piece with photos, and an admin reviews it before it goes live, so
the catalog stays curated. Buyers browse, save favourites, check out and message the seller.

The platform coordinates the deal; it does not hold money. Payment and the physical
handover happen directly between buyer and seller, and each side confirms their part
in the app.

## How it works

```
 Seller                        Admin                        Buyer
 ──────                        ─────                        ─────
 List a piece ──► pending_review ──► approve ──► published ──► add to cart ──► checkout
                        │                                                      │
                        └──► reject ──► seller edits & resubmits               ▼
                                                                    one order per piece
                                                                (self-pickup or shipping)
                                                                               │
                  buyer confirms payment  +  seller confirms handover  ◄───────┘
                                          │
                                          ▼
                               order completed, piece sold
```

## Features

**Shopping**
- Browse by category (furniture, lighting, art, decoration), by room, or the Collector's Edit
- Search and filter by condition, price and department; sort the results
- Wishlist, cart and checkout, with self-pickup or shipping chosen per piece

**Selling**
- List a piece with up to 7 photos, then edit, resubmit or archive it
- Track your listings and the orders on them from your account

**Communication**
- Buyer–seller messaging
- In-app notifications with unread counts
- Transactional email: verification codes, password reset, order updates

**Admin**
- Dashboard with platform stats
- Review queue to approve or reject listings
- Overview of all orders

**Content**
- Journal (editorial articles), FAQ / help centre, contact form and newsletter sign-up

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Axios |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2 (async) with asyncpg, Alembic |
| Database | PostgreSQL (SQLite for local development and tests) |
| Auth | JWT access and refresh tokens, bcrypt, email OTP verification |
| Email | SMTP or Resend, with a console sender for development |
| Infrastructure | Docker; deployed on Dokploy |

## Project structure

```
Going-Twice/
├── frontend/                 Next.js web app
│   ├── app/
│   │   ├── (site)/           shop, product, cart, checkout, sell, account, messages, journal…
│   │   ├── (auth)/           login, signup, verify email, password reset
│   │   └── admin/            admin dashboard
│   ├── components/           UI components
│   ├── lib/                  API client, auth context, data helpers
│   └── public/               logos, icons, images
│
└── backend/                  FastAPI service
    ├── app/
    │   ├── core/             config, database, security, email, shared repository
    │   └── modules/          auth, products, sell, cart, orders, wishlist, messaging,
    │                         notifications, admin, categories, rooms, materials,
    │                         journal, faq, contact, subscribers, uploads
    ├── alembic/              database migrations
    ├── scripts/              seed data, create admin
    └── tests/                pytest suite
```

## Getting started

### Prerequisites

- Node.js 22+
- Python 3.12+
- PostgreSQL (optional locally; SQLite works for development)

### 1. Backend

```bash
cd backend
cp .env.example .env
```

For local development, edit `.env` as described at the top of `.env.example`:

```env
ENVIRONMENT=local
DATABASE_URL_OVERRIDE=sqlite:///./goingtwice.db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
MAIL_PROVIDER=console
```

Then install, migrate, seed and run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.migrate_and_seed     # create tables and sample data
uvicorn app.main:app --reload
```

- API: http://localhost:8000/api/v1
- Interactive docs (Swagger): http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000. The default `.env` already points at the local API
(`NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`).

### Sample accounts

The seed script creates an admin, a seller and a buyer account. Their logins are
listed in [backend/README.md](backend/README.md#seed-accounts). They are for
local development only, so never seed a production database with them.

To create a real admin:

```bash
cd backend
python -m scripts.create_admin <email> <password> "<full name>"
```

## Running tests

```bash
cd backend
pytest
```

The suite runs on in-memory SQLite with a stub mail sender, so it needs no
Postgres or mail provider.

```bash
cd frontend
npx tsc --noEmit      # type check
```

## Deployment

Both apps ship with a `Dockerfile` and are deployed as separate services
(Dokploy in production).

- **Backend:** `cd backend && docker compose up --build`. The container runs
  migrations on start, then serves on port 8000. PostgreSQL is a separate
  service; point `POSTGRES_*` at it. With `ENVIRONMENT=production` the API
  refuses to start if secrets, database, CORS or mail are still on development
  defaults.
- **Frontend:** pass `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SITE_URL` as
  **build-time** arguments, because Next.js inlines them during the build.

Every environment variable is documented in `backend/.env.example` and
`frontend/.env.example`.

## Documentation

- [Backend README](backend/README.md): API endpoints, order and listing
  lifecycle, email setup, production checklist
- [Frontend README](frontend/README.md): design tokens, fonts and component layout
