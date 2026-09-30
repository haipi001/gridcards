import { describe, it, expect } from "vitest";
import {
  matchesQuery,
  sortItems,
  paginate,
  queryItems,
  facetCounts,
  topFacets,
  DEFAULT_PAGE_SIZE,
} from "@/market/query";
import type { ItemQuery, MarketItem } from "@/market/types";

function item(p: Partial<MarketItem> & { id: string }): MarketItem {
  return {
    id: p.id,
    seriesId: p.seriesId ?? "s1",
    seriesName: p.seriesName ?? "2020 Topps Chrome F1",
    title: p.title ?? p.id,
    subtitle: p.subtitle ?? "",
    cardNumber: p.cardNumber ?? "1",
    subject: p.subject ?? p.id,
    team: p.team ?? null,
    kind: p.kind ?? "person",
    sectionSlug: p.sectionSlug ?? "base",
    parallel: p.parallel ?? "Base",
    printRun: p.printRun ?? null,
    serialTotal: p.serialTotal ?? null,
    rarity: p.rarity ?? "base",
    effect: p.effect ?? "none",
    art: p.art ?? { kind: "racer", c1: "#000", c2: "#fff" },
    image: p.image ?? null,
    attributes: p.attributes ?? [],
    floorCents: p.floorCents ?? 1000,
    lastSaleCents: p.lastSaleCents ?? 0,
    askCents: p.askCents ?? 0,
    listedCount: p.listedCount ?? 0,
    ownerCount: p.ownerCount ?? 0,
    watchers: p.watchers ?? 0,
    volume24hCents: p.volume24hCents ?? 0,
    change24h: p.change24h ?? 0,
  } as MarketItem;
}

const ALL: MarketItem[] = [
  item({ id: "a", rarity: "ultimate", floorCents: 90000, team: "Mercedes", subject: "Lewis Hamilton" }),
  item({ id: "b", rarity: "base", floorCents: 500, team: "Ferrari", subject: "Charles Leclerc" }),
  item({ id: "c", rarity: "rare", floorCents: 8000, team: "Red Bull", subject: "Max Verstappen" }),
  item({ id: "d", rarity: "base", floorCents: 300, team: "McLaren", subject: "Lando Norris" }),
];

describe("matchesQuery", () => {
  it("filters by rarity set", () => {
    const q: ItemQuery = { rarity: ["base"] };
    expect(ALL.filter((i) => matchesQuery(i, q)).map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("filters by price bounds (inclusive)", () => {
    const q: ItemQuery = { minCents: 400, maxCents: 10000 };
    expect(ALL.filter((i) => matchesQuery(i, q)).map((i) => i.id).sort()).toEqual(["b", "c"]);
  });

  it("filters by card number substring", () => {
    const q: ItemQuery = { serial: "3" };
    // cardNumber defaults to "1"; only items whose number includes "3" match
    expect(ALL.filter((i) => matchesQuery(i, q))).toHaveLength(0);
  });

  it("text search spans subject/team/parallel/cardNumber", () => {
    expect(matchesQuery(ALL[0], { q: "hamilton" })).toBe(true);
    expect(matchesQuery(ALL[2], { q: "red bull" })).toBe(true);
    expect(matchesQuery(ALL[1], { q: "lewis" })).toBe(false);
  });

  it("empty query matches everything", () => {
    expect(ALL.filter((i) => matchesQuery(i, {})).length).toBe(ALL.length);
  });
});

describe("sortItems", () => {
  it("sorts by floor descending by default", () => {
    expect(sortItems(ALL).map((i) => i.id)).toEqual(["a", "c", "b", "d"]);
  });
  it("sorts by floor ascending", () => {
    expect(sortItems(ALL, "floor_asc").map((i) => i.id)).toEqual(["d", "b", "c", "a"]);
  });
  it("does not mutate the input array", () => {
    const before = ALL.map((i) => i.id);
    sortItems(ALL, "floor_asc");
    expect(ALL.map((i) => i.id)).toEqual(before);
  });
});

describe("paginate", () => {
  it("slices to pageSize and reports totals", () => {
    // paginate does not sort — it slices the input in the given order.
    const page = paginate(ALL, 1, 2);
    expect(page.rows.map((i) => i.id)).toEqual(["a", "b"]);
    expect(page.total).toBe(4);
    expect(page.pageCount).toBe(2);
  });
  it("clamps out-of-range page numbers", () => {
    const page = paginate(ALL, 99, 2);
    expect(page.page).toBe(2);
    expect(page.rows.map((i) => i.id)).toEqual(["c", "d"]);
  });
  it("uses the default page size", () => {
    expect(paginate(ALL, 1).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("queryItems", () => {
  it("applies filter then sort then paginate in one call", () => {
    const page = queryItems(ALL, { rarity: ["base"], sort: "floor_asc", page: 1, pageSize: 10 });
    expect(page.rows.map((i) => i.id)).toEqual(["d", "b"]);
    expect(page.total).toBe(2);
  });
});

describe("facetCounts", () => {
  it("counts rarity facets and price range", () => {
    const f = facetCounts(ALL);
    expect(f.rarity.get("base")).toBe(2);
    expect(f.rarity.get("ultimate")).toBe(1);
    expect(f.minCents).toBe(300);
    expect(f.maxCents).toBe(90000);
  });

  it("counts team and parallel facets plus in-stock total", () => {
    const f = facetCounts([
      item({ id: "x", team: "Mercedes", parallel: "Base", listedCount: 2 }),
      item({ id: "y", team: "Mercedes", parallel: "Gold /50", listedCount: 0 }),
      item({ id: "z", team: null, parallel: "Base", listedCount: 1 }),
    ]);
    expect(f.team.get("Mercedes")).toBe(2);
    // A null team must not become a "" bucket.
    expect(f.team.has("")).toBe(false);
    expect(f.parallel.get("Base")).toBe(2);
    expect(f.inStock).toBe(2);
  });
});

describe("topFacets", () => {
  it("sorts by count desc and caps the list", () => {
    const out = topFacets(
      new Map([
        ["A", 1],
        ["B", 5],
        ["C", 3],
        ["D", 9],
      ]),
      2,
    );
    expect(out.map((f) => f.value)).toEqual(["D", "B"]);
  });
});

describe("matchesQuery · new dimensions", () => {
  it("filters by team (multi-select, exact match)", () => {
    const hit = ALL.filter((i) => matchesQuery(i, { team: ["Mercedes", "Ferrari"] }));
    expect(hit.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("filters by parallel", () => {
    const rows = [
      item({ id: "p1", parallel: "Gold /50" }),
      item({ id: "p2", parallel: "Base" }),
    ];
    expect(rows.filter((i) => matchesQuery(i, { parallel: ["Gold /50"] })).map((i) => i.id)).toEqual([
      "p1",
    ]);
  });

  it("filters by subject kind", () => {
    const rows = [item({ id: "k1", kind: "person" }), item({ id: "k2", kind: "collection" })];
    expect(rows.filter((i) => matchesQuery(i, { kind: "collection" })).map((i) => i.id)).toEqual([
      "k2",
    ]);
  });

  it("inStock keeps only items with an active listing", () => {
    const rows = [item({ id: "s1", listedCount: 3 }), item({ id: "s2", listedCount: 0 })];
    expect(rows.filter((i) => matchesQuery(i, { inStock: true })).map((i) => i.id)).toEqual(["s1"]);
  });

  it("an empty dimension list means no filter", () => {
    expect(ALL.filter((i) => matchesQuery(i, { team: [], parallel: [] }))).toHaveLength(4);
  });

  it("combines dimensions with AND", () => {
    const rows = [
      item({ id: "m1", team: "Ferrari", kind: "person", listedCount: 1 }),
      item({ id: "m2", team: "Ferrari", kind: "collection", listedCount: 1 }),
    ];
    const hit = rows.filter((i) =>
      matchesQuery(i, { team: ["Ferrari"], kind: "person", inStock: true }),
    );
    expect(hit.map((i) => i.id)).toEqual(["m1"]);
  });
});
