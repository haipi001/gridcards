"""Load the generated mock dataset into the database.

The frontend's mock files (public/mock/*.json) are the contract: this seeder
imports them verbatim, and the API serialises rows back into exactly the same
shape. That is what makes `check_parity.py` able to diff the API against the
JSON files field by field.

  python -m app.seed
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from .db import SessionLocal, init_db
from .models import Blob, CardVariant, Listing, MarketEvent, Offer, Set, User

ROOT = Path(__file__).resolve().parents[2]
MOCK = ROOT / "public" / "mock"


def _read(name: str) -> Any:
    return json.loads((MOCK / name).read_text(encoding="utf-8"))


def _party(row: dict | None) -> tuple[str, str, float, int, bool]:
    """Party object -> flat (id, handle, rating, sales, verified)."""
    if not row:
        return ("", "", 0.0, 0, False)
    return (
        row.get("id", ""),
        row.get("handle", ""),
        float(row.get("rating", 0) or 0),
        int(row.get("sales", 0) or 0),
        bool(row.get("verified", False)),
    )


def seed(db: Session) -> dict[str, int]:
    counts: dict[str, int] = {}

    # ── sets ────────────────────────────────────────────────────────────────
    for s in _read("series.json"):
        db.merge(
            Set(
                id=s["id"],
                slug=s.get("slug", s["id"]),
                name=s["name"],
                short_name=s.get("shortName", s["name"]),
                season=s.get("season", ""),
                category=s.get("category", ""),
                brand=s.get("brand", ""),
                blurb=s.get("blurb", ""),
                c1=s.get("c1", "#000"),
                c2=s.get("c2", "#000"),
                tags=s.get("tags", []),
                item_count=s.get("itemCount", 0),
                owner_count=s.get("ownerCount", 0),
                floor_cents=s.get("floorCents", 0),
                volume24h_cents=s.get("volume24hCents", 0),
                volume_total_cents=s.get("volumeTotalCents", 0),
                change24h=float(s.get("change24h", 0) or 0),
                sparkline=s.get("sparkline", []),
            )
        )
    counts["sets"] = len(_read("series.json"))

    # ── card variants ───────────────────────────────────────────────────────
    items = _read("items.json")
    for it in items:
        art = it.get("art") or {}
        db.merge(
            CardVariant(
                id=it["id"],
                set_id=it["seriesId"],
                set_name=it.get("seriesName", ""),
                title=it.get("title", ""),
                subtitle=it.get("subtitle", ""),
                card_number=str(it.get("cardNumber", "")),  # never an int
                subject=it.get("subject", ""),
                team=it.get("team"),
                kind=it.get("kind", "person"),
                section_slug=it.get("sectionSlug", ""),
                parallel=it.get("parallel", ""),
                print_run=it.get("printRun"),
                serial_total=it.get("serialTotal"),
                rarity=it.get("rarity", "base"),
                effect=it.get("effect", "none"),
                art_kind=art.get("kind", "racer"),
                art_c1=art.get("c1", "#000"),
                art_c2=art.get("c2", "#000"),
                image=it.get("image"),
                attributes=it.get("attributes", []),
                floor_cents=it.get("floorCents", 0),
                last_sale_cents=it.get("lastSaleCents"),
                ask_cents=it.get("askCents"),
                listed_count=it.get("listedCount", 0),
                owner_count=it.get("ownerCount", 0),
                watchers=it.get("watchers", 0),
                volume24h_cents=it.get("volume24hCents", 0),
                change24h=float(it.get("change24h", 0) or 0),
            )
        )
    counts["card_variants"] = len(items)

    # ── users (collected from the parties embedded in listings/offers) ───────
    users: dict[str, User] = {}

    def remember(party: dict | None) -> None:
        pid, handle, rating, sales, verified = _party(party)
        if pid:
            users[pid] = User(
                id=pid,
                handle=handle,
                rating=rating,
                sales=sales,
                verified=1 if verified else 0,
            )

    listings = _read("listings.json")
    offers = _read("offers.json")
    for l in listings:
        remember(l.get("seller"))
    for o in offers:
        remember(o.get("buyer"))
    for u in users.values():
        db.merge(u)
    counts["users"] = len(users)

    # ── listings ────────────────────────────────────────────────────────────
    for l in listings:
        sid, handle, rating, sales, verified = _party(l.get("seller"))
        db.merge(
            Listing(
                id=l["id"],
                item_id=l["itemId"],
                serial=str(l.get("serial", "")),
                price_cents=int(l.get("priceCents", 0)),
                seller_id=sid,
                seller_handle=handle,
                seller_rating=rating,
                seller_sales=sales,
                seller_verified=1 if verified else 0,
                kind=l.get("kind", "fixed"),
                condition=l.get("condition"),
                grade=l.get("grade"),
                created_at=int(l.get("createdAt", 0)),
                expires_at=int(l.get("expiresAt", 0)),
                views=int(l.get("views", 0)),
                watchers=int(l.get("watchers", 0)),
            )
        )
    counts["listings"] = len(listings)

    # ── offers ──────────────────────────────────────────────────────────────
    for o in offers:
        bid, handle, rating, _, _ = _party(o.get("buyer"))
        db.merge(
            Offer(
                id=o["id"],
                item_id=o["itemId"],
                serial=None if o.get("serial") is None else str(o["serial"]),
                price_cents=int(o.get("priceCents", 0)),
                buyer_id=bid,
                buyer_handle=handle,
                buyer_rating=rating,
                status=o.get("status", "OPEN"),
                created_at=int(o.get("createdAt", 0)),
                expires_at=int(o.get("expiresAt", 0)),
            )
        )
    counts["offers"] = len(offers)

    # ── market events ───────────────────────────────────────────────────────
    activity = _read("activity.json")
    for e in activity:
        db.merge(
            MarketEvent(
                id=e["id"],
                type=e.get("type", ""),
                item_id=e["itemId"],
                item_title=e.get("itemTitle", ""),
                parallel=e.get("parallel", ""),
                serial=None if e.get("serial") is None else str(e["serial"]),
                price_cents=e.get("priceCents"),
                actor=e.get("actor", ""),
                counterparty=e.get("counterparty"),
                at=int(e.get("at", 0)),
            )
        )
    counts["market_events"] = len(activity)

    # ── singletons ──────────────────────────────────────────────────────────
    for key, name in (("spotlight", "spotlight.json"), ("me", "me.json")):
        db.merge(Blob(key=key, payload=_read(name)))
    counts["blobs"] = 2

    db.commit()
    return counts


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        counts = seed(db)
    finally:
        db.close()
    for table, n in counts.items():
        print(f"{table:16} {n}")


if __name__ == "__main__":
    main()
