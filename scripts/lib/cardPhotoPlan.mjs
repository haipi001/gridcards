// One photo, one card — decided once, for the whole site.
//
// Why this exists: the old picker handed out a driver's photos with a modulo
// cursor, so as soon as a driver had fewer scans than editions the scans
// repeated, and the same photograph ended up on five different parallels of
// one card number. It also ignored which *set* a scan came from, so a 2020
// Topps Chrome card happily showed a 2025 Topps Dynasty card.
//
// This planner allocates in one deterministic pass:
//
//   1. Every scan is ranked by how well it matches the site's subject:
//      exact (2020 Topps Chrome) > Chrome from another year > any other F1 set.
//   2. Every tradable edition in the market is a slot. Slots are filled from
//      the best scan down, rarest edition first, and a scan is used ONCE.
//   3. Same card number, different parallels therefore get different photos.
//   4. Whatever is left over goes to checklist records that are not tradable
//      editions (F2 racers, crew, …), again without repeating.
//
// The result carries the scan's own set and year, so the UI can label a photo
// that is not from 2020 Chrome instead of passing it off as the real card.

import fs from "node:fs";
import path from "node:path";
import { ROOT, jpegSize, loadAliases } from "./cardImages.mjs";
import { RARITY_RANK, allEditionSlots } from "./ladder.mjs";

// These sections are checklist records named after a driver, but the card
// itself depicts a car. A driver scan there is simply the wrong photograph, so
// they keep the generated car art instead.
const CAR_SECTIONS = new Set(["f1-cars", "f2-cars"]);

const read = (...parts) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, ...parts), "utf8"));

/** "Topps Dynasty F1" -> "Dynasty" — short enough for a corner badge. */
function shortSet(setName) {
  return (setName ?? "")
    .replace(/^Topps\s+/i, "")
    .replace(/\s*F1\s*$/i, "")
    .trim();
}

function rankScan(r) {
  const setName = (r.set_name ?? "").trim();
  const year = Number.parseInt(String(r.set_year ?? ""), 10);
  const isChrome = setName === "Topps Chrome F1";
  const is2020 = year === 2020;
  // 0 = the real thing, 1 = right product / wrong year, 2 = another product.
  const tier = isChrome && is2020 ? 0 : isChrome ? 1 : 2;
  // Inside a tier, the year closest to the site's subject wins.
  const drift = Number.isFinite(year) ? Math.abs(year - 2020) : 999;
  return { tier, drift, id: r.id, setName, year: Number.isFinite(year) ? year : null };
}

/** Loads every scan the archive actually has on disk, best match first. */
function loadScans(aliases) {
  const key = (name) => {
    const n = (name ?? "").trim();
    return aliases[n] ?? n;
  };
  const archive = read("data", "allofone-archive.json");
  const byDriver = new Map();

  for (const r of archive) {
    const driver = key(r.driver_name);
    if (!driver) continue;
    const file = path.join(ROOT, "public", "img", "archive", `${r.id}.jpg`);
    if (!fs.existsSync(file)) continue;
    const size = jpegSize(file);
    const upright = size && size.h ? size.w / size.h < 1.0 : true;
    const { tier, drift, id, setName, year } = rankScan(r);
    if (!byDriver.has(driver)) byDriver.set(driver, []);
    byDriver.get(driver).push({
      id,
      src: `/img/archive/${id}.jpg`,
      set: setName,
      setShort: shortSet(setName),
      year,
      exact: tier === 0,
      tier,
      drift,
      upright,
    });
  }

  for (const list of byDriver.values()) {
    list.sort(
      (a, b) => a.tier - b.tier || a.drift - b.drift || a.id - b.id,
    );
  }
  return { key, byDriver };
}

const slotKey = (s) => `${s.sectionSlug}#${s.cardNumber}#${s.parallel}`;

// Card numbers are a mix of "1" and "TT-1"; sort digits first, text after, so
// the allocation order never depends on string luck.
function cardOrder(a, b) {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  if (Number.isFinite(na)) return -1;
  if (Number.isFinite(nb)) return 1;
  return a.localeCompare(b);
}

/**
 * Allocates every scan to at most one card.
 *
 * Returns `{ editions, records }`:
 *   editions — "section#cardNumber#parallel" -> scan
 *   records  — "section#cardNumber"          -> scan (for the checklist grid)
 */
export function buildPhotoPlan(catalogPath = ["data", "2020-topps-chrome-f1.json"]) {
  const aliases = loadAliases();
  const { key, byDriver } = loadScans(aliases);
  const catalog = read(...catalogPath);

  const editions = new Map();
  // "section#cardNumber" -> [{ parallel, rarity, scan }] — lets pass 2 pick the
  // Base edition's photo without guessing a rarity back out of a string.
  const byRecord = new Map();

  // Pass 1 — tradable editions. Rarest first, so the 1/1 takes the most
  // accurate scan available for that driver.
  const slots = allEditionSlots(catalog).filter(
    (s) => s.kind === "person" && !CAR_SECTIONS.has(s.sectionSlug),
  );

  const bySubject = new Map();
  slots.forEach((s, i) => {
    const k = key(s.subject);
    if (!bySubject.has(k)) bySubject.set(k, []);
    bySubject.get(k).push({ ...s, order: i });
  });

  for (const [driver, list] of bySubject) {
    const scans = byDriver.get(driver) ?? [];
    if (!scans.length) continue;
    list.sort(
      (a, b) =>
        RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity] ||
        cardOrder(a.cardNumber, b.cardNumber) ||
        a.order - b.order ||
        a.parallel.localeCompare(b.parallel),
    );
    list.forEach((s, i) => {
      // Out of scans: the edition keeps generated art. Repeating a photo would
      // put the same card back on two different editions.
      if (i >= scans.length) return;
      const scan = scans[i];
      editions.set(slotKey(s), scan);
      const rk = `${s.sectionSlug}#${s.cardNumber}`;
      if (!byRecord.has(rk)) byRecord.set(rk, []);
      byRecord.get(rk).push({ parallel: s.parallel, rarity: s.rarity, scan });
    });
  }

  // Pass 2 — checklist records that are not tradable editions (F2 racers,
  // crew, …). They take whatever their subject has left.
  const used = new Set([...editions.values()].map((s) => s.src));
  const records = new Map();
  const leftovers = new Map();
  for (const [driver, scans] of byDriver) {
    const free = scans.filter((s) => !used.has(s.src));
    if (free.length) leftovers.set(driver, free);
  }

  for (const section of catalog.sections) {
    if (CAR_SECTIONS.has(section.slug)) continue;
    for (const card of section.cards) {
      if (card.kind !== "person") continue;
      const rk = `${section.slug}#${card.cardNumber}`;
      const owned = byRecord.get(rk);
      if (owned && owned.length) {
        // Every edition here is the same card number, so any of them is a fair
        // picture of this record — take the most accurate one (2020 Chrome
        // first), and among equally accurate ones the Base parallel, because
        // the checklist row is the base card.
        const best = owned
          .slice()
          .sort(
            (a, b) =>
              a.scan.tier - b.scan.tier ||
              a.scan.drift - b.scan.drift ||
              RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity],
          )[0];
        records.set(rk, best.scan);
        continue;
      }
      const free = leftovers.get(key(card.name));
      if (free && free.length) records.set(rk, free.shift());
    }
  }

  return { editions, records, byDriver };
}
