// Data gate for the static build.
//
// Everything this site renders is generated (public/mock/*.json) or mirrored
// (data/*.json), so a bad generator run would ship as a bad site — 300 broken
// product pages, a price of NaN, a card number that lost its leading zero.
// `npm run verify` fails the build (and CI) before that happens.
//
// Run: npm run verify

import fs from "node:fs";
import path from "node:path";
import { ITEM_IDS, SERIES_SLUGS } from "../src/market/generated/ids";
import { RARITY_ORDER } from "../src/market/rarity";

const ROOT = path.join(import.meta.dirname, "..");

let failures = 0;
let checks = 0;

function ok(label: string) {
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label: string, detail: string) {
  checks += 1;
  failures += 1;
  console.error(`  ✗ ${label}: ${detail}`);
}

function section(name: string) {
  console.log(`\n${name}`);
}

function readJson<T>(rel: string): T {
  const full = path.join(ROOT, rel);
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
}

const isInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && Number.isFinite(v);

/** Timestamps are epoch milliseconds; guard against seconds, NaN and year 1970. */
const isSaneMs = (v: unknown): boolean =>
  typeof v === "number" && v > 1_577_836_800_000 && v < 4_102_444_800_000;

function uniqueIds(rows: Array<{ id: string }>, label: string): Set<string> {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) dupes.push(r.id);
    seen.add(r.id);
  }
  if (dupes.length)
    fail(`${label} ids unique`, `${dupes.length} duplicates: ${dupes.slice(0, 3).join(", ")}`);
  else ok(`${label} ids unique (${rows.length})`);
  return seen;
}

// ---------------------------------------------------------------- checklist
type CatalogCard = { cardNumber: unknown; name: unknown };
type CatalogSource = {
  sections: Array<{ cards: CatalogCard[] }>;
};

section("checklist · data/2020-topps-chrome-f1.json");
{
  const src = readJson<CatalogSource>("data/2020-topps-chrome-f1.json");
  const cards = src.sections.flatMap((s) => s.cards);
  const bad = cards.filter((c) => typeof c.cardNumber !== "string");
  if (bad.length) fail("card numbers are strings", `${bad.length} non-string card numbers`);
  else ok(`card numbers are strings (${cards.length} cards)`);

  const empty = cards.filter((c) => typeof c.cardNumber === "string" && !c.cardNumber.trim());
  if (empty.length) fail("card numbers non-empty", `${empty.length} blank`);
  else ok("card numbers non-empty");

  const nameless = cards.filter((c) => typeof c.name !== "string" || !c.name.trim());
  if (nameless.length) fail("card names present", `${nameless.length} missing`);
  else ok("card names present");
}

// ------------------------------------------------------------------- series
type Series = {
  id: string;
  slug: string;
  name: string;
  itemCount: number;
  floorCents: number;
  volume24hCents: number;
};

section("market · public/mock/series.json");
const series = readJson<Series[]>("public/mock/series.json");
{
  uniqueIds(series.map((s) => ({ id: s.id })), "series");
  const badCount = series.filter((s) => !isInt(s.itemCount) || s.itemCount <= 0);
  if (badCount.length) fail("itemCount positive int", `${badCount.length} bad`);
  else ok("itemCount positive int");

  const badMoney = series.filter(
    (s) => !isInt(s.floorCents) || s.floorCents < 0 || !isInt(s.volume24hCents) || s.volume24hCents < 0,
  );
  if (badMoney.length) fail("money fields are non-negative cents", `${badMoney.length} bad`);
  else ok("money fields are non-negative cents");

  const slugMismatch = SERIES_SLUGS.filter((s) => !series.some((x) => x.slug === s));
  const missing = series.filter((s) => !SERIES_SLUGS.includes(s.slug));
  if (slugMismatch.length || missing.length)
    fail(
      "generated SERIES_SLUGS matches data",
      `stale: ${slugMismatch.join(", ")} | missing: ${missing.map((m) => m.slug).join(", ")}`,
    );
  else ok(`generated SERIES_SLUGS matches data (${SERIES_SLUGS.length})`);
}
const seriesIds = new Set(series.map((s) => s.id));

// -------------------------------------------------------------------- items
type Item = {
  id: string;
  seriesId: string;
  title: string;
  subject: string;
  cardNumber: unknown;
  parallel: string;
  printRun: number | null;
  serialTotal: number | null;
  rarity: string;
  // null is legitimate: CardFace falls back to livery art generated from the
  // constructor's real colours (src/components/market/CardArt.tsx).
  image: string | null;
  /** Which set/year the photograph really is; null whenever `image` is null. */
  photo: { setShort: string; year: number | null; exact: boolean } | null;
  floorCents: number;
  lastSaleCents: number | null;
  askCents: number | null;
  volume24hCents: number;
  attributes: Array<{ trait: string; value: string }>;
};

section("market · public/mock/items.json");
const items = readJson<Item[]>("public/mock/items.json");
const itemIds = uniqueIds(items, "item");
{
  const badNumber = items.filter((i) => typeof i.cardNumber !== "string");
  if (badNumber.length) fail("cardNumber is a string", `${badNumber.length} bad`);
  else ok("cardNumber is a string (never a coerced int)");

  const badRarity = items.filter((i) => !RARITY_ORDER.includes(i.rarity as never));
  if (badRarity.length)
    fail("rarity in ladder", `${badRarity.length} unknown: ${[...new Set(badRarity.map((i) => i.rarity))].join(", ")}`);
  else ok(`rarity in ladder (${RARITY_ORDER.join(" / ")})`);

  const badSeries = items.filter((i) => !seriesIds.has(i.seriesId));
  if (badSeries.length) fail("seriesId resolves", `${badSeries.length} dangling`);
  else ok("seriesId resolves");

  const moneyFields = ["floorCents", "volume24hCents"] as const;
  const badMoney = items.filter((i) => moneyFields.some((f) => !isInt(i[f]) || i[f] < 0));
  if (badMoney.length) fail("floor / volume are non-negative cents", `${badMoney.length} bad`);
  else ok("floor / volume are non-negative cents");

  const badNullableMoney = items.filter(
    (i) =>
      (i.lastSaleCents !== null && (!isInt(i.lastSaleCents) || i.lastSaleCents < 0)) ||
      (i.askCents !== null && (!isInt(i.askCents) || i.askCents < 0)),
  );
  if (badNullableMoney.length) fail("lastSale / ask are null or non-negative cents", `${badNullableMoney.length} bad`);
  else ok("lastSale / ask are null or non-negative cents");

  const badRun = items.filter(
    (i) =>
      (i.printRun !== null && (!isInt(i.printRun) || i.printRun <= 0)) ||
      (i.serialTotal !== null && (!isInt(i.serialTotal) || i.serialTotal <= 0)),
  );
  if (badRun.length) fail("printRun / serialTotal are null or positive ints", `${badRun.length} bad`);
  else ok("printRun / serialTotal are null or positive ints");

  const badImage = items.filter((i) => i.image !== null && (typeof i.image !== "string" || !i.image.startsWith("/img/")));
  if (badImage.length) fail("image is null or a local /img/ path", `${badImage.length} bad`);
  else ok("image is null or a local /img/ path");

  const withImage = items.filter((i): i is Item & { image: string } => typeof i.image === "string");
  const missingArt = withImage
    .filter((i) => !fs.existsSync(path.join(ROOT, "public", i.image.replace(/^\//, ""))))
    .map((i) => i.image);
  if (missingArt.length) fail("image file exists", `${missingArt.length} missing: ${missingArt.slice(0, 3).join(", ")}`);
  else ok(`image file exists (${withImage.length} with a real scan, ${items.length - withImage.length} livery art)`);

  // One photo, one card. A scan may never be reused: the old modulo picker hit
  // 210 by repeating 30 photographs across several cards each, which read as
  // "the same card twice" on every grid. Coverage is now lower on purpose and
  // every scan is unique, so the guard asserts uniqueness first.
  const SCAN_FLOOR = 150;
  if (withImage.length < SCAN_FLOOR)
    fail(
      `at least ${SCAN_FLOOR} editions carry a real photo`,
      `only ${withImage.length} — did the photo planner regress?`,
    );
  else ok(`at least ${SCAN_FLOOR} editions carry a real photo (${withImage.length})`);

  const seen = new Map<string, number>();
  for (const i of withImage) seen.set(i.image, (seen.get(i.image) ?? 0) + 1);
  const reused = [...seen.entries()].filter(([, n]) => n > 1);
  if (reused.length)
    fail(
      "no scan is used by two editions",
      `${reused.length} repeated: ${reused.slice(0, 3).map(([p, n]) => `${p} ×${n}`).join(", ")}`,
    );
  else ok(`no scan is used twice (${seen.size} distinct across ${withImage.length})`);

  // Parallels of one card number are physically different cards, so they must
  // not share a photograph either.
  const byNumber = new Map<string, string[]>();
  for (const i of withImage) {
    const k = `${i.subject}#${i.cardNumber}`;
    byNumber.set(k, [...(byNumber.get(k) ?? []), i.image]);
  }
  const shared = [...byNumber.entries()].filter(
    ([, imgs]) => new Set(imgs).size !== imgs.length,
  );
  if (shared.length)
    fail(
      "parallels of one card number use distinct photos",
      `${shared.length} groups share a scan, e.g. ${shared[0][0]}`,
    );
  else ok(`parallels of one card number use distinct photos (${byNumber.size} groups)`);

  // Every scan must state where it came from, so the UI can label the ones
  // that are not 2020 Topps Chrome instead of passing them off as this card.
  const noOrigin = withImage.filter(
    (i) => !i.photo || typeof i.photo.setShort !== "string" || typeof i.photo.exact !== "boolean",
  );
  if (noOrigin.length)
    fail("every scan names its set/year", `${noOrigin.length} without photo origin`);
  else ok(`every scan names its set/year (${withImage.length})`);

  // Any photo under /img/cards/ came from outside the repo, so it must carry a
  // licence and an author to credit (see THIRD_PARTY_NOTICES.md).
  const external = withImage.filter((i) => i.image.startsWith("/img/cards/"));
  let manifest: { subjects?: Array<{ images?: Array<{ file: string }> }>; series?: Array<{ images?: Array<{ file: string }> }> } | null = null;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "image-manifest.json"), "utf8"));
  } catch {
    manifest = null;
  }
  const credited = new Set(
    [...(manifest?.subjects ?? []), ...(manifest?.series ?? [])].flatMap(
      (e) => (e.images ?? []).map((i) => i.file),
    ),
  );
  const uncredited = external.map((i) => i.image).filter((f) => !credited.has(f));
  if (uncredited.length)
    fail("every fetched photo is credited in image-manifest.json", `${uncredited.length} missing: ${uncredited.slice(0, 3).join(", ")}`);
  else
    ok(`every fetched photo is credited (${external.length} from /img/cards/)`);

  const noAttrs = items.filter((i) => !Array.isArray(i.attributes) || i.attributes.length === 0);
  if (noAttrs.length) fail("attributes present", `${noAttrs.length} empty`);
  else ok("attributes present");

  const stale = ITEM_IDS.filter((id) => !itemIds.has(id));
  const missing = items.filter((i) => !ITEM_IDS.includes(i.id));
  if (stale.length || missing.length)
    fail(
      "generated ITEM_IDS matches data",
      `stale: ${stale.slice(0, 3).join(", ")} | missing: ${missing.slice(0, 3).map((m) => m.id).join(", ")}`,
    );
  else ok(`generated ITEM_IDS matches data (${ITEM_IDS.length})`);
}

// ----------------------------------------------------------------- listings
type Listing = {
  id: string;
  itemId: string;
  serial: unknown;
  serialTotal: number | null;
  priceCents: number;
  kind: string;
  createdAt: number;
  expiresAt: number;
};

section("market · public/mock/listings.json");
{
  const listings = readJson<Listing[]>("public/mock/listings.json");
  uniqueIds(listings, "listing");
  const dangling = listings.filter((l) => !itemIds.has(l.itemId));
  if (dangling.length) fail("itemId resolves", `${dangling.length} dangling`);
  else ok("itemId resolves");

  const badPrice = listings.filter((l) => !isInt(l.priceCents) || l.priceCents <= 0);
  if (badPrice.length) fail("priceCents positive int", `${badPrice.length} bad`);
  else ok("priceCents positive int");

  const badSerial = listings.filter((l) => typeof l.serial !== "string");
  if (badSerial.length) fail("serial is a string", `${badSerial.length} non-string serials`);
  else ok("serial is a string");

  const outOfRange = listings.filter(
    (l) => isInt(l.serialTotal) && typeof l.serial === "string" && Number(l.serial) > l.serialTotal,
  );
  if (outOfRange.length) fail("serial within print run", `${outOfRange.length} over the cap`);
  else ok("serial within print run");

  const badWindow = listings.filter((l) => !isSaneMs(l.createdAt) || !isSaneMs(l.expiresAt));
  if (badWindow.length) fail("createdAt / expiresAt are epoch ms", `${badWindow.length} bad`);
  else ok("createdAt / expiresAt are epoch ms");

  // One physical copy can only be on sale once: no duplicate (item, serial).
  const slots = new Set<string>();
  const dupSlot: string[] = [];
  for (const l of listings) {
    const key = `${l.itemId}|${typeof l.serial === "string" ? l.serial : ""}`;
    if (slots.has(key)) dupSlot.push(key);
    slots.add(key);
  }
  if (dupSlot.length)
    fail("one active listing per (item, serial)", `${dupSlot.length} doubled: ${dupSlot.slice(0, 3).join(", ")}`);
  else ok("one active listing per (item, serial)");
}

// ------------------------------------------------------------------- offers
type Offer = {
  id: string;
  itemId: string;
  priceCents: number;
  status: string;
  createdAt: number;
  expiresAt: number;
};

section("market · public/mock/offers.json");
{
  const offers = readJson<Offer[]>("public/mock/offers.json");
  uniqueIds(offers, "offer");
  const dangling = offers.filter((o) => !itemIds.has(o.itemId));
  if (dangling.length) fail("itemId resolves", `${dangling.length} dangling`);
  else ok("itemId resolves");

  const badPrice = offers.filter((o) => !isInt(o.priceCents) || o.priceCents <= 0);
  if (badPrice.length) fail("priceCents positive int", `${badPrice.length} bad`);
  else ok("priceCents positive int");

  const KNOWN = ["OPEN", "ACCEPTED", "DECLINED", "EXPIRED"];
  const badStatus = offers.filter((o) => !KNOWN.includes(o.status));
  if (badStatus.length)
    fail("status known", `${badStatus.length} unknown: ${[...new Set(badStatus.map((o) => o.status))].join(", ")}`);
  else ok(`status known (${KNOWN.join(" / ")})`);

  const badWindow = offers.filter((o) => !isSaneMs(o.createdAt) || !isSaneMs(o.expiresAt));
  if (badWindow.length) fail("createdAt / expiresAt are epoch ms", `${badWindow.length} bad`);
  else ok("createdAt / expiresAt are epoch ms");
}

// ----------------------------------------------------------------- activity
type Activity = { id: string; type: string; itemId: string; priceCents: number | null; at: number };

section("market · public/mock/activity.json");
{
  const activity = readJson<Activity[]>("public/mock/activity.json");
  uniqueIds(activity, "activity");
  const dangling = activity.filter((a) => !itemIds.has(a.itemId));
  if (dangling.length) fail("itemId resolves", `${dangling.length} dangling`);
  else ok("itemId resolves");

  const badPrice = activity.filter((a) => a.priceCents !== null && (!isInt(a.priceCents) || a.priceCents < 0));
  if (badPrice.length) fail("priceCents null or non-negative int", `${badPrice.length} bad`);
  else ok("priceCents null or non-negative int");

  const badTime = activity.filter((a) => !isSaneMs(a.at));
  if (badTime.length) fail("at is epoch ms", `${badTime.length} bad`);
  else ok("at is epoch ms");

  const KNOWN = ["SALE", "LISTING", "OFFER", "ACCEPTED_OFFER", "TRANSFER", "DELIST"];
  const badType = activity.filter((a) => !KNOWN.includes(a.type));
  if (badType.length)
    fail("event type known", `${badType.length} unknown: ${[...new Set(badType.map((a) => a.type))].join(", ")}`);
  else ok(`event type known (${KNOWN.join(" / ")})`);

  // A sale with no price is a lie the tape must never tell.
  const priceSale = activity.filter((a) => a.type === "SALE" && (a.priceCents === null || a.priceCents <= 0));
  if (priceSale.length) fail("SALE events carry a price", `${priceSale.length} without`);
  else ok("SALE events carry a price");
}

// ---------------------------------------------------------------------- me
section("market · public/mock/me.json");
{
  const me = readJson<{
    assets: Array<{ itemId: string }>;
    listings: Array<{ itemId: string }>;
    offersMade: Array<{ itemId: string }>;
    offersReceived: Array<{ itemId: string }>;
    watchlist: string[];
  }>("public/mock/me.json");

  for (const [label, rows] of [
    ["assets", me.assets],
    ["listings", me.listings],
    ["offersMade", me.offersMade],
    ["offersReceived", me.offersReceived],
  ] as const) {
    const dangling = rows.filter((r) => !itemIds.has(r.itemId));
    if (dangling.length) fail(`${label} itemId resolves`, `${dangling.length} dangling`);
    else ok(`${label} itemId resolves (${rows.length})`);
  }

  const badWatch = (me.watchlist ?? []).filter((id) => !itemIds.has(id));
  if (badWatch.length) fail("watchlist itemId resolves", `${badWatch.length} dangling`);
  else ok(`watchlist itemId resolves (${me.watchlist?.length ?? 0})`);
}

// ---------------------------------------------------------------- spotlight
section("market · public/mock/spotlight.json");
{
  const sp = readJson<{
    hero: Array<{ itemId: string }>;
    hotSeries: Array<{ seriesId: string }>;
    rareSales: Array<{ itemId: string }>;
    movers: Array<{ itemId: string }>;
  }>("public/mock/spotlight.json");

  const danglingItems = [...sp.hero, ...sp.rareSales, ...sp.movers].filter((x) => !itemIds.has(x.itemId));
  if (danglingItems.length) fail("spotlight itemId resolves", `${danglingItems.length} dangling`);
  else ok(`spotlight itemId resolves (${sp.hero.length + sp.rareSales.length + sp.movers.length})`);

  const danglingSeries = sp.hotSeries.filter((x) => !seriesIds.has(x.seriesId));
  if (danglingSeries.length) fail("hotSeries seriesId resolves", `${danglingSeries.length} dangling`);
  else ok(`hotSeries seriesId resolves (${sp.hotSeries.length})`);
}

// ------------------------------------------------------------------ summary
console.log(
  `\n${failures ? "FAIL" : "PASS"} — ${checks - failures}/${checks} checks passed` +
    (failures ? `, ${failures} failed` : ""),
);
process.exit(failures ? 1 : 0);
