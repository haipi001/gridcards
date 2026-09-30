"""GridCards read-only catalogue API.

Scope: the read path only — series, items (filter/sort/paginate), item detail
bundle, listings, offers, activity (market_events) and the two singleton
payloads (spotlight, me). Writes are still frozen in the frontend.

Contract rules, inherited from DEV_AGENTS.md and checked by scripts/verify.ts:
  * card numbers and serials are strings — never ints
  * money is integer cents — never a float, never yuan-as-number
  * market history comes from market_events (activity), nothing else
  * Page<T> is {rows, total, page, pageSize, pageCount}

Responses are serialised back into EXACTLY the shape of public/mock/*.json, so
the frontend can switch from mock files to this API without touching a single
component. `check_parity.py` diffs the two.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from .db import get_db
from .models import Blob, CardVariant, Listing, MarketEvent, Offer, Set

app = FastAPI(title="GridCards API", version="0.1.0")

# The frontend is a separately-hosted static export, so it is always cross-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Rarity ladder, rank ascending = rarest first (mirrors src/market/rarity.ts).
RARITY_RANK = {"ultimate": 0, "legendary": 1, "rare": 2, "uncommon": 3, "base": 4}


# ── serialisers: rows -> the exact mock JSON shape ──────────────────────────


def set_row(s: Set) -> dict[str, Any]:
    return {
        "id": s.id,
        "slug": s.slug,
        "name": s.name,
        "shortName": s.short_name,
        "season": s.season,
        "category": s.category,
        "brand": s.brand,
        "blurb": s.blurb,
        "c1": s.c1,
        "c2": s.c2,
        "tags": s.tags,
        "itemCount": s.item_count,
        "ownerCount": s.owner_count,
        "floorCents": s.floor_cents,
        "volume24hCents": s.volume24h_cents,
        "volumeTotalCents": s.volume_total_cents,
        "change24h": s.change24h,
        "sparkline": s.sparkline,
    }


def item_row(v: CardVariant) -> dict[str, Any]:
    return {
        "id": v.id,
        "seriesId": v.set_id,
        "seriesName": v.set_name,
        "title": v.title,
        "subtitle": v.subtitle,
        "cardNumber": v.card_number,
        "subject": v.subject,
        "team": v.team,
        "kind": v.kind,
        "sectionSlug": v.section_slug,
        "parallel": v.parallel,
        "printRun": v.print_run,
        "serialTotal": v.serial_total,
        "rarity": v.rarity,
        "effect": v.effect,
        "art": {"kind": v.art_kind, "c1": v.art_c1, "c2": v.art_c2},
        "image": v.image,
        "attributes": v.attributes,
        "floorCents": v.floor_cents,
        "lastSaleCents": v.last_sale_cents,
        "askCents": v.ask_cents,
        "listedCount": v.listed_count,
        "ownerCount": v.owner_count,
        "watchers": v.watchers,
        "volume24hCents": v.volume24h_cents,
        "change24h": v.change24h,
    }


def listing_row(l: Listing) -> dict[str, Any]:
    return {
        "id": l.id,
        "itemId": l.item_id,
        "serial": l.serial,
        "priceCents": l.price_cents,
        "seller": {
            "id": l.seller_id,
            "handle": l.seller_handle,
            "rating": l.seller_rating,
            "sales": l.seller_sales,
            "verified": bool(l.seller_verified),
        },
        "kind": l.kind,
        "condition": l.condition,
        "grade": l.grade,
        "createdAt": l.created_at,
        "expiresAt": l.expires_at,
        "views": l.views,
        "watchers": l.watchers,
    }


def offer_row(o: Offer) -> dict[str, Any]:
    return {
        "id": o.id,
        "itemId": o.item_id,
        "serial": o.serial,
        "priceCents": o.price_cents,
        "buyer": {
            "id": o.buyer_id,
            "handle": o.buyer_handle,
            "rating": o.buyer_rating,
            "sales": 0,
            "verified": False,
        },
        "status": o.status,
        "createdAt": o.created_at,
        "expiresAt": o.expires_at,
    }


def event_row(e: MarketEvent) -> dict[str, Any]:
    return {
        "id": e.id,
        "type": e.type,
        "itemId": e.item_id,
        "itemTitle": e.item_title,
        "parallel": e.parallel,
        "serial": e.serial,
        "priceCents": e.price_cents,
        "actor": e.actor,
        "counterparty": e.counterparty,
        "at": e.at,
    }


# ── query building ─────────────────────────────────────────────────────────


def apply_item_filters(
    stmt: Select[tuple[CardVariant]],
    *,
    series_id: str | None,
    rarity: list[str],
    team: list[str],
    parallel: list[str],
    kind: str | None,
    in_stock: bool,
    min_cents: int | None,
    max_cents: int | None,
    q: str | None,
    serial: str | None,
) -> Select[tuple[CardVariant]]:
    if series_id:
        stmt = stmt.where(CardVariant.set_id == series_id)
    if rarity:
        stmt = stmt.where(CardVariant.rarity.in_(rarity))
    if team:
        stmt = stmt.where(CardVariant.team.in_(team))
    if parallel:
        stmt = stmt.where(CardVariant.parallel.in_(parallel))
    if kind:
        stmt = stmt.where(CardVariant.kind == kind)
    if in_stock:
        stmt = stmt.where(CardVariant.listed_count > 0)
    if min_cents is not None:
        stmt = stmt.where(CardVariant.floor_cents >= min_cents)
    if max_cents is not None:
        stmt = stmt.where(CardVariant.floor_cents <= max_cents)
    if serial:
        stmt = stmt.where(CardVariant.card_number.contains(serial))
    if q:
        needle = q.strip().lower()
        if needle:
            stmt = stmt.where(
                or_(
                    func.lower(CardVariant.title).contains(needle),
                    func.lower(CardVariant.subject).contains(needle),
                    func.lower(CardVariant.parallel).contains(needle),
                    func.lower(CardVariant.card_number).contains(needle),
                    func.lower(CardVariant.series_name).contains(needle),
                    func.lower(func.coalesce(CardVariant.team, "")).contains(needle),
                )
            )
    return stmt


def apply_sort(stmt: Select[tuple[CardVariant]], sort: str) -> Select[tuple[CardVariant]]:
    if sort == "floor_asc":
        return stmt.order_by(CardVariant.floor_cents.asc())
    if sort == "volume_desc":
        return stmt.order_by(CardVariant.volume24h_cents.desc())
    if sort == "newest":
        return stmt.order_by(CardVariant.change24h.desc())
    if sort == "rarity":
        # Rarest first, then floor desc. Kept in Python-side CASE to stay
        # portable across SQLite and Postgres.
        from sqlalchemy import case

        rank = case(RARITY_RANK, value=CardVariant.rarity, else_=99)
        return stmt.order_by(rank.asc(), CardVariant.floor_cents.desc())
    return stmt.order_by(CardVariant.floor_cents.desc())


def paginate(rows: list[dict[str, Any]], total: int, page: int, page_size: int) -> dict[str, Any]:
    page_count = max(1, -(-total // page_size))  # ceil
    page = min(max(1, page), page_count)
    return {
        "rows": rows,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "pageCount": page_count,
    }


# ── endpoints ──────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/series")
def series(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [set_row(s) for s in db.scalars(select(Set))]


@app.get("/series/{slug}")
def series_detail(slug: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.scalar(select(Set).where(Set.slug == slug))
    if not row:
        raise HTTPException(404, "series not found")
    return set_row(row)


@app.get("/items")
def items(
    db: Session = Depends(get_db),
    seriesId: str | None = None,
    rarity: list[str] = Query(default=[]),
    team: list[str] = Query(default=[]),
    parallel: list[str] = Query(default=[]),
    kind: str | None = None,
    inStock: bool = False,
    minCents: int | None = None,
    maxCents: int | None = None,
    q: str | None = None,
    serial: str | None = None,
    sort: str = "floor_desc",
    page: int = 1,
    pageSize: int = 24,
) -> dict[str, Any]:
    stmt = apply_item_filters(
        select(CardVariant),
        series_id=seriesId,
        rarity=rarity,
        team=team,
        parallel=parallel,
        kind=kind,
        in_stock=inStock,
        min_cents=minCents,
        max_cents=maxCents,
        q=q,
        serial=serial,
    )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    page_size = min(max(1, pageSize), 96)
    page_count = max(1, -(-total // page_size))
    safe_page = min(max(1, page), page_count)
    rows = db.scalars(
        apply_sort(stmt, sort).offset((safe_page - 1) * page_size).limit(page_size)
    )
    return paginate([item_row(r) for r in rows], total, safe_page, page_size)


@app.get("/items/{item_id}")
def item_detail(item_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(CardVariant, item_id)
    if not row:
        raise HTTPException(404, "item not found")
    return item_row(row)


@app.get("/items/{item_id}/bundle")
def item_bundle(item_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(CardVariant, item_id)
    if not row:
        raise HTTPException(404, "item not found")
    listings = db.scalars(
        select(Listing).where(Listing.item_id == item_id)
    )
    offers = db.scalars(select(Offer).where(Offer.item_id == item_id))
    activity = db.scalars(
        select(MarketEvent)
        .where(MarketEvent.item_id == item_id)
        .order_by(MarketEvent.at.desc())
        .limit(40)
    )
    series_row = db.scalar(select(Set).where(Set.id == row.set_id))
    return {
        "item": item_row(row),
        "listings": [listing_row(l) for l in listings],
        "offers": [offer_row(o) for o in offers],
        "activity": [event_row(e) for e in activity],
        "series": set_row(series_row) if series_row else None,
    }


def _blob(key: str, db: Session) -> dict[str, Any]:
    row = db.get(Blob, key)
    if not row:
        raise HTTPException(404, f"{key} not seeded")
    return row.payload


@app.get("/activity")
def activity(
    db: Session = Depends(get_db), limit: int = 200
) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(MarketEvent).order_by(MarketEvent.at.desc()).limit(min(limit, 500))
    )
    return [event_row(e) for e in rows]


@app.get("/listings")
def listings(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [listing_row(l) for l in db.scalars(select(Listing))]


@app.get("/offers")
def offers(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [offer_row(o) for o in db.scalars(select(Offer))]


@app.get("/spotlight")
def spotlight(db: Session = Depends(get_db)) -> dict[str, Any]:
    return _blob("spotlight", db)


@app.get("/me")
def me(db: Session = Depends(get_db)) -> dict[str, Any]:
    return _blob("me", db)
