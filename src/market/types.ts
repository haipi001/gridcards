// Market domain types — shaped like the REST payloads the site will eventually
// consume, so swapping the mock loader for a real endpoint is a one-file change
// (see src/market/api.ts).
//
// Two hard rules carried over from the rest of the app:
//   · card numbers and serials are ALWAYS strings ("1", "TT-1", "54W-10")
//   · money is ALWAYS integer minor units (cents), never floats

export type RarityTier = "ultimate" | "legendary" | "rare" | "uncommon" | "base";

export type ArtKind = "racer" | "car" | "crest";

export type CardArt = { kind: ArtKind; c1: string; c2: string };

export type Attribute = {
  trait: string;
  value: string;
  /** Share of the collection carrying this value — drives the rarity chip. */
  pct?: number;
};

/** A tradeable edition (NBA Top Shot calls this a moment). */
export type MarketItem = {
  id: string;
  seriesId: string;
  seriesName: string;
  title: string;
  subtitle: string;
  cardNumber: string;
  subject: string;
  team: string | null;
  kind: "person" | "collection";
  sectionSlug: string;
  parallel: string;
  /** null = unnumbered */
  printRun: number | null;
  serialTotal: number | null;
  rarity: RarityTier;
  effect: string;
  art: CardArt;
  /** Real 1/1 scan when one exists, otherwise null → generated livery art. */
  image: string | null;
  attributes: Attribute[];
  floorCents: number;
  lastSaleCents: number;
  askCents: number;
  listedCount: number;
  ownerCount: number;
  watchers: number;
  volume24hCents: number;
  change24h: number;
};

/** A collection (OpenSea-style). */
export type MarketSeries = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  season: string;
  category: string;
  brand: string;
  blurb: string;
  c1: string;
  c2: string;
  tags: string[];
  itemCount: number;
  ownerCount: number;
  floorCents: number;
  volume24hCents: number;
  volumeTotalCents: number;
  change24h: number;
  sparkline: number[];
};

export type Party = {
  id: string;
  handle: string;
  rating: number;
  sales: number;
  verified: boolean;
};

export type Listing = {
  id: string;
  itemId: string;
  serial: string;
  serialTotal: number | null;
  priceCents: number;
  seller: Party;
  kind: "fixed" | "auction";
  condition: string;
  grade: string | null;
  createdAt: number;
  expiresAt: number;
  views: number;
  watchers: number;
};

export type OfferStatus = "OPEN" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export type Offer = {
  id: string;
  itemId: string;
  serial: string | null;
  priceCents: number;
  buyer: Party;
  status: OfferStatus;
  createdAt: number;
  expiresAt: number;
};

export type ActivityType =
  | "SALE"
  | "LISTING"
  | "OFFER"
  | "ACCEPTED_OFFER"
  | "TRANSFER"
  | "DELIST";

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  itemId: string;
  itemTitle: string;
  parallel: string;
  serial: string;
  priceCents: number | null;
  actor: Party;
  counterparty: Party;
  at: number;
};

export type OwnedCopy = {
  copyId: string;
  itemId: string;
  serial: string;
  serialTotal: number | null;
  acquiredCents: number;
  at: number;
  grade: string | null;
  status: "HELD" | "LISTED" | "ESCROW";
};

export type MyListing = {
  id: string;
  itemId: string;
  copyId: string;
  serial: string;
  serialTotal: number | null;
  priceCents: number;
  status: "ACTIVE" | "RESERVED" | "CANCELLED" | "FULFILLED";
  views: number;
  watchers: number;
  createdAt: number;
  expiresAt: number;
};

export type MyOffer = {
  id: string;
  itemId: string;
  priceCents: number;
  status: OfferStatus;
  buyer?: Party;
  createdAt: number;
  expiresAt: number;
};

export type Account = {
  id: string;
  handle: string;
  rating: number;
  sales: number;
  verified: boolean;
  currency: string;
  balanceCents: number;
  pendingCents: number;
  lockedCents: number;
};

export type MePayload = {
  user: Account;
  assets: OwnedCopy[];
  listings: MyListing[];
  offersMade: MyOffer[];
  offersReceived: MyOffer[];
  watchlist: string[];
};

export type Spotlight = {
  hero: Array<{
    itemId: string;
    title: string;
    parallel: string;
    image: string | null;
    art: CardArt;
    floorCents: number;
    tag: string;
  }>;
  hotSeries: Array<{
    rank: number;
    seriesId: string;
    name: string;
    volume24hCents: number;
    change24h: number;
    floorCents: number;
    itemCount: number;
    c1: string;
    c2: string;
  }>;
  rareSales: Array<{
    id: string;
    itemId: string;
    title: string;
    parallel: string;
    serial: string;
    priceCents: number;
    at: number;
    buyer: string;
    seller: string;
  }>;
  leaderboard: Array<{
    rank: number;
    handle: string;
    avatar: string;
    trades: number;
    volumeCents: number;
    change: number;
  }>;
  movers: Array<{
    itemId: string;
    title: string;
    parallel: string;
    change24h: number;
    floorCents: number;
    art: CardArt;
  }>;
};

/* ------------------------------------------------------------- query shape --- */

export type ItemSort =
  | "floor_desc"
  | "floor_asc"
  | "volume_desc"
  | "newest"
  | "rarity";

export type ItemQuery = {
  seriesId?: string;
  rarity?: RarityTier[];
  /** Serial number filter — matches serials on listings, string compare. */
  serial?: string;
  /** Constructor / team names, exact match; empty array = no filter. */
  team?: string[];
  /** Parallel names ("Base", "SuperFractor 1/1"…), exact match. */
  parallel?: string[];
  /** Subject kind. Empty = both. */
  kind?: "person" | "collection";
  /** When true, keep only items with at least one active listing. */
  inStock?: boolean;
  minCents?: number;
  maxCents?: number;
  q?: string;
  sort?: ItemSort;
  page?: number;
  pageSize?: number;
};

export type Page<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
