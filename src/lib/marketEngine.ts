// Market engine — the transaction layer of DEV_AGENTS.md.
//
// Domain boundaries, never merged:
//   CatalogCard (official card) → Variant (edition) → UserCardCopy (one real
//   physical copy, one holder) → Listing (temporary sell state of ONE copy)
//   → Offer (copy-specific or edition-level bid) → Order (lifecycle, the only
//   source of truth for a completed purchase).
//
// Invariants enforced here, not in the UI:
//   1. Listing uniqueness — a copy has at most one ACTIVE listing.
//   2. Atomic reserve — Buy Now flips ACTIVE → RESERVED under a single
//      read-modify-write, so a second buyer can never reserve the same copy.
//   3. Ownership transfers ONLY when the order reaches COMPLETED.
//   4. Order transitions are forward-only and one step at a time.
//
// Money is always integer cents (`priceCents`), never a float and never
// "yuan as a number" — the display layer turns cents into ¥.
//
// `serialIndex` is the ORDINAL of a copy inside its print run (3 of 5). It is a
// number because it is used for ordering and zero-padding (`03/5`), not a card
// number. The printed card number ("10", "TT-1", "54W-10") is a string and
// travels separately as `serialNumber` (see UserCardCopy.serialNumber).
//
// There is no server: state lives in the storage adapter (localStorage today,
// Postgres tomorrow) and every mutation appends to a local market_events log.
// Everything rendered from it is labeled SANDBOX — it is a walkthrough of the
// real state machine, not market data.
//
// Read/write goes through `getAdapter()` so this file holds rules only. When the
// hosted backend lands, the same rules run against real rows.

import { ownedSerials } from "@/lib/claims";
import { commitMarket, localAdapter } from "@/lib/storage/localAdapter";
import { getAdapter } from "@/lib/storage";
import { money as moneyFmt } from "@/market/format";

export type Role = "seller" | "buyer";

export const SELLER_ID = "you";
export const BUYER_ID = "buyer-local";

export type ListingStatus = "ACTIVE" | "RESERVED" | "CANCELLED" | "FULFILLED";
export type OrderStatus =
  | "RESERVED"
  | "PAID"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";
export type OfferStatus = "OPEN" | "ACCEPTED" | "DECLINED";

export type Listing = {
  id: string;
  editionId: string;
  /** Ordinal within the print run (3 of 5). See header note. */
  serialIndex: number;
  /** Printed card number, always a string. */
  serialNumber?: string;
  priceCents: number;
  sellerId: string;
  status: ListingStatus;
  createdAt: number;
  /** Set when the listing came from a created UserCardCopy (Phase 6+). */
  copyId?: string;
  /** "fixed" = Buy Now, "auction" = accepts bids (see BID_PLACED). */
  kind?: "fixed" | "auction";
};

export type Order = {
  id: string;
  listingId: string;
  editionId: string;
  serialIndex: number;
  serialNumber?: string;
  priceCents: number;
  sellerId: string;
  buyerId: string;
  status: OrderStatus;
  createdAt: number;
  paidAt?: number;
  shippedAt?: number;
  completedAt?: number;
  copyId?: string;
};

export type Offer = {
  id: string;
  editionId: string;
  serialIndex: number | null; // null = edition-level offer
  serialNumber?: string | null;
  amountCents: number;
  buyerId: string;
  status: OfferStatus;
  createdAt: number;
  copyId?: string;
};

export type EventType =
  | "LISTING_CREATED"
  | "LISTING_CANCELLED"
  | "OFFER_MADE"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "ORDER_RESERVED"
  | "ORDER_PAID"
  | "ORDER_SHIPPED"
  | "ORDER_COMPLETED"
  | "OWNERSHIP_TRANSFERRED"
  | "SALE"
  | "BID_PLACED";

export type MarketEvent = {
  id: string;
  type: EventType;
  at: number;
  editionId: string;
  serialIndex: number | null;
  serialNumber?: string | null;
  priceCents?: number;
  actor: string;
  note?: string;
  copyId?: string;
};

export type MarketState = {
  role: Role;
  listings: Listing[];
  orders: Order[];
  offers: Offer[];
  owners: Record<string, string>; // copyId → holder id
  events: MarketEvent[];
};

export function copyId(editionId: string, serialIndex: number): string {
  return `${editionId}#${serialIndex}`;
}

// Factory, not a shared constant: React bails out of a state update when the
// next value is Object.is-equal to the current one, so returning the same EMPTY
// object would silently skip re-renders after the first mutation.
function emptyState(): MarketState {
  return {
    role: "seller",
    listings: [],
    orders: [],
    offers: [],
    owners: {},
    events: [],
  };
}

/** Current market state. Delegated to the storage adapter. */
export function readMarket(): MarketState {
  return getAdapter().snapshot();
}

/**
 * Writes synchronously: the read that produced `next` and this write must stay
 * in the same tick for the atomic-reserve invariant to hold.
 */
function commit(next: MarketState): MarketState {
  return commitMarket(next);
}

export function subscribeMarket(fn: () => void): () => void {
  return getAdapter().subscribe(fn);
}

/** Copies the visitor has created/kept (see storage types). */
export function myCopies() {
  return localAdapter.copies();
}

export function subscribeCopies(fn: () => void): () => void {
  return localAdapter.subscribeCopies(fn);
}

/**
 * Current holder, in priority order:
 *   1. an explicit owner recorded by the market (a completed sale),
 *   2. a UserCardCopy created through /sell (upload → copy),
 *   3. the collector's local serial claim.
 */
export function ownerOf(
  state: MarketState,
  editionId: string,
  serialIndex: number,
): string | null {
  const explicit = state.owners[copyId(editionId, serialIndex)];
  if (explicit) return explicit;
  const copy = getAdapter()
    .copies()
    .find((c) => c.variantId === editionId && c.serialIndex === serialIndex);
  if (copy) return copy.ownerId;
  return ownedSerials(editionId).includes(serialIndex) ? SELLER_ID : null;
}

/**
 * The live listing for a copy. When a `copyId` is known it wins; otherwise the
 * old (edition, serial) key is used. The two never both apply — a copy either
 * came from an upload (has an id) or from a local serial claim.
 */
export function activeListing(
  state: MarketState,
  editionId: string,
  serialIndex: number,
  copyId?: string,
): Listing | undefined {
  return state.listings.find(
    (l) =>
      (copyId
        ? l.copyId === copyId
        : l.editionId === editionId && l.serialIndex === serialIndex) &&
      (l.status === "ACTIVE" || l.status === "RESERVED"),
  );
}

export function orderForListing(state: MarketState, listingId: string): Order | undefined {
  return state.orders.find((o) => o.listingId === listingId);
}

export type Result = { ok: true; state: MarketState } | { ok: false; error: string };

function push(
  state: MarketState,
  type: EventType,
  editionId: string,
  serialIndex: number | null,
  actor: string,
  priceCents?: number,
  note?: string,
): MarketEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    at: Date.now(),
    editionId,
    serialIndex,
    priceCents,
    actor,
    note,
  };
}

export function setRole(role: Role) {
  commit({ ...readMarket(), role });
}

/** True when the amount is a positive whole number of cents. */
function validCents(n: number): boolean {
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

/** Seller lists a copy they hold. One ACTIVE listing per copy. */
export function createListing(
  editionId: string,
  serialIndex: number,
  priceCents: number,
  copyKey?: string,
): Result {
  const state = readMarket();
  if (!validCents(priceCents)) return { ok: false, error: "请输入有效的挂单价" };
  if (ownerOf(state, editionId, serialIndex) !== SELLER_ID)
    return { ok: false, error: "只有持有该编号的人才能挂单" };
  const existing = activeListing(state, editionId, serialIndex, copyKey);
  if (existing) return { ok: false, error: "该编号已在售，不能重复挂单" };

  const listing: Listing = {
    id: `L-${Date.now()}`,
    editionId,
    serialIndex,
    priceCents,
    sellerId: SELLER_ID,
    status: "ACTIVE",
    createdAt: Date.now(),
    copyId: copyKey,
    kind: "fixed",
  };
  const next: MarketState = {
    ...state,
    listings: [listing, ...state.listings],
    owners: { ...state.owners, [copyId(editionId, serialIndex)]: SELLER_ID },
    events: [
      push(state, "LISTING_CREATED", editionId, serialIndex, SELLER_ID, listing.priceCents),
      ...state.events,
    ],
  };
  return { ok: true, state: commit(next) };
}

export function cancelListing(listingId: string): Result {
  const state = readMarket();
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, error: "挂单不存在" };
  if (listing.status !== "ACTIVE")
    return { ok: false, error: "已被预留或完成，无法取消" };
  const next: MarketState = {
    ...state,
    listings: state.listings.map((l) =>
      l.id === listingId ? { ...l, status: "CANCELLED" } : l,
    ),
    events: [
      push(state, "LISTING_CANCELLED", listing.editionId, listing.serialIndex, SELLER_ID),
      ...state.events,
    ],
  };
  return { ok: true, state: commit(next) };
}

/**
 * Buy Now — atomic reserve. Reads state, verifies ACTIVE, writes RESERVED in
 * one commit: two rapid clicks cannot both pass the check.
 */
export function buyNow(listingId: string, buyerId: string = BUYER_ID): Result {
  const state = readMarket();
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, error: "挂单不存在" };
  if (listing.status !== "ACTIVE")
    return { ok: false, error: "该卡已被其他买家预留（同一实体卡只能卖一次）" };
  if (ownerOf(state, listing.editionId, listing.serialIndex) !== listing.sellerId)
    return { ok: false, error: "卖家已不再持有该编号" };

  const order: Order = {
    id: `O-${Date.now()}`,
    listingId: listing.id,
    editionId: listing.editionId,
    serialIndex: listing.serialIndex,
    serialNumber: listing.serialNumber,
    priceCents: listing.priceCents,
    sellerId: listing.sellerId,
    buyerId,
    status: "RESERVED",
    createdAt: Date.now(),
  };
  const next: MarketState = {
    ...state,
    listings: state.listings.map((l) =>
      l.id === listingId ? { ...l, status: "RESERVED" } : l,
    ),
    orders: [order, ...state.orders],
    events: [
      push(
        state,
        "ORDER_RESERVED",
        order.editionId,
        order.serialIndex,
        buyerId,
        order.priceCents,
        "原子预留",
      ),
      ...state.events,
    ],
  };
  return { ok: true, state: commit(next) };
}

export function makeOffer(
  editionId: string,
  serialIndex: number | null,
  amountCents: number,
  buyerId: string = BUYER_ID,
): Result {
  const state = readMarket();
  if (!validCents(amountCents)) return { ok: false, error: "请输入有效的报价" };
  const offer: Offer = {
    id: `F-${Date.now()}`,
    editionId,
    serialIndex,
    amountCents,
    buyerId,
    status: "OPEN",
    createdAt: Date.now(),
  };
  const next: MarketState = {
    ...state,
    offers: [offer, ...state.offers],
    events: [
      push(
        state,
        "OFFER_MADE",
        editionId,
        serialIndex,
        buyerId,
        offer.amountCents,
        serialIndex === null ? "版本级报价" : `编号 ${serialIndex} 报价`,
      ),
      ...state.events,
    ],
  };
  return { ok: true, state: commit(next) };
}

/** Accepting an offer reserves the copy exactly like Buy Now does. */
export function acceptOffer(offerId: string): Result {
  const state = readMarket();
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== "OPEN") return { ok: false, error: "报价已失效" };
  const serialIndex = offer.serialIndex;
  if (serialIndex === null)
    return { ok: false, error: "版本级报价需要卖家指定具体编号后才能成交" };
  if (ownerOf(state, offer.editionId, serialIndex) !== SELLER_ID)
    return { ok: false, error: "你已不再持有该编号" };
  if (activeListing(state, offer.editionId, serialIndex))
    return { ok: false, error: "该编号已有进行中的挂单" };

  const listing: Listing = {
    id: `L-${Date.now()}`,
    editionId: offer.editionId,
    serialIndex,
    serialNumber: offer.serialNumber ?? undefined,
    priceCents: offer.amountCents,
    sellerId: SELLER_ID,
    status: "RESERVED",
    createdAt: Date.now(),
    kind: "fixed",
  };
  const order: Order = {
    id: `O-${Date.now()}`,
    listingId: listing.id,
    editionId: offer.editionId,
    serialIndex,
    serialNumber: offer.serialNumber ?? undefined,
    priceCents: offer.amountCents,
    sellerId: SELLER_ID,
    buyerId: offer.buyerId,
    status: "RESERVED",
    createdAt: Date.now(),
  };
  const next: MarketState = {
    ...state,
    offers: state.offers.map((o) => (o.id === offerId ? { ...o, status: "ACCEPTED" } : o)),
    listings: [listing, ...state.listings],
    orders: [order, ...state.orders],
    owners: { ...state.owners, [copyId(offer.editionId, serialIndex)]: SELLER_ID },
    events: [
      push(state, "OFFER_ACCEPTED", offer.editionId, serialIndex, SELLER_ID, offer.amountCents),
      push(state, "ORDER_RESERVED", offer.editionId, serialIndex, offer.buyerId, offer.amountCents),
      ...state.events,
    ],
  };
  return { ok: true, state: commit(next) };
}

export function declineOffer(offerId: string): Result {
  const state = readMarket();
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== "OPEN") return { ok: false, error: "报价已失效" };
  const next: MarketState = {
    ...state,
    offers: state.offers.map((o) => (o.id === offerId ? { ...o, status: "DECLINED" } : o)),
    events: [
      push(
        state,
        "OFFER_DECLINED",
        offer.editionId,
        offer.serialIndex,
        SELLER_ID,
        offer.amountCents,
      ),
      ...state.events,
    ],
  };
  return { ok: true, state: commit(next) };
}

/** Forward-only transitions: RESERVED → PAID → SHIPPED → COMPLETED. */
export function advanceOrder(orderId: string): Result {
  const state = readMarket();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "订单不存在" };

  const flow: Record<OrderStatus, { next: OrderStatus; type: EventType; at: keyof Order } | null> = {
    RESERVED: { next: "PAID", type: "ORDER_PAID", at: "paidAt" },
    PAID: { next: "SHIPPED", type: "ORDER_SHIPPED", at: "shippedAt" },
    SHIPPED: { next: "COMPLETED", type: "ORDER_COMPLETED", at: "completedAt" },
    COMPLETED: null,
    CANCELLED: null,
  };
  const step = flow[order.status];
  if (!step) return { ok: false, error: "订单已结束" };

  const updated: Order = { ...order, status: step.next, [step.at]: Date.now() } as Order;
  const events = [
    push(state, step.type, order.editionId, order.serialIndex, order.buyerId, order.priceCents),
  ];

  let owners = state.owners;
  let listings = state.listings;
  if (step.next === "COMPLETED") {
    // Ownership moves here and nowhere else.
    owners = { ...state.owners, [copyId(order.editionId, order.serialIndex)]: order.buyerId };
    listings = state.listings.map((l) =>
      l.id === order.listingId ? { ...l, status: "FULFILLED" } : l,
    );
    events.push(
      push(state, "OWNERSHIP_TRANSFERRED", order.editionId, order.serialIndex, order.buyerId),
      push(
        state,
        "SALE",
        order.editionId,
        order.serialIndex,
        order.sellerId,
        order.priceCents,
        "completed order",
      ),
    );
  }

  const next: MarketState = {
    ...state,
    orders: state.orders.map((o) => (o.id === orderId ? updated : o)),
    listings,
    owners,
    events: [...events.reverse(), ...state.events],
  };
  return { ok: true, state: commit(next) };
}

export function resetMarket() {
  commit(emptyState());
}

/**
 * Cents → display string (¥). Name kept as `money` so every call site keeps
 * compiling; what changed is the UNIT — callers now pass cents, not yuan/dollars.
 */
export function money(cents: number): string {
  return moneyFmt(cents);
}

export const EVENT_LABEL: Record<EventType, string> = {
  LISTING_CREATED: "LISTING",
  LISTING_CANCELLED: "CANCELLED",
  OFFER_MADE: "OFFER",
  OFFER_ACCEPTED: "OFFER OK",
  OFFER_DECLINED: "OFFER NO",
  ORDER_RESERVED: "RESERVED",
  ORDER_PAID: "PAID",
  ORDER_SHIPPED: "SHIPPED",
  ORDER_COMPLETED: "COMPLETED",
  OWNERSHIP_TRANSFERRED: "TRANSFER",
  SALE: "SALE",
  BID_PLACED: "BID",
};
