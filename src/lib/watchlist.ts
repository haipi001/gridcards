// Local watchlist. The app is statically exported — there is no account
// server — so watch state lives in the browser (localStorage) and is shared
// between every page through a single custom event.
//
// Each entry carries a display snapshot (title, colours, art kind, link) so the
// /watchlist page can render offline without re-resolving the checklist.

import type { ArtKind } from "@/lib/teams";

export type WatchKind = "card" | "edition" | "player" | "archive";

export type WatchEntry = {
  id: string;
  kind: WatchKind;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  art: ArtKind;
  a: string;
  b: string;
  img?: string;
};

const STORAGE_KEY = "gridcards:watchlist:v1";
export const WATCH_EVENT = "gridcards:watch";
const EVENT = WATCH_EVENT;

function safeParse(raw: string | null): WatchEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WatchEntry[]) : [];
  } catch {
    return [];
  }
}

export function readWatchlist(): WatchEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

/** Empty list shared by every prerender — the server snapshot must be stable. */
export const NO_ENTRIES: WatchEntry[] = [];

let cachedRaw: string | null | undefined;
let cachedList: WatchEntry[] = NO_ENTRIES;

/**
 * Same data as `readWatchlist()` but with a referentially stable result, which
 * is what `useSyncExternalStore` needs — otherwise every render would look
 * like a store change and loop forever.
 */
export function watchlistSnapshot(): WatchEntry[] {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = safeParse(raw);
  }
  return cachedList;
}

function writeWatchlist(list: WatchEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

export function watchIds(): string[] {
  return readWatchlist().map((x) => x.id);
}

export function isWatched(id: string): boolean {
  return readWatchlist().some((x) => x.id === id);
}

/** Adds or removes an entry. Returns the resulting watched state. */
export function toggleWatch(entry: WatchEntry): boolean {
  const list = readWatchlist();
  const at = list.findIndex((x) => x.id === entry.id);
  if (at >= 0) {
    list.splice(at, 1);
    writeWatchlist(list);
    return false;
  }
  writeWatchlist([entry, ...list]);
  return true;
}

export function removeWatch(id: string) {
  writeWatchlist(readWatchlist().filter((x) => x.id !== id));
}

export function clearWatchlist() {
  writeWatchlist([]);
}

/** Fires on every change, including changes made on another tab. */
export function subscribeWatch(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}
