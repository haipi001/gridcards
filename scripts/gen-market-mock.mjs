// Generates the mock market dataset served from /mock/*.json.
//
// Deterministic: a seeded PRNG drives every random-looking value, so two runs
// produce byte-identical files and the static export never drifts.
//
//   node scripts/gen-market-mock.mjs
//
// Output:
//   public/mock/series.json     collections (OpenSea "collection" shape)
//   public/mock/items.json      tradeable editions (NBA Top Shot "moment" shape)
//   public/mock/listings.json   asks          (seller side)
//   public/mock/offers.json     bids          (buyer side)
//   public/mock/activity.json   market events (the only source of truth)
//   public/mock/me.json         signed-in user: balance / assets / listings
//   public/mock/spotlight.json  home page rails
//   src/market/generated/ids.ts ids for generateStaticParams
//
// Real card identity (driver, team, card number, livery colours, 1/1 scans)
// comes from the checklist — nothing here invents a card that does not exist.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "mock");
const GEN_DIR = path.join(ROOT, "src", "market", "generated");

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "2020-topps-chrome-f1.json"), "utf8"),
);
const archive = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "allofone-archive.json"), "utf8"),
);

/* ------------------------------------------------------------------ PRNG --- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20200927);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));
const chance = (p) => rnd() < p;

/* ------------------------------------------------- team colours / art kind --- */

// src/lib/teams.ts is TypeScript; the theme table is a plain literal, so a
// regex read is enough to keep colours in sync with the rest of the site.
const teamsSrc = fs.readFileSync(
  path.join(ROOT, "src", "lib", "teams.ts"),
  "utf8",
);
const TEAM_THEMES = {};
for (const m of teamsSrc.matchAll(
  /^\s*"([^"]+)":\s*\{\s*a:\s*"(#[0-9a-fA-F]{6})",\s*b:\s*"(#[0-9a-fA-F]{6})"\s*\},/gm,
)) {
  TEAM_THEMES[m[1]] = { a: m[2], b: m[3] };
}
const FALLBACK_THEME = { a: "#33475b", b: "#1b232c" };
const theme = (team) => TEAM_THEMES[team ?? ""] ?? FALLBACK_THEME;

const CAR_SECTIONS = new Set(["f1-cars", "f2-cars"]);
const CREST_SECTIONS = new Set(["team-logos"]);
const artKindOf = (sectionSlug) =>
  CAR_SECTIONS.has(sectionSlug)
    ? "car"
    : CREST_SECTIONS.has(sectionSlug)
      ? "crest"
      : "racer";

/* --------------------------------------------------------- 1/1 real scans --- */

// archive id -> /img/archive/{id}.jpg, indexed by driver name so a 1/1 card can
// show a real scan instead of generated art.
const scansByDriver = new Map();
for (const c of archive) {
  const name = (c.driver_name ?? "").trim();
  const file = path.join(ROOT, "public", "img", "archive", `${c.id}.jpg`);
  if (!name || !fs.existsSync(file)) continue;
  if (!scansByDriver.has(name)) scansByDriver.set(name, []);
  scansByDriver.get(name).push(`/img/archive/${c.id}.jpg`);
}

/* ------------------------------------------------------------- handle pool --- */

const HANDLE_A = [
  "grid",
  "apex",
  "pole",
  "chicane",
  "turbo",
  "drs",
  "kerb",
  "sector",
  "pit",
  "quali",
  "slipstream",
  "downforce",
];
const HANDLE_B = [
  "hawk",
  "fox",
  "bull",
  "ace",
  "wolf",
  "raven",
  "otter",
  "lynx",
  "orca",
  "kite",
  "mantis",
  "comet",
];
function makeHandles(n) {
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const h = `${pick(HANDLE_A)}${pick(HANDLE_B)}${int(2, 89)}`;
    if (seen.has(h)) continue;
    seen.add(h);
    out.push({
      id: `u_${out.length + 1}`,
      handle: h,
      rating: Math.round((4.2 + rnd() * 0.8) * 10) / 10,
      sales: int(3, 940),
      verified: chance(0.35),
    });
  }
  return out;
}
const USERS = makeHandles(120);
const ME = { id: "u_me", handle: "you", rating: 4.8, sales: 27, verified: true };

/* --------------------------------------------------------------- variants --- */

// printRun === null means unnumbered (Base / Refractor / inserts).
const LADDER = {
  full: [
    { parallel: "SuperFractor 1/1", printRun: 1, rarity: "ultimate", mult: 92 },
    { parallel: "Red Refractor /5", printRun: 5, rarity: "legendary", mult: 26 },
    { parallel: "Gold Refractor /50", printRun: 50, rarity: "rare", mult: 8.5 },
    { parallel: "Refractor", printRun: null, rarity: "uncommon", mult: 2.6 },
    { parallel: "Base", printRun: null, rarity: "base", mult: 1 },
  ],
  auto: [
    { parallel: "SuperFractor Auto 1/1", printRun: 1, rarity: "ultimate", mult: 78 },
    { parallel: "Red Auto /5", printRun: 5, rarity: "legendary", mult: 22 },
    { parallel: "Chrome Auto", printRun: null, rarity: "rare", mult: 6.4 },
  ],
  insert: [
    { parallel: "Gold /50", printRun: 50, rarity: "rare", mult: 5.2 },
    { parallel: "Base Insert", printRun: null, rarity: "uncommon", mult: 1.9 },
  ],
};

const EFFECT_BY_RARITY = {
  ultimate: "superfractor",
  legendary: "gold",
  rare: "refractor",
  uncommon: "prism",
  base: "none",
};

/* ------------------------------------------------------------- collections --- */

const COLLECTIONS = [
  {
    id: "chrome-base",
    name: "2020 Topps Chrome F1 · Base Set",
    shortName: "Chrome Base",
    season: "2020",
    category: "base",
    blurb:
      "官方 checklist 的 40 位一级方程式车手，完整平行卡阶梯从 Base 到 SuperFractor 1/1。",
    sections: ["f1-racers"],
    limit: 40,
    ladder: "full",
    c1: "#1f6fb2",
    c2: "#0b1a2b",
    tags: ["Drivers", "Chrome", "Full ladder"],
  },
  {
    id: "chrome-autographs",
    name: "Chrome Autograph Variations",
    shortName: "Autographs",
    season: "2020",
    category: "autograph",
    blurb: "亲笔签名平行卡，含 Red Auto /5 与 SuperFractor Auto 1/1。",
    sections: ["chrome-autograph-variations"],
    limit: 26,
    ladder: "auto",
    c1: "#8f6a29",
    c2: "#2b1f14",
    tags: ["Signature", "Chrome"],
  },
  {
    id: "track-tags",
    name: "Track Tags",
    shortName: "Track Tags",
    season: "2020",
    category: "insert",
    blurb: "赛道铭牌插入卡，编号与车队一一对应。",
    sections: ["track-tags"],
    limit: 14,
    ladder: "insert",
    c1: "#375f76",
    c2: "#16232c",
    tags: ["Insert", "Numbered"],
  },
  {
    id: "world-on-wheels",
    name: "1954 Topps World on Wheels",
    shortName: "World on Wheels",
    season: "1954",
    category: "insert",
    blurb: "向 1954 年 Topps 经典设计致敬的复古插入系列。",
    sections: ["world-on-wheels"],
    limit: 18,
    ladder: "insert",
    c1: "#8d5228",
    c2: "#2a1c11",
    tags: ["Insert", "Retro"],
  },
  {
    id: "image-variations",
    name: "Base Card Image Variations",
    shortName: "Image Variations",
    season: "2020",
    category: "variation",
    blurb: "同卡号不同照片的短印刷版本，收藏市场最热门的短板之一。",
    sections: ["base-card-image-variations"],
    limit: 10,
    ladder: "insert",
    c1: "#4b6f9c",
    c2: "#15202b",
    tags: ["Short print", "Variation"],
  },
  {
    id: "grand-prix-heroes",
    name: "Grand Prix Heroes",
    shortName: "GP Heroes",
    season: "2020",
    category: "insert",
    blurb: "分站冠军、当日最佳车手、年度奖项与新人盘点。",
    sections: [
      "grand-prix-winners",
      "grand-prix-driver-of-the-day",
      "f1-award-winners",
      "f1-freshest",
    ],
    limit: 16,
    ladder: "insert",
    c1: "#6d4fa8",
    c2: "#1d1730",
    tags: ["Insert", "Winners"],
  },
  {
    id: "team-logos",
    name: "Team Logos",
    shortName: "Team Logos",
    season: "2020",
    category: "base",
    blurb: "十支车队的队徽卡，队徽为本站自绘，不使用厂商素材。",
    sections: ["team-logos"],
    limit: 10,
    ladder: "insert",
    c1: "#2f8f7a",
    c2: "#10201d",
    tags: ["Teams", "Chrome"],
  },
];

/* ------------------------------------------------------------------ items --- */

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const NOW = Date.UTC(2026, 8, 29, 8, 0, 0); // fixed "now" keeps output stable
const DAY = 86400000;

// Deterministic popularity per subject, so prices are stable between runs.
function popularity(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return h / 100003; // 0..1
}

const items = [];
const seriesStats = new Map(
  COLLECTIONS.map((c) => [
    c.id,
    { count: 0, floor: Infinity, owners: 0, volume: 0 },
  ]),
);

for (const col of COLLECTIONS) {
  // The checklist lists some subjects more than once (the PDF marks them
  // sourceDuplicate); one card = one tradable edition, so dedupe first.
  const seen = new Set();
  const cards = catalog.sections
    .filter((s) => col.sections.includes(s.slug))
    .flatMap((s) => s.cards.map((c) => ({ ...c, sectionSlug: s.slug })))
    .filter((c) => {
      // One tradable edition per subject per collection — a subject listed in
      // two sections of the same collection is still one card.
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    })
    .slice(0, col.limit);

  for (const card of cards) {
    const subject = card.name;
    const isPerson = card.kind === "person";
    const team = card.team ?? null;
    const th = theme(team);
    const pop = popularity(subject);
    const scans = scansByDriver.get(subject) ?? [];

    for (const v of LADDER[col.ladder]) {
      const id = `${slugify(subject)}-${col.id}-${slugify(v.parallel)}`;
      const printRun = v.printRun;
      // A numbered edition only gets a scan when a real 1/1 of that driver
      // exists; everything else falls back to generated livery art.
      const image =
        printRun === 1 && scans.length ? scans[0 % scans.length] : null;

      const yuan = Math.round(
        (95 + pop * 420 + rnd() * 60) * v.mult * (0.85 + rnd() * 0.4),
      );
      const floorCents = yuan * 100;
      const lastSaleCents = Math.round(floorCents * (1 + rnd() * 0.35));
      const listedCount = printRun
        ? Math.min(printRun, int(0, 3))
        : int(2, 14);
      const ownerCount = printRun
        ? Math.min(printRun, int(1, printRun))
        : int(120, 2400);

      const attrs = [
        { trait: isPerson ? "Subject" : "Team", value: subject },
        { trait: "Card No.", value: String(card.cardNumber) },
        { trait: "Parallel", value: v.parallel },
        {
          trait: "Print Run",
          value: printRun ? `${printRun}` : "Unnumbered",
        },
        { trait: "Season", value: col.season },
        { trait: "Brand", value: "Topps Chrome" },
      ];
      if (team) attrs.splice(1, 0, { trait: "Constructor", value: team });
      if (printRun && printRun <= 50) {
        const g = pick(["PSA 10", "PSA 9", "BGS 9.5", "SGC 10", "Raw"]);
        attrs.push({
          trait: "Grade",
          value: g,
          pct: g === "Raw" ? 61 : int(4, 18),
        });
      }
      attrs.push({
        trait: "Foil",
        value: EFFECT_BY_RARITY[v.rarity],
        pct: int(8, 40),
      });

      items.push({
        id,
        seriesId: col.id,
        seriesName: col.name,
        title: subject,
        subtitle: `${col.season} Topps Chrome #${card.cardNumber}`,
        cardNumber: String(card.cardNumber),
        subject,
        team,
        kind: card.kind,
        sectionSlug: card.sectionSlug,
        parallel: v.parallel,
        printRun,
        serialTotal: printRun,
        rarity: v.rarity,
        effect: EFFECT_BY_RARITY[v.rarity],
        art: { kind: artKindOf(card.sectionSlug), c1: th.a, c2: th.b },
        image,
        attributes: attrs,
        floorCents,
        lastSaleCents,
        askCents: Math.round(floorCents * (1.05 + rnd() * 0.5)),
        listedCount,
        ownerCount,
        watchers: int(6, 480),
        volume24hCents: Math.round(floorCents * int(1, 9) * (0.4 + pop)),
        change24h: Math.round((rnd() * 0.36 - 0.14) * 1000) / 1000,
      });

      const st = seriesStats.get(col.id);
      st.count += 1;
      st.floor = Math.min(st.floor, floorCents);
      st.owners += ownerCount;
      st.volume += Math.round(floorCents * int(1, 6));
    }
  }
}

/* ----------------------------------------------------------------- series --- */

const series = COLLECTIONS.map((c, i) => {
  const st = seriesStats.get(c.id);
  const spark = Array.from({ length: 14 }, () =>
    Math.round(40 + rnd() * 60 + i * 2),
  );
  return {
    id: c.id,
    slug: c.id,
    name: c.name,
    shortName: c.shortName,
    season: c.season,
    category: c.category,
    brand: "Topps Chrome",
    blurb: c.blurb,
    c1: c.c1,
    c2: c.c2,
    tags: c.tags,
    itemCount: st.count,
    ownerCount: st.owners,
    floorCents: Number.isFinite(st.floor) ? st.floor : 0,
    volume24hCents: st.volume,
    volumeTotalCents: st.volume * int(20, 60),
    change24h: Math.round((rnd() * 0.3 - 0.12) * 1000) / 1000,
    sparkline: spark,
  };
});

const itemById = new Map(items.map((it) => [it.id, it]));

/* --------------------------------------------------------------- listings --- */

const listings = [];
let lSeq = 0;
for (const it of items) {
  const n = Math.min(it.listedCount, it.printRun ? Math.min(it.printRun, 3) : 4);
  // Invariant: a physical copy exists once, so a serial number can be on sale
  // at most once across the whole market. Two sellers offering 36/50 at the
  // same time is the exact thing a collector would call out as fake.
  const taken = new Set();
  for (let k = 0; k < n; k++) {
    let serial = null;
    for (let attempt = 0; attempt < 16; attempt++) {
      const candidate = it.printRun
        ? String(int(1, it.printRun))
        : String(int(1, 9999));
      if (!taken.has(candidate)) {
        serial = candidate;
        break;
      }
    }
    if (serial === null) break; // print run exhausted — no more copies exist
    taken.add(serial);
    const priceCents = Math.round(it.askCents * (0.92 + rnd() * 0.5));
    listings.push({
      id: `L${String(++lSeq).padStart(5, "0")}`,
      itemId: it.id,
      serial,
      serialTotal: it.serialTotal,
      priceCents,
      seller: pick(USERS),
      kind: chance(0.18) ? "auction" : "fixed",
      condition: pick(["Gem Mint", "Mint", "Near Mint", "Excellent"]),
      grade: chance(0.4) ? pick(["PSA 10", "PSA 9", "BGS 9.5"]) : null,
      createdAt: NOW - int(1, 26) * DAY,
      expiresAt: NOW + int(2, 21) * DAY,
      views: int(4, 620),
      watchers: int(0, 42),
    });
  }
}

/* ----------------------------------------------------------------- offers --- */

const offers = [];
let oSeq = 0;
for (const it of items) {
  if (!chance(0.45)) continue;
  const count = int(1, 3);
  for (let k = 0; k < count; k++) {
    offers.push({
      id: `O${String(++oSeq).padStart(5, "0")}`,
      itemId: it.id,
      serial: it.printRun ? String(int(1, it.printRun)) : null,
      priceCents: Math.round(it.floorCents * (0.62 + rnd() * 0.34)),
      buyer: pick(USERS),
      status: "OPEN",
      createdAt: NOW - int(1, 12) * DAY,
      expiresAt: NOW + int(1, 14) * DAY,
    });
  }
}

/* --------------------------------------------------------------- activity --- */

const ACTIVITY_TYPES = [
  "SALE",
  "LISTING",
  "OFFER",
  "ACCEPTED_OFFER",
  "TRANSFER",
  "DELIST",
];
const ACTIVITY_WEIGHTS = [0.34, 0.26, 0.2, 0.1, 0.06, 0.04];
function activityType() {
  const r = rnd();
  let acc = 0;
  for (let i = 0; i < ACTIVITY_TYPES.length; i++) {
    acc += ACTIVITY_WEIGHTS[i];
    if (r < acc) return ACTIVITY_TYPES[i];
  }
  return "SALE";
}

const activity = [];
let aSeq = 0;
for (const it of items) {
  const n = int(1, 6);
  for (let k = 0; k < n; k++) {
    const type = activityType();
    const priced = type === "SALE" || type === "ACCEPTED_OFFER";
    const serial = it.printRun ? String(int(1, it.printRun)) : String(int(1, 9999));
    activity.push({
      id: `E${String(++aSeq).padStart(5, "0")}`,
      type,
      itemId: it.id,
      itemTitle: it.title,
      parallel: it.parallel,
      serial,
      priceCents: priced
        ? Math.round(it.lastSaleCents * (0.8 + rnd() * 0.5))
        : null,
      actor: pick(USERS),
      counterparty: pick(USERS),
      at: NOW - int(1, 90) * DAY - int(0, 23) * 3600000,
    });
  }
}
activity.sort((a, b) => b.at - a.at);

/* --------------------------------------------------------------------- me --- */

const myAssets = items
  .filter(() => chance(0.12))
  .slice(0, 14)
  .map((it, i) => ({
    copyId: `C${String(i + 1).padStart(4, "0")}`,
    itemId: it.id,
    serial: it.printRun ? String(int(1, it.printRun)) : String(int(1, 9999)),
    serialTotal: it.serialTotal,
    acquiredCents: Math.round(it.floorCents * (0.7 + rnd() * 0.5)),
    at: NOW - int(5, 400) * DAY,
    grade: chance(0.4) ? pick(["PSA 10", "PSA 9", "Raw"]) : null,
    status: "HELD",
  }));

const myListings = myAssets.slice(0, 5).map((a, i) => {
  const it = itemById.get(a.itemId);
  return {
    id: `ML${String(i + 1).padStart(4, "0")}`,
    itemId: a.itemId,
    copyId: a.copyId,
    serial: a.serial,
    serialTotal: a.serialTotal,
    priceCents: Math.round(it.askCents * (1 + rnd() * 0.2)),
    status: "ACTIVE",
    views: int(3, 210),
    watchers: int(0, 19),
    createdAt: NOW - int(1, 20) * DAY,
    expiresAt: NOW + int(3, 18) * DAY,
  };
});

const myOffersMade = items
  .filter(() => chance(0.05))
  .slice(0, 4)
  .map((it, i) => ({
    id: `MO${String(i + 1).padStart(4, "0")}`,
    itemId: it.id,
    priceCents: Math.round(it.floorCents * (0.7 + rnd() * 0.25)),
    status: chance(0.3) ? "ACCEPTED" : "OPEN",
    createdAt: NOW - int(1, 9) * DAY,
    expiresAt: NOW + int(1, 10) * DAY,
  }));

const myOffersReceived = items
  .filter(() => chance(0.05))
  .slice(0, 4)
  .map((it, i) => ({
    id: `MR${String(i + 1).padStart(4, "0")}`,
    itemId: it.id,
    priceCents: Math.round(it.floorCents * (0.75 + rnd() * 0.3)),
    buyer: pick(USERS),
    status: "OPEN",
    createdAt: NOW - int(1, 7) * DAY,
    expiresAt: NOW + int(1, 12) * DAY,
  }));

const me = {
  user: {
    id: ME.id,
    handle: "you",
    rating: 4.8,
    sales: 27,
    verified: true,
    currency: "CNY",
    balanceCents: 1286400,
    pendingCents: 96400,
    lockedCents: 182000,
  },
  assets: myAssets,
  listings: myListings,
  offersMade: myOffersMade,
  offersReceived: myOffersReceived,
  watchlist: items
    .filter(() => chance(0.04))
    .slice(0, 8)
    .map((it) => it.id),
};

/* -------------------------------------------------------------- spotlight --- */

const byRarity = (r) => items.filter((it) => it.rarity === r);
const rareSales = activity
  .filter((e) => e.type === "SALE" && e.priceCents)
  .sort((a, b) => b.priceCents - a.priceCents)
  .slice(0, 8);

const leaderboard = [...USERS]
  .sort((a, b) => b.sales - a.sales)
  .slice(0, 8)
  .map((u, i) => ({
    rank: i + 1,
    handle: u.handle,
    avatar: pick(["#2f9cff", "#a987ff", "#53d486", "#e3b95a", "#ff6f7b"]),
    trades: u.sales,
    volumeCents: u.sales * int(1800, 9200),
    change: Math.round((rnd() * 0.4 - 0.15) * 1000) / 1000,
  }));

const spotlight = {
  hero: byRarity("ultimate")
    .slice(0, 6)
    .map((it) => ({
      itemId: it.id,
      title: it.title,
      parallel: it.parallel,
      image: it.image,
      art: it.art,
      floorCents: it.floorCents,
      tag: "ULTIMATE · 1/1",
    })),
  hotSeries: [...series]
    .sort((a, b) => b.volume24hCents - a.volume24hCents)
    .slice(0, 6)
    .map((s, i) => ({ rank: i + 1, seriesId: s.id, name: s.name, volume24hCents: s.volume24hCents, change24h: s.change24h, floorCents: s.floorCents, itemCount: s.itemCount, c1: s.c1, c2: s.c2 })),
  rareSales: rareSales.map((e) => ({
    id: e.id,
    itemId: e.itemId,
    title: e.itemTitle,
    parallel: e.parallel,
    serial: e.serial,
    priceCents: e.priceCents,
    at: e.at,
    buyer: e.actor.handle,
    seller: e.counterparty.handle,
  })),
  leaderboard,
  movers: [...items]
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 6)
    .map((it) => ({
      itemId: it.id,
      title: it.title,
      parallel: it.parallel,
      change24h: it.change24h,
      floorCents: it.floorCents,
      art: it.art,
      effect: it.effect,
    })),
};

// Static export enumerates every detail page, so ids must be unique or two
// cards would fight over one route.
{
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id))
      throw new Error(`duplicate item id: ${it.id} (${it.subject})`);
    seen.add(it.id);
  }
}

/* ------------------------------------------------------------------- write --- */

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(GEN_DIR, { recursive: true });

const write = (name, obj) => {
  fs.writeFileSync(
    path.join(OUT_DIR, name),
    JSON.stringify(obj, null, 1) + "\n",
  );
  return JSON.stringify(obj).length;
};

const sizes = {
  "series.json": write("series.json", series),
  "items.json": write("items.json", items),
  "listings.json": write("listings.json", listings),
  "offers.json": write("offers.json", offers),
  "activity.json": write("activity.json", activity),
  "me.json": write("me.json", me),
  "spotlight.json": write("spotlight.json", spotlight),
};

const idsFile = `// GENERATED FILE — do not edit by hand.
// Run: node scripts/gen-market-mock.mjs
//
// Pre-render ids for the static export (output: "export" needs every dynamic
// route enumerated at build time).

export const ITEM_IDS: string[] = ${JSON.stringify(items.map((i) => i.id), null, 1)};

export const SERIES_SLUGS: string[] = ${JSON.stringify(series.map((s) => s.slug), null, 1)};
`;
fs.writeFileSync(path.join(GEN_DIR, "ids.ts"), idsFile);

console.log("items      ", items.length);
console.log("series     ", series.length);
console.log("listings   ", listings.length);
console.log("offers     ", offers.length);
console.log("activity   ", activity.length);
console.log("with scan  ", items.filter((i) => i.image).length);
console.log("bytes      ", JSON.stringify(sizes));
