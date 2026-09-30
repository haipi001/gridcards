"""ORM models for the read-only catalogue.

Naming follows docs/reference/legacy-drizzle-schema.md where it makes sense
(sets / card_variants / listings / offers / market_events / users). Scope is the
read-only catalogue, so two deliberate deviations:

  * `card_variants` holds the whole MarketItem. The legacy schema split identity
    across cards + card_variants; the mock dataset ships them merged as one
    object per (subject, parallel) and we mirror what the frontend consumes.
  * `blobs` stores the two singleton payloads (spotlight, me) as JSON rather
    than inventing tables for them before the write path exists.

Two invariants from DEV_AGENTS.md are enforced in the column types:
  * card numbers / serials are TEXT — never an int ("10", "TT-1", "54W-10")
  * money is INTEGER cents — never a float, never yuan-as-number
"""

from __future__ import annotations

from sqlalchemy import JSON, BigInteger, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Set(Base):
    """A collection / series. Legacy name: sets."""

    __tablename__ = "sets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String)
    short_name: Mapped[str] = mapped_column(String)
    season: Mapped[str] = mapped_column(String, index=True)
    category: Mapped[str] = mapped_column(String)
    brand: Mapped[str] = mapped_column(String)
    blurb: Mapped[str] = mapped_column(Text)
    c1: Mapped[str] = mapped_column(String)
    c2: Mapped[str] = mapped_column(String)
    tags: Mapped[list] = mapped_column(JSON)
    item_count: Mapped[int] = mapped_column(Integer)
    owner_count: Mapped[int] = mapped_column(Integer)
    floor_cents: Mapped[int] = mapped_column(Integer)
    volume24h_cents: Mapped[int] = mapped_column(Integer)
    volume_total_cents: Mapped[int] = mapped_column(Integer)
    change24h: Mapped[float] = mapped_column(Float)
    sparkline: Mapped[list] = mapped_column(JSON)


class CardVariant(Base):
    """One tradeable version = subject x parallel. Legacy name: card_variants."""

    __tablename__ = "card_variants"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    set_id: Mapped[str] = mapped_column(String, index=True)
    set_name: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    subtitle: Mapped[str] = mapped_column(String)
    # Always a string: "1", "TT-1", "54W-10", "F1A-LH".
    card_number: Mapped[str] = mapped_column(String)
    subject: Mapped[str] = mapped_column(String, index=True)
    team: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    kind: Mapped[str] = mapped_column(String, index=True)
    section_slug: Mapped[str] = mapped_column(String)
    parallel: Mapped[str] = mapped_column(String, index=True)
    print_run: Mapped[int | None] = mapped_column(Integer, nullable=True)
    serial_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rarity: Mapped[str] = mapped_column(String, index=True)
    effect: Mapped[str] = mapped_column(String, index=True)
    art_kind: Mapped[str] = mapped_column(String)
    art_c1: Mapped[str] = mapped_column(String)
    art_c2: Mapped[str] = mapped_column(String)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    attributes: Mapped[list] = mapped_column(JSON)

    floor_cents: Mapped[int] = mapped_column(Integer, index=True)
    last_sale_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ask_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    listed_count: Mapped[int] = mapped_column(Integer, index=True)
    owner_count: Mapped[int] = mapped_column(Integer)
    watchers: Mapped[int] = mapped_column(Integer)
    volume24h_cents: Mapped[int] = mapped_column(Integer)
    change24h: Mapped[float] = mapped_column(Float)


class User(Base):
    """A market party (seller / buyer). Legacy name: users."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    handle: Mapped[str] = mapped_column(String)
    rating: Mapped[float] = mapped_column(Float)
    sales: Mapped[int] = mapped_column(Integer)
    verified: Mapped[bool] = mapped_column(Integer)


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    item_id: Mapped[str] = mapped_column(String, index=True)
    serial: Mapped[str] = mapped_column(String)  # string, never int
    price_cents: Mapped[int] = mapped_column(Integer)
    seller_id: Mapped[str] = mapped_column(String, index=True)
    seller_handle: Mapped[str] = mapped_column(String)
    seller_rating: Mapped[float] = mapped_column(Float)
    seller_sales: Mapped[int] = mapped_column(Integer)
    seller_verified: Mapped[bool] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String)  # fixed | auction
    condition: Mapped[str | None] = mapped_column(String, nullable=True)
    grade: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger)
    expires_at: Mapped[int] = mapped_column(BigInteger)
    views: Mapped[int] = mapped_column(Integer)
    watchers: Mapped[int] = mapped_column(Integer)


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    item_id: Mapped[str] = mapped_column(String, index=True)
    serial: Mapped[str | None] = mapped_column(String, nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer)
    buyer_id: Mapped[str] = mapped_column(String, index=True)
    buyer_handle: Mapped[str] = mapped_column(String)
    buyer_rating: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[int] = mapped_column(BigInteger)
    expires_at: Mapped[int] = mapped_column(BigInteger)


class MarketEvent(Base):
    """The only source of truth for market history. Legacy: market_events."""

    __tablename__ = "market_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    type: Mapped[str] = mapped_column(String, index=True)
    item_id: Mapped[str] = mapped_column(String, index=True)
    item_title: Mapped[str] = mapped_column(String)
    parallel: Mapped[str] = mapped_column(String)
    serial: Mapped[str | None] = mapped_column(String, nullable=True)
    price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Both are embedded Party objects in the mock payload, so they stay JSON —
    # flattening them would break the frontend's ActivityEvent contract.
    actor: Mapped[dict] = mapped_column(JSON)
    counterparty: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    at: Mapped[int] = mapped_column(BigInteger, index=True)


class Blob(Base):
    """Singleton JSON payloads (spotlight, me) until the write path exists."""

    __tablename__ = "blobs"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)
