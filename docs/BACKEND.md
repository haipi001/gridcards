# Backend

The site ships as `output: "export"` — a folder of static files with no server
process. Everything below is the **read path** against a real API, deployed
separately from the frontend.

```
browser  ──fetch──>  FastAPI (server/)  ──SQLAlchemy──>  SQLite / Postgres
                          │
                          └── same JSON shapes as public/mock/*.json
```

The frontend keeps working with no backend at all: when
`NEXT_PUBLIC_MARKET_API` is unset it reads `/mock/*.json` and filters in the
browser. Setting the variable switches it to the API. **No component changes.**

---

## 1 · Running it

```bash
cd server
python -m venv .venv && ./.venv/bin/pip install -r requirements.txt

python -m app.seed                 # import public/mock/*.json into the DB
python -m uvicorn app.main:app --reload --port 8000
```

Then point the frontend at it and build:

```bash
NEXT_PUBLIC_MARKET_API=http://127.0.0.1:8000 npm run build
```

`DATABASE_URL` defaults to `sqlite:///./gridcards.db`. Point it at Postgres
(`postgresql+psycopg://…`) and nothing in the code changes — that is the only
reason SQLAlchemy is in the stack.

## 2 · Verifying it

Two checks, both runnable in CI:

| Script | What it proves |
|---|---|
| `server/check_parity.py` | The API's JSON is **field-for-field identical** to `public/mock/*.json` (302 items deep-compared, plus series/spotlight/me/bundle and the two invariants). |
| `scripts/check-api-seam.ts` | `src/market/api.ts` — the module every component actually calls — works against the live backend: paging, server-side filters, bundle, invariants. |

```bash
# server running on :8000
python server/check_parity.py
NEXT_PUBLIC_MARKET_API=http://127.0.0.1:8000 npx tsx scripts/check-api-seam.ts
```

`check_parity.py` is the important one: it is what stops the API from quietly
drifting away from `src/market/types.ts` and breaking pages.

## 3 · Endpoints (read-only this round)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/series` | all collections |
| GET | `/series/{slug}` | one collection |
| GET | `/items` | filter + sort + paginate, returns `Page<MarketItem>` |
| GET | `/items/{id}` | one item, 404 when unknown |
| GET | `/items/{id}/bundle` | `{item, listings, offers, activity, series}` in one round trip |
| GET | `/listings` | |
| GET | `/offers` | |
| GET | `/activity` | market_events, newest first, capped at 500 |
| GET | `/spotlight` | singleton payload |
| GET | `/me` | singleton payload |

### `GET /items` query params

`seriesId`, `rarity` (repeatable), `team` (repeatable), `parallel`
(repeatable), `kind`, `inStock`, `minCents`, `maxCents`, `q`, `serial`, `sort`,
`page`, `pageSize` (max 96).

`sort` ∈ `floor_desc` (default) · `floor_asc` · `volume_desc` · `newest` ·
`rarity`. Rarity sorts rarest-first, then floor desc — the same order as
`src/market/rarity.ts`.

## 4 · Schema

`server/app/models.py`. Naming follows
[`docs/reference/legacy-drizzle-schema.md`](reference/legacy-drizzle-schema.md)
where it makes sense — `sets`, `card_variants`, `listings`, `offers`,
`market_events`, `users`. Two deliberate deviations:

- **`card_variants` holds the whole `MarketItem`.** The legacy schema split
  identity across `cards` + `card_variants`; the dataset ships them merged as one
  object per (subject × parallel), and the API mirrors what the frontend
  consumes.
- **`blobs` stores the two singletons** (spotlight, me) as JSON rather than
  inventing tables before the write path exists.

Two invariants are enforced in the column types, not in prose:

- card numbers and serials are `String` — never an int (`"10"`, `"TT-1"`,
  `"54W-10"`)
- money is `Integer` **cents** — never a float, never yuan-as-number

## 5 · The four seams

| # | Seam | File | Status |
|---|---|---|---|
| 1 | Data source | `src/market/config.ts` (`API_BASE`, `MOCK_MODE`) | ✅ done |
| 2 | Read path | `src/market/api.ts` (7 `load*`, now branching on `MOCK_MODE`) | ✅ done (read only) |
| 3 | Write path | `src/market/actions.ts` + `src/lib/marketEngine.ts` | ❌ still local-only |
| 4 | Storage | `src/lib/storage/` — `getAdapter()`; swapping `localAdapter` → `cloudAdapter` should be the only change | ❌ `cloudAdapter` not implemented |

Seams 1–2 are what this round delivered. Note that seam 3 is currently
**two** independent implementations (`src/market/ledger.ts` for `/market/me`,
`src/lib/marketEngine.ts` for `/orders` + the copy-level market) with different
ID spaces; unifying them is a prerequisite for moving writes to the server.

## 6 · Still missing before this is a real market

Tracked honestly — this round is read-only catalogue only.

1. **Writes**: `POST /listings`, `POST /offers`, `POST /orders/buy-now`. Needs
   the two engines unified first.
2. **Auth**: no sessions, no tokens. `SELLER_ID = "you"` /
   `BUYER_ID = "buyer-local"` are hardcoded strings in `marketEngine.ts`.
3. **Atomic reserve**: today the "a copy can only be reserved once" guarantee
   comes from JS being single-threaded (`localAdapter.mutate()` does
   read → transform → write in one tick). Against a real DB this needs a
   transaction or advisory lock.
4. **Idempotency**: payment webhooks, order state transitions.
5. **Image upload**: `putImage()` writes IndexedDB. Needs signed-URL upload to
   object storage and the `BlobRef.kind: "url"` branch (already handled in
   `resolveUrl`, but nothing produces it yet).
6. **Order fulfilment**: `shipments` table exists in the legacy schema; there is
   no tracking or logistics.
7. **`market_stats`**: floor price / volume aggregates are currently computed by
   the mock generator. Needs a scheduled job or triggers.

## 7 · Deploying

The frontend stays a static export; only `NEXT_PUBLIC_MARKET_API` changes. Remember:

- the variable is **baked in at build time** — changing it requires a rebuild
- the backend needs CORS for the frontend's origin (`main.py` currently allows
  `*`; tighten this before production)
- `output: "export"` ignores `next.config.ts`'s `headers()`, so security headers
  live in `public/_headers`, `vercel.json` and `netlify.toml` — change all three

See [DEPLOY.md](DEPLOY.md).
