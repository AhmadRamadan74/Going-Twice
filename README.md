# Going Twice

Cairo's curated peer-to-peer vintage marketplace. Sellers list one-of-a-kind
pieces, an admin reviews each listing before it goes live, and buyers check out
pieces and coordinate handover. Payment and physical handover happen directly
between buyer and seller; the platform tracks both sides' confirmations.

| Folder | Stack | Docs |
|--------|-------|------|
| [`frontend/`](frontend) | Next.js 15 (App Router), React 19, Tailwind CSS v4, TypeScript | [frontend/README.md](frontend/README.md) |
| [`backend/`](backend) | FastAPI, SQLAlchemy (async), PostgreSQL, Alembic, JWT auth | [backend/README.md](backend/README.md) |

## Features

- Browse and search the catalog by category, room, condition and price
- Sell flow: list a piece with photos, then it goes through admin review (approve / reject / resubmit)
- Wishlist, cart and checkout (one order per piece, self-pickup or shipping)
- Two-sided order confirmation: buyer confirms payment, seller confirms handover
- Buyer–seller messaging and in-app notifications
- Email verification, password reset and transactional email (SMTP / Resend)
- Admin dashboard for listings and orders
- Journal, FAQ, contact form and newsletter

## Run locally

**Backend** (http://localhost:8000, Swagger at `/docs`):

```bash
cd backend
cp .env.example .env          # for local dev, follow the notes at the top of the file
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed        # optional sample data and seed accounts
uvicorn app.main:app --reload
```

Or with Docker: `cd backend && docker compose up --build` (Postgres is not included; point `POSTGRES_*` at your database).

**Frontend** (http://localhost:3000):

```bash
cd frontend
cp .env.example .env          # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
npm install
npm run dev
```

## Tests

```bash
cd backend && pytest          # runs on in-memory SQLite, no Postgres or mail needed
```
