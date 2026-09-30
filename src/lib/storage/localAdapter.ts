// Local implementation of StorageAdapter: this device, this browser, nothing
// leaves it.
//
// ⚠️ ATOMICITY RULE — do not break this.
// `mutate()` runs read → transform → write in ONE synchronous tick. That single
// tick *is* our transaction: because JS is single threaded, `buyNow()` cannot be
// interleaved with another `buyNow()`, which is what makes "two buyers cannot
// reserve the same physical copy" true without a server. If you ever add an
// `await` between the read and the write, that guarantee silently disappears.
// Write the bytes (IndexedDB) AFTER the commit, never inside it.

import { idbGet, idbPut, idbDelete } from "./idb";
import type {
  BlobRef,
  CopyInput,
  ImageSize,
  MarketSnapshot,
  StorageAdapter,
  UserCardCopy,
} from "./types";

const MARKET_KEY = "gridcards:market:v1";
const MARKET_EVENT = "gridcards:market";
const COPIES_KEY = "gridcards:copies:v1";
const COPIES_EVENT = "gridcards:copies";

// Prerender runs on the server: one frozen, shared empty snapshot.
const SERVER_SNAPSHOT: MarketSnapshot = {
  role: "seller",
  listings: [],
  orders: [],
  offers: [],
  owners: {},
  events: [],
};
const NO_COPIES: UserCardCopy[] = [];

let cachedRaw: string | null | undefined;
let mirror: MarketSnapshot = SERVER_SNAPSHOT;

let copiesRaw: string | null | undefined;
let copiesMirror: UserCardCopy[] = NO_COPIES;

function parseCopies(raw: string | null): UserCardCopy[] {
  if (!raw) return NO_COPIES;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UserCardCopy[]) : NO_COPIES;
  } catch {
    return NO_COPIES;
  }
}

function load(): MarketSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  const raw = window.localStorage.getItem(MARKET_KEY);
  if (raw === cachedRaw) return mirror;
  cachedRaw = raw;
  if (!raw) {
    mirror = { ...SERVER_SNAPSHOT, owners: {}, events: [] };
    return mirror;
  }
  try {
    mirror = { ...SERVER_SNAPSHOT, ...(JSON.parse(raw) as MarketSnapshot) };
  } catch {
    mirror = { ...SERVER_SNAPSHOT, owners: {}, events: [] };
  }
  return mirror;
}

function loadCopies(): UserCardCopy[] {
  if (typeof window === "undefined") return NO_COPIES;
  const raw = window.localStorage.getItem(COPIES_KEY);
  if (raw === copiesRaw) return copiesMirror;
  copiesRaw = raw;
  copiesMirror = parseCopies(raw);
  return copiesMirror;
}

/** Synchronous write + notify. Callers must already hold the new state. */
export function commitMarket(next: MarketSnapshot): MarketSnapshot {
  mirror = next;
  if (typeof window !== "undefined") {
    cachedRaw = JSON.stringify(next);
    window.localStorage.setItem(MARKET_KEY, cachedRaw);
    window.dispatchEvent(new Event(MARKET_EVENT));
  }
  return next;
}

export function commitCopies(next: UserCardCopy[]): UserCardCopy[] {
  copiesMirror = next;
  if (typeof window !== "undefined") {
    copiesRaw = JSON.stringify(next);
    window.localStorage.setItem(COPIES_KEY, copiesRaw);
    window.dispatchEvent(new Event(COPIES_EVENT));
  }
  return next;
}

function subscribeTo(events: string[], fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  for (const e of events) window.addEventListener(e, fn);
  window.addEventListener("storage", fn);
  return () => {
    for (const e of events) window.removeEventListener(e, fn);
    window.removeEventListener("storage", fn);
  };
}

const live = new Map<string, string>(); // objectURL → blob key

export const localAdapter: StorageAdapter = {
  id: "local",

  snapshot: load,
  subscribe: (fn) => subscribeTo([MARKET_EVENT], fn),

  copies: loadCopies,
  subscribeCopies: (fn) => subscribeTo([COPIES_EVENT], fn),

  copyById(copyId) {
    return loadCopies().find((c) => c.id === copyId);
  },

  async upsertCopy(input: CopyInput): Promise<UserCardCopy> {
    const copy: UserCardCopy = {
      ...input,
      id: input.id ?? `C-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    const list = loadCopies();
    const at = list.findIndex((c) => c.id === copy.id);
    const next = at >= 0 ? list.map((c) => (c.id === copy.id ? copy : c)) : [copy, ...list];
    commitCopies(next);
    return copy;
  },

  async removeCopy(copyId: string) {
    const next = loadCopies().filter((c) => c.id !== copyId);
    commitCopies(next);
    for (const size of ["full", "card", "thumb"] as ImageSize[]) {
      void idbDelete(`${copyId}:${size}`);
    }
  },

  async putImage(file: Blob, copyId: string, size: ImageSize): Promise<BlobRef> {
    const key = `${copyId}:${size}`;
    await idbPut(key, file);
    return { kind: "idb", key };
  },

  async resolveUrl(ref: BlobRef): Promise<string | null> {
    if (ref.kind === "url") return ref.url;
    const blob = await idbGet(ref.key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    live.set(url, ref.key);
    return url;
  },

  releaseUrl(url: string) {
    if (live.has(url)) {
      URL.revokeObjectURL(url);
      live.delete(url);
    }
  },

  async mutate(next) {
    // No await before the write — see the header comment.
    const current = load();
    return commitMarket(next(current));
  },
};
