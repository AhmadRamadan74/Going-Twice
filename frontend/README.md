# Going Twice

Cairo's curated vintage marketplace — Next.js (App Router) + Tailwind CSS v4.
Implemented from the Figma file `GoingTwice` (node `98:2 — home`).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Design tokens (from Figma)

Defined in `app/globals.css` under `@theme`:

| Token | Value | Use |
|---|---|---|
| `ink` | `#3b2a24` | headings, dark surfaces |
| `ink-deep` | `#2a2018` | hero backdrop |
| `muted` | `#6b5a4a` | secondary body text |
| `wine` | `#6b3d4b` | brand / primary buttons |
| `sage` | `#a8b59a` | eyebrow text on dark |
| `cream` | `#f2e8d6` | light text on dark |
| `parchment` | `#faf7f2` | page background |
| `sand` | `#f5f0e8` | image tile background |
| `linen` | `#ede0cc` | warm image backdrop |
| `line` | `#e8e0d8` | hairline borders |

Type: **Cormorant Garamond** (display / headings) + **Inter** (UI / body).
Loaded via `next/font/google` in the root layout (site-wide).

## Structure

```
app/
  layout.tsx        fonts + metadata
  globals.css       Tailwind v4 theme + tokens
  (site)/page.tsx   homepage
components/
  Header.tsx        logo, search, account/alerts/cart, nav
  Hero.tsx          "A Home Less Ordinary."
  ProductGrid.tsx   ProductCard + reusable 4-up grid
  CollectorsEdit.tsx
  ShopByCategory.tsx
  ShopByRoom.tsx
  ValueProps.tsx
  SellCTA.tsx
  Archive.tsx
  Newsletter.tsx
  Footer.tsx
  SectionHeading.tsx
  icons.tsx         inline SVGs (currentColor)
lib/
  data.ts           all copy + product/category/room/article data
public/images/      exported assets, slugified
```

`ProductGrid` is reused three times (Just Listed / Editor's Picks / More to Discover).

## Backend integration

`lib/api/` holds the axios client (token refresh + `{status, message, data}`
unwrapping) and one typed service per domain. Server components read through
`lib/server-data.ts`; client state for the cart and wishlist lives in
`lib/commerce.tsx`.

Point `NEXT_PUBLIC_API_BASE_URL` at the API. On production builds this must be
the live HTTPS origin (set it as a Dokploy **build-time** argument so Next.js
inlines it). `NEXT_PUBLIC_SITE_URL` is the public site origin used for metadata.
Every catalog page, the cart, the wishlist, checkout, orders, selling and admin
all read and write real backend state.

### Cart and wishlist

Signed in, both are server state (`/cart`, `/wishlist`). Signed out, they are
kept in `localStorage` under `gt_cart` / `gt_wishlist`; on the next login the
guest copy is replayed into the server cart (duplicates and sold pieces are
skipped) and then dropped. Handover preference per piece is kept client-side in
`gt_delivery` and sent at checkout as `item_handover`.

Every piece is one of one, so cart lines have no quantity.

### Sample data

`lib/data.ts` still ships the Figma sample catalog, but it is **not** a runtime
fallback. Set `NEXT_PUBLIC_USE_MOCK_DATA=true` to fall back to it when an API
call fails; with the flag unset a failure propagates and renders the error
page. Sample products carry no backend id and cannot be added to a cart, which
is exactly why silently serving them was worth removing.

## Notes

- Icons are inline SVG components (`components/icons.tsx`) rather than `<img>` tags, so they
  inherit `currentColor` and can be hover-styled. They match the exported SVGs 1:1.
- All sections are responsive; the Figma frame is the 1151px desktop breakpoint.
- Catalog routes (`/product/[id]`, `/category/[slug]`, `/room/[slug]`,
  `/journal/[slug]`) render on demand rather than being prerendered, so they
  always reflect what the API currently publishes.
