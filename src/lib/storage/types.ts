// Storage contract for the whole app.
//
// Pages depend on this interface only — never on localStorage or IndexedDB
// directly. Today the only implementation is `localAdapter` (browser storage);
// when the hosted backend is activated a `cloudAdapter` (object storage paths +
// Postgres) is dropped in behind the same interface and no page changes.
//
// See docs/reference/legacy-drizzle-schema.md for the server-side counterpart
// of the types below.

import type {
  MarketState,
  Order,
  Listing,
  Offer,
} from "@/lib/marketEngine";
import type { CardEffectMode, CardEffectProfile } from "@/components/card-effects/types";

/** MarketSnapshot is the market engine's state — one definition, one truth. */
export type MarketSnapshot = MarketState;

export type { Order, Listing, Offer };

/**
 * Where an image actually lives.
 *   idb  → a blob in IndexedDB on this device (local adapter)
 *   url  → an object-storage key resolved to a signed URL (cloud adapter)
 * Swapping the adapter changes `kind`, nothing else.
 */
export type BlobRef =
  | { kind: "idb"; key: string }
  | { kind: "url"; url: string };

export type ImageSize = "full" | "card" | "thumb";

export type ImageSet = {
  full: BlobRef;
  card: BlobRef;
  thumb: BlobRef;
  width: number;
  height: number;
};

/** One real, physical card in somebody's hands. Maps 1:1 to `user_cards`. */
export type UserCardCopy = {
  id: string;
  ownerId: string;
  cardId: string; // catalog card key
  variantId: string; // edition id, the same key marketEngine uses
  frontImage: BlobRef;
  /** Small copy for grids; falls back to frontImage when absent. */
  thumbImage?: BlobRef | null;
  backImage?: BlobRef | null;
  effectProfile: CardEffectProfile;
  effectMode: CardEffectMode;
  gradingCompany?: string | null;
  grade?: string | null;
  certNumber?: string | null;
  /** Always a string — "10", "TT-1", "54W-10", "F1A-LH". */
  serialNumber: string;
  serialIndex: number | null;
  serialTotal: number | null;
  condition?: string | null;
  verificationStatus: "pending" | "unverified" | "verified";
  createdAt: number;
};

export type CopyInput = Omit<UserCardCopy, "id" | "createdAt"> & {
  id?: string;
};

export interface StorageAdapter {
  readonly id: "local" | "cloud";

  // ── Synchronous side: everything a render needs. ────────────────────────
  /** Stable reference between mutations, so useSyncExternalStore is safe. */
  snapshot(): MarketSnapshot;
  subscribe(fn: () => void): () => void;

  // ── Copies (metadata; small, kept with the market snapshot) ─────────────
  copies(): UserCardCopy[];
  subscribeCopies(fn: () => void): () => void;
  upsertCopy(copy: CopyInput): Promise<UserCardCopy>;
  removeCopy(copyId: string): Promise<void>;
  copyById(copyId: string): UserCardCopy | undefined;

  // ── Images (bytes; IndexedDB or object storage) ─────────────────────────
  putImage(file: Blob, copyId: string, size: ImageSize): Promise<BlobRef>;
  resolveUrl(ref: BlobRef): Promise<string | null>;
  releaseUrl(url: string): void;

  // ── Mutations ──────────────────────────────────────────────────────────
  /**
   * Apply `next` to the snapshot and persist it.
   * LOCAL ADAPTER: read → next() → write happen in one synchronous tick, so
   * "a copy can only be reserved once" still holds. Never `await` inside
   * `next`. The cloud adapter makes this a real transaction.
   */
  mutate(next: (s: MarketSnapshot) => MarketSnapshot): Promise<MarketSnapshot>;
}
