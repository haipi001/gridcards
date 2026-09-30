// Data access. Every component talks to these functions and nothing else.
//
// ── Replacing the mock with a real backend ────────────────────────────────────
// 1. point NEXT_PUBLIC_MARKET_API at the API origin (src/market/config.ts)
// 2. rewrite the six `load*` helpers below as fetch calls, e.g.
//      listItems(q)   → GET  /items?series=&rarity=&min=&max=&sort=&page=
//      getItem(id)    → GET  /items/{id}
//      listListings() → GET  /listings?item_id={id}
//    and drop query.ts from the read path (the server will filter for us)
// 3. move the trade actions in ./actions.ts onto the same endpoints
// Nothing in src/components/market or src/app/market changes.

import { API_BASE, READ_LATENCY_MS } from "./config";
import { queryItems } from "./query";
import type {
  ActivityEvent,
  ItemQuery,
  Listing,
  MarketItem,
  MarketSeries,
  MePayload,
  Offer,
  Page,
  Spotlight,
} from "./types";

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

const sleep = (ms: number) =>
  new Promise<void>((r) => {
    if (ms <= 0) return r();
    setTimeout(r, ms);
  });

const cache = new Map<string, unknown>();

/** Fetch one mock resource. Cached per resource so paging is instant. */
export async function load<T>(
  resource: string,
  opts: { fail?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  if (opts.fail) {
    await sleep(READ_LATENCY_MS);
    throw new ApiError("服务暂时不可用（模拟故障：?fail=1）", "MOCK_FAILURE");
  }
  if (cache.has(resource)) {
    await sleep(Math.min(60, READ_LATENCY_MS));
    return cache.get(resource) as T;
  }
  const res = await fetch(`${API_BASE}/${resource}.json`, {
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new ApiError(`资源 ${resource} 加载失败 (${res.status})`, String(res.status));
  }
  const data = (await res.json()) as T;
  cache.set(resource, data);
  await sleep(READ_LATENCY_MS);
  return data;
}

/* ------------------------------------------------------------- resources --- */

export const listSeries = (o?: { fail?: boolean }) =>
  load<MarketSeries[]>("series", o);

export const listItemsRaw = (o?: { fail?: boolean }) =>
  load<MarketItem[]>("items", o);

export const listListings = (o?: { fail?: boolean }) =>
  load<Listing[]>("listings", o);

export const listOffers = (o?: { fail?: boolean }) => load<Offer[]>("offers", o);

export const listActivity = (o?: { fail?: boolean }) =>
  load<ActivityEvent[]>("activity", o);

export const getMe = (o?: { fail?: boolean }) => load<MePayload>("me", o);

export const getSpotlight = (o?: { fail?: boolean }) =>
  load<Spotlight>("spotlight", o);

/* --------------------------------------------------------- derived queries --- */

export async function listItems(
  q: ItemQuery,
  o: { fail?: boolean } = {},
): Promise<Page<MarketItem>> {
  const all = await listItemsRaw(o);
  return queryItems(all, q);
}

export async function getItem(
  id: string,
  o: { fail?: boolean } = {},
): Promise<MarketItem | null> {
  const all = await listItemsRaw(o);
  return all.find((it) => it.id === id) ?? null;
}

export async function getSeries(
  slug: string,
  o: { fail?: boolean } = {},
): Promise<MarketSeries | null> {
  const all = await listSeries(o);
  return all.find((s) => s.slug === slug) ?? null;
}

/** Item + everything hanging off it, in one round trip. */
export async function getItemBundle(
  id: string,
  o: { fail?: boolean } = {},
): Promise<{
  item: MarketItem | null;
  listings: Listing[];
  offers: Offer[];
  activity: ActivityEvent[];
  series: MarketSeries | null;
}> {
  const [item, listings, offers, activity] = await Promise.all([
    getItem(id, o),
    listListings(o),
    listOffers(o),
    listActivity(o),
  ]);
  const series = item ? await getSeries(item.seriesId, o) : null;
  return {
    item,
    listings: listings.filter((l) => l.itemId === id),
    offers: offers.filter((x) => x.itemId === id),
    activity: activity.filter((e) => e.itemId === id).slice(0, 40),
    series,
  };
}

/** Full-text-ish search over subjects, teams, card numbers and parallels. */
export async function searchItems(
  q: string,
  o: { fail?: boolean } = {},
): Promise<MarketItem[]> {
  const all = await listItemsRaw(o);
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const starts: MarketItem[] = [];
  const contains: MarketItem[] = [];
  for (const it of all) {
    const subject = it.subject.toLowerCase();
    const hay = `${subject} ${it.parallel} ${it.cardNumber} ${it.team ?? ""} ${it.seriesName}`.toLowerCase();
    if (subject.startsWith(needle)) starts.push(it);
    else if (hay.includes(needle)) contains.push(it);
  }
  return [...starts, ...contains];
}
