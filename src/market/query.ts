// Pure query layer: filter → sort → paginate.
//
// With a real backend these same params go into the request URL and the server
// returns a Page<MarketItem>. Until then the mock loader hands us the full file
// and this module does the work in the browser — same signature either way.

import { RARITY } from "./rarity";
import type { ItemQuery, MarketItem, Page } from "./types";

export const DEFAULT_PAGE_SIZE = 24;

export function matchesQuery(item: MarketItem, q: ItemQuery): boolean {
  if (q.seriesId && item.seriesId !== q.seriesId) return false;
  if (q.rarity?.length && !q.rarity.includes(item.rarity)) return false;
  if (q.minCents != null && item.floorCents < q.minCents) return false;
  if (q.maxCents != null && item.floorCents > q.maxCents) return false;
  if (q.serial) {
    const needle = q.serial.trim();
    if (needle && !item.cardNumber.includes(needle)) return false;
  }
  if (q.team?.length && !q.team.includes(item.team ?? "")) return false;
  if (q.parallel?.length && !q.parallel.includes(item.parallel)) return false;
  if (q.kind && item.kind !== q.kind) return false;
  if (q.inStock && item.listedCount <= 0) return false;
  if (q.q) {
    const needle = q.q.trim().toLowerCase();
    if (needle) {
      const hay = [
        item.title,
        item.subject,
        item.parallel,
        item.cardNumber,
        item.team ?? "",
        item.seriesName,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
  }
  return true;
}

export function sortItems(rows: MarketItem[], sort: ItemQuery["sort"]) {
  const out = [...rows];
  switch (sort) {
    case "floor_asc":
      return out.sort((a, b) => a.floorCents - b.floorCents);
    case "volume_desc":
      return out.sort((a, b) => b.volume24hCents - a.volume24hCents);
    case "newest":
      return out.sort((a, b) => b.change24h - a.change24h);
    case "rarity":
      return out.sort(
        (a, b) =>
          RARITY[a.rarity].rank - RARITY[b.rarity].rank ||
          b.floorCents - a.floorCents,
      );
    default:
      return out.sort((a, b) => b.floorCents - a.floorCents);
  }
}

export function paginate<T>(rows: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), pageCount);
  const start = (p - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total,
    page: p,
    pageSize,
    pageCount,
  };
}

export function queryItems(
  all: MarketItem[],
  q: ItemQuery,
): Page<MarketItem> {
  const filtered = all.filter((it) => matchesQuery(it, q));
  const sorted = sortItems(filtered, q.sort ?? "floor_desc");
  return paginate(sorted, q.page ?? 1, q.pageSize ?? DEFAULT_PAGE_SIZE);
}

/** Facet counts for the filter panel (computed against the current series). */
export function facetCounts(rows: MarketItem[]) {
  const rarity = new Map<string, number>();
  const team = new Map<string, number>();
  const parallel = new Map<string, number>();
  let min = Infinity;
  let max = 0;
  let inStock = 0;
  for (const it of rows) {
    rarity.set(it.rarity, (rarity.get(it.rarity) ?? 0) + 1);
    if (it.parallel) parallel.set(it.parallel, (parallel.get(it.parallel) ?? 0) + 1);
    if (it.team) team.set(it.team, (team.get(it.team) ?? 0) + 1);
    if (it.listedCount > 0) inStock += 1;
    min = Math.min(min, it.floorCents);
    max = Math.max(max, it.floorCents);
  }
  return {
    rarity,
    team,
    parallel,
    inStock,
    minCents: Number.isFinite(min) ? min : 0,
    maxCents: max,
  };
}

/** Team facet sorted by count desc then name — what the filter panel shows. */
export function topFacets(
  counts: Map<string, number>,
  limit = 12,
): Array<{ value: string; count: number }> {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

export const SORT_OPTIONS: Array<{ value: NonNullable<ItemQuery["sort"]>; label: string }> = [
  { value: "floor_desc", label: "地板价 高 → 低" },
  { value: "floor_asc", label: "地板价 低 → 高" },
  { value: "volume_desc", label: "24h 成交额" },
  { value: "rarity", label: "稀有度" },
  { value: "newest", label: "涨幅" },
];
