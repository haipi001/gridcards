# AGENTS.md · Marketplace-first

## Product invariant

This is a **physical card marketplace first**, with collection and social layers.

## Domain boundaries

### CatalogCard
Official card definition. Never owned directly.

### Variant
Official parallel / edition under a CatalogCard.

### UserCardCopy
One real physical card copy owned by one user.

### Listing
Temporary sell state for one UserCardCopy.

### Offer
Copy-specific or Edition-level bid.

### Order
Transaction lifecycle. It is the source of truth for purchase completion.

Never merge these concepts.

## Ownership

Do not change `owner_id` at checkout start or payment authorization.
Ownership transfers only when an Order reaches COMPLETED.

## Concurrency

A physical copy can only be sold once.
Buy Now must atomically reserve the listing in the database.
Never trust client state to determine availability.

The mock generator obeys the same rule: one listing per (itemId, serial), no
two sellers offering 36/50 at the same time. `npm run verify` enforces it.

## Debug switches are not features

`?trade=1` (unfreeze trade buttons) and `?fail=1` (force a read error) are
review tools. They resolve through `DEV_SWITCHES` in `src/market/config.ts`:
on in `next dev`, off in production unless `NEXT_PUBLIC_DEV_SWITCHES=1`.
A visitor must never be able to unfreeze a frozen market by editing the URL,
and the frozen-state copy must never advertise a switch that does nothing.

## Data gate

`npm run verify` (scripts/verify.ts) checks the generated dataset before any
build: id uniqueness, integer cents, card numbers and serials as strings, one
listing per physical copy, no dangling references, real image files on disk.
It runs automatically via `prebuild`. Add a check whenever a generator
invariant is worth protecting.

## Card numbers

Always strings:

- `10`
- `TT-1`
- `54W-10`
- `F1A-LH`

## Market truth

Use `market_events` / completed orders for sales and activity statistics.
Do not derive sale history from social posts.

## RuiC rendering

- Grid: optimized static image + CSS hover only.
- Detail: lazy-load WebGL.
- Upload: Flat Effect Mode must work from one image.
- Relief Mode optional.
- preserve CSS/static fallback.
- honor reduced motion and cap mobile DPR.

## Uploads

- object storage only
- strip EXIF/GPS
- validate MIME/magic bytes
- never commit user uploads

## Storage adapter

All reads and writes go through `getAdapter()` (`src/lib/storage/`). Pages must
never touch `localStorage` or IndexedDB directly.

- `localAdapter` (today): market state in localStorage, photo bytes in IndexedDB.
- `cloudAdapter` (later): same interface, object storage + Postgres. Swapping it
  changes `BlobRef.kind` from `"idb"` to `"url"` and nothing else.

**Atomicity rule:** `mutate()` runs read → transform → write in one synchronous
tick. Never `await` between them, or "one copy can only be reserved once"
stops being true. Write image bytes *after* the commit.

## Local pipeline (no server)

`/sell` → ingest (canvas re-encode strips EXIF) → IndexedDB → 3D preview
(`CardEffectsViewer`, RuiC shaders on raw WebGL, CSS 3D fallback) →
`UserCardCopy` → optional `createListing` → edition serial market + activity.
Photos never leave the device and are never committed.

## Open-source

RuiC-card-skill is MIT. Preserve license and copyright notice.

## Testing priorities

1. Marketplace browse/query correctness.
2. Listing uniqueness.
3. Atomic reserve / double-purchase prevention.
4. Payment webhook idempotency.
5. Order state transitions.
6. Ownership transfer.
7. RuiC upload preview.
8. Social features last.

Protect the E2E:

`Seller Upload → List → Buyer Search → Select Copy → Buy → Ship → Complete → Ownership Transfer → Sale Activity`
