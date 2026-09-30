// Demo ledger — the write side of the market while everything is client-side.
//
// It is deliberately shaped like a server round trip: every mutation returns a
// fresh snapshot, so swapping in a real API means replacing this file, not the
// components. Seeded from /mock/me.json on first use and persisted to
// localStorage, so a listing you create survives a reload.

import { getMe } from "./api";
import type { MePayload, MyListing, MyOffer, OwnedCopy } from "./types";

const KEY = "gridcards:market-me:v1";
const EVENT = "gridcards:market-me";

export type Ledger = MePayload & { revision: number };

let memory: Ledger | null = null;

export function readLedger(): Ledger | null {
  if (typeof window === "undefined") return memory;
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as Ledger) : null;
  } catch {
    memory = null;
  }
  return memory;
}

export async function ensureLedger(): Promise<Ledger> {
  const existing = readLedger();
  if (existing) return existing;
  const seed = await getMe();
  const fresh: Ledger = { ...seed, revision: 0 };
  write(fresh);
  return fresh;
}

function write(next: Ledger) {
  memory = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota or private mode — stay in memory */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Read → mutate → write in one synchronous tick (the local "transaction"). */
export function mutate<T>(fn: (current: Ledger) => T): T {
  const current = readLedger();
  if (!current) {
    const empty: Ledger = {
      user: {
        id: "u_me",
        handle: "you",
        rating: 4.8,
        sales: 27,
        verified: true,
        currency: "CNY",
        balanceCents: 0,
        pendingCents: 0,
        lockedCents: 0,
      },
      assets: [],
      listings: [],
      offersMade: [],
      offersReceived: [],
      watchlist: [],
      revision: 0,
    };
    write(empty);
    return fn(empty);
  }
  const result = fn(current);
  write({ ...current, revision: current.revision + 1 });
  return result;
}

export function subscribeLedger(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export function resetLedger() {
  memory = null;
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/* ------------------------------------------------------------ id generator --- */

let seq = Math.floor(Math.random() * 1000);
export const nextId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`.toUpperCase();

export type { MyListing, MyOffer, OwnedCopy };
