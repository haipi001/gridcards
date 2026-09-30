// Serial claiming — "I own copy 3 of 5".
// A marketplace needs to know which physical copies a collector actually
// holds. With no account server (static export), claims live in the browser
// like the watchlist do, keyed by edition: each edition keeps the list of
// serial numbers the visitor marked as theirs.

export type ClaimEntry = {
  id: string; // edition id, e.g. "edition:Lewis Hamilton:Red Refractor /5"
  title: string;
  player: string;
  run: number;
  href: string;
};

export type Claim = ClaimEntry & { serials: number[] };

const KEY = "gridcards:claims:v1";
const EVENT = "gridcards:claim";

function safeParse(raw: string | null): Claim[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Claim[]) : [];
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

export function ownedSerials(id: string): number[] {
  return readClaims().find((c) => c.id === id)?.serials ?? [];
}

/** Adds or removes one serial number. Returns the resulting owned list. */
export function toggleSerial(entry: ClaimEntry, n: number): number[] {
  const list = readClaims();
  const at = list.findIndex((c) => c.id === entry.id);
  const serials = at >= 0 ? list[at].serials : [];
  const next = serials.includes(n)
    ? serials.filter((x) => x !== n)
    : [...serials, n].sort((a, b) => a - b);

  if (next.length === 0) {
    if (at >= 0) list.splice(at, 1);
  } else if (at >= 0) {
    list[at] = { ...entry, serials: next };
  } else {
    list.unshift({ ...entry, serials: next });
  }

  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
  return next;
}

export function clearClaims() {
  window.localStorage.setItem(KEY, "[]");
  window.dispatchEvent(new Event(EVENT));
}

export function totalOwned(): number {
  return readClaims().reduce((sum, c) => sum + c.serials.length, 0);
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
