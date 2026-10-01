// Claims — "I hold this card". Two granularities, one store.
//
//   edition scope · "I own copy 3 of 5"  → id `edition:<player>:<variant>`
//   card    scope · "I own a copy of #7" → id `card:<section>#<cardNumber>`
//
// Every claim can carry photo evidence: a picture of the actual card in the
// visitor's hand, ingested through the same pipeline /sell uses (EXIF stripped,
// re-encoded, bytes in IndexedDB, only a BlobRef lands here).
//
// ⚠️ WHAT THIS IS NOT. A claim is the visitor's own statement, recorded on
// this device. It is not ownership, not a grade, not a price, and it never
// writes `state.owners` — see DEV_AGENTS.md: ownership transfers only when an
// Order reaches COMPLETED. `marketEngine.ownerOf()` reads claims as its weakest
// hint, and that is the only direction of influence.

import type { BlobRef } from "@/lib/storage/types";

export type ClaimScope = "card" | "edition";

export type ClaimEntry = {
  /** Stable key: `edition:<player>:<variant>` or `card:<section>#<no>`. */
  id: string;
  title: string;
  player: string;
  /** Print run for the edition; 0 for card scope and unnumbered editions. */
  run: number;
  href: string;
  /** Defaults to "edition" for records written before card scope existed. */
  scope?: ClaimScope;
  cardNo?: string;
  variant?: string;
};

/** One photo of a physical card, stored as bytes + a pointer to them. */
export type ClaimEvidence = {
  id: string;
  thumb: BlobRef;
  full: BlobRef;
  at: number;
};

export type Claim = ClaimEntry & {
  scope: ClaimScope;
  /** Edition scope only: which serial numbers the visitor says they hold. */
  serials: number[];
  note: string;
  evidence: ClaimEvidence[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "gridcards:claims:v1";
export const CLAIM_EVENT = "gridcards:claim";
const EVENT = CLAIM_EVENT;

/** `card:<sectionSlug>#<cardNumber>` — one checklist record. */
export function cardClaimId(sectionSlug: string, cardNumber: string): string {
  return `card:${sectionSlug}#${cardNumber}`;
}

/** `edition:<player>:<variant>` — one parallel under a checklist record. */
export function editionClaimId(player: string, variant: string): string {
  return `edition:${player}:${variant}`;
}

function text(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function numbers(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}

function evidenceOf(v: unknown): ClaimEvidence[] {
  if (!Array.isArray(v)) return [];
  const out: ClaimEvidence[] = [];
  for (const raw of v) {
    const e = raw as Partial<ClaimEvidence>;
    if (!e || !e.id || !e.full || !e.thumb) continue;
    out.push({
      id: String(e.id),
      thumb: e.thumb,
      full: e.full,
      at: typeof e.at === "number" ? e.at : 0,
    });
  }
  return out;
}

/**
 * Every read goes through here, so a record written by an older build (no
 * scope, no evidence, no timestamps) still renders instead of exploding.
 */
function normalizeOne(raw: unknown): Claim | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Claim>;
  const id = text(r.id);
  if (!id) return null;
  const scope: ClaimScope = r.scope === "card" ? "card" : "edition";
  const serials = numbers(r.serials).sort((a, b) => a - b);
  return {
    id,
    title: text(r.title, id),
    player: text(r.player),
    run: typeof r.run === "number" ? r.run : 0,
    href: text(r.href, "/"),
    scope,
    cardNo: r.cardNo,
    variant: r.variant,
    serials,
    note: text(r.note),
    evidence: evidenceOf(r.evidence),
    createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

function safeParse(raw: string | null): Claim[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeOne).filter((c): c is Claim => c !== null);
  } catch {
    return [];
  }
}

export function readClaims(): Claim[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

/** Empty list shared by every prerender — the server snapshot must be stable. */
export const NO_CLAIMS: Claim[] = [];

let cachedRaw: string | null | undefined;
let cachedList: Claim[] = NO_CLAIMS;

/** `readClaims()` with a referentially stable result, for useSyncExternalStore. */
export function claimsSnapshot(): Claim[] {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = safeParse(raw);
  }
  return cachedList;
}

function writeClaims(list: Claim[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

function stamp(entry: ClaimEntry, now: number): Claim {
  return {
    ...entry,
    scope: entry.scope ?? "edition",
    serials: [],
    note: "",
    evidence: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function claimById(id: string): Claim | undefined {
  return readClaims().find((c) => c.id === id);
}

export function hasClaim(id: string): boolean {
  return readClaims().some((c) => c.id === id);
}

export function ownedSerials(id: string): number[] {
  return readClaims().find((c) => c.id === id)?.serials ?? [];
}

/** Adds or removes one serial number. Returns the resulting owned list. */
export function toggleSerial(entry: ClaimEntry, n: number): number[] {
  const list = readClaims();
  const at = list.findIndex((c) => c.id === entry.id);
  const base = at >= 0 ? list[at] : null;
  const serials = base?.serials ?? [];
  const next = serials.includes(n)
    ? serials.filter((x) => x !== n)
    : [...serials, n].sort((a, b) => a - b);
  const now = Date.now();

  if (next.length === 0 && (base?.evidence.length ?? 0) === 0 && !base?.note) {
    // Nothing left to remember: an empty claim with no evidence and no note
    // is noise in /profile, so drop the record entirely.
    if (at >= 0) list.splice(at, 1);
  } else if (at >= 0 && base) {
    list[at] = { ...base, ...entry, scope: "edition", serials: next, updatedAt: now };
  } else {
    list.unshift({ ...stamp(entry, now), scope: "edition", serials: next });
  }

  writeClaims(list);
  return next;
}

/**
 * Whole-record claiming: "I hold at least one copy of this checklist card".
 * There is no serial to name, so the record itself is the toggle.
 */
export function toggleCardClaim(entry: ClaimEntry): boolean {
  const list = readClaims();
  const at = list.findIndex((c) => c.id === entry.id);
  if (at >= 0) {
    // Releasing a card claim drops the record and its evidence pointers
    // together — there is nothing left to point at. The UI warns first and
    // lists how many photos will go with it.
    list.splice(at, 1);
    writeClaims(list);
    return false;
  }
  list.unshift({ ...stamp(entry, Date.now()), scope: "card", serials: [] });
  writeClaims(list);
  return true;
}

/** Attaches one ingested photo to a claim, creating the claim if needed. */
export function addEvidence(entry: ClaimEntry, ev: ClaimEvidence): Claim {
  const list = readClaims();
  const at = list.findIndex((c) => c.id === entry.id);
  const now = Date.now();
  if (at >= 0) {
    const base = list[at];
    const merged: Claim = {
      ...base,
      ...entry,
      scope: base.scope,
      serials: base.serials,
      note: base.note,
      evidence: [...base.evidence, ev],
      createdAt: base.createdAt || now,
      updatedAt: now,
    };
    list[at] = merged;
    writeClaims(list);
    return merged;
  }
  const created: Claim = {
    ...stamp(entry, now),
    scope: entry.scope ?? "edition",
    evidence: [ev],
  };
  list.unshift(created);
  writeClaims(list);
  return created;
}

export function removeEvidence(id: string, evidenceId: string) {
  const list = readClaims();
  const at = list.findIndex((c) => c.id === id);
  if (at < 0) return;
  const base = list[at];
  const evidence = base.evidence.filter((e) => e.id !== evidenceId);
  // A claim with nothing behind it — no serial, no photo, no note — is dropped.
  if (evidence.length === 0 && base.serials.length === 0 && !base.note) {
    list.splice(at, 1);
  } else {
    list[at] = { ...base, evidence, updatedAt: Date.now() };
  }
  writeClaims(list);
}

export function updateNote(id: string, note: string) {
  const list = readClaims();
  const at = list.findIndex((c) => c.id === id);
  if (at < 0) return;
  const base = list[at];
  list[at] = { ...base, note, updatedAt: Date.now() };
  writeClaims(list);
}

export function removeClaim(id: string) {
  writeClaims(readClaims().filter((c) => c.id !== id));
}

export function clearClaims() {
  window.localStorage.setItem(KEY, "[]");
  window.dispatchEvent(new Event(EVENT));
}

/** Serials held plus whole-card claims: the headline "I own N" number. */
export function totalOwned(): number {
  return readClaims().reduce(
    (sum, c) => sum + (c.scope === "card" ? 1 : c.serials.length),
    0,
  );
}

export function totalEvidence(): number {
  return readClaims().reduce((sum, c) => sum + c.evidence.length, 0);
}

export function subscribeClaims(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

/** 3 → "03/5" for run 5, "003/399" for run 399. */
export function serialLabel(n: number, run: number): string {
  const width = Math.max(1, String(run).length);
  return `${String(n).padStart(width, "0")}/${run}`;
}
