// Archive data builder — turns the mirrored allofone.app archive export into
// the typed module the site renders (src/lib/archiveData.ts).
//
// Two inputs, both checked into data/:
//   allofone-archive.json — 515 one-of-one cards (2020–2026), every one with
//     a real card scan. Columns: id, driver_name, set_name, set_year, serial,
//     card_name, clean_img_url / raw_img_url / card_img_front_url.
//   driver-team.json — "<driver slug>|<season>" → constructor name, from the
//     Ergast-compatible Jolpica API. The archive has NO team column, so the
//     constructor is resolved from the season the card belongs to.
//
// Images are downloaded separately into public/img/archive/{id}.jpg. The
// builder reads each scan's real pixel size straight out of the JPEG SOF
// marker, so the gallery can frame every card at its own aspect ratio instead
// of cropping a fixed 5:7 window.
//
// Usage: npx tsx scripts/build-archive.ts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RawCard = {
  id: number;
  driver_name: string | null;
  set_name: string | null;
  set_year: string | null;
  serial: string | null;
  card_name: string | null;
  clean_img_url: string | null;
  raw_img_url: string | null;
  card_img_front_url: string | null;
  /** Goldin lots ship their own path (public/img/goldin/…); allofone does not. */
  img?: string | null;
  /** "goldin" when the record came from the auction scrape. */
  source?: string | null;
};

type OutCard = {
  id: number;
  driver: string;
  drivers: string[];
  team: string;
  serial: string;
  setName: string;
  year: string;
  cardName: string;
  img: string;
  /** Real pixel size of public/img/archive/{id}.jpg, 0 when unreadable. */
  w: number;
  h: number;
};

/**
 * Minimal JPEG dimension reader — walks markers to the first SOF and reads
 * height/width. No dependency, no full decode; 515 files in a few ms.
 */
function jpegSize(file: string): { w: number; h: number } {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return { w: 0, h: 0 };
  }
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return { w: 0, h: 0 };
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF15, minus DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    i += 2 + len;
  }
  return { w: 0, h: 0 };
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as RawCard[];

// Two scan sources feed the same archive:
//   allofone-archive.json — the mirrored allofone.app one-of-one library.
//   goldin-archive.json   — auction lots parsed out of the Goldin scrape by
//                           scripts/parse-goldin.mjs, which refuses anything
//                           that is not an F1 card and records its own image
//                           path, set, season, print run and subject.
const raw: RawCard[] = [
  ...readJson("data/allofone-archive.json"),
  ...readJson("data/goldin-archive.json"),
];
const teamByDriverYear: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/driver-team.json"), "utf8"),
);

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// The archive writes several drivers the way the paddock says them out loud,
// not the way they are entered in the official entry list.
// Written here because these two do not appear on the market checklist at all
// (Antonelli joined after 2020), so data/driver-aliases.json — which maps
// checklist spellings onto archive spellings — has no entry for them.
const ARCHIVE_ONLY_SLUG_ALIASES: Record<string, string> = {
  "kimi-antonelli": "andrea-kimi-antonelli",
};

// Merged with the shared table so both generators agree on who is who. The
// shared file maps checklist spelling -> archive spelling; this builder looks
// names up the other way round, so the pair is reversed here.
const DRIVER_SLUG_ALIASES: Record<string, string> = Object.fromEntries([
  ...Object.entries(ARCHIVE_ONLY_SLUG_ALIASES),
  ...Object.entries(
    JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "driver-aliases.json"), "utf8"),
    ) as Record<string, string>,
  )
    .filter(([k]) => !k.startsWith("_"))
    .map(([checklistName, archiveName]) => [slugify(archiveName), slugify(checklistName)]),
]);

// Names the archive catalogues that are not 2020–2026 grand prix entries.
const CONSTRUCTORS = new Set([
  "Moneygram Haas F1 Team",
  "Oracle Red Bull Racing",
  "Racing Bulls",
  "Williams",
]);

const HERITAGE = new Set([
  "Alain Prost",
  "Ayrton Senna",
  "Damon Hill",
  "David Coulthard",
  "Emerson Fittipaldi",
  "Jackie Stewart",
  "Jacques Villeneuve",
  "Juan Manuel Fangio",
  "Juan Pablo Montoya",
  "Kimi Räikkönen",
  "Mario Andretti",
  "Mark Webber",
  "Michael Schumacher",
  "Mika Häkkinen",
  "Nigel Mansell",
  "Rubens Barrichello",
]);

const PERSONNEL = new Set([
  "Ayao Komatsu",
  "Frederic Vasseur",
  "Jonathan Wheatley",
  "Laurent Mekies",
  "Mattia Binotto",
  "Toto Wolff",
]);

const NON_F1 = new Set(["Lightning McQueen"]);

function splitDrivers(name: string): string[] {
  // Dual-subject cards are stored as "Charles Leclerc / Lewis Hamilton".
  const parts = name
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [name.trim()];
}

function teamFor(driver: string, year: string): string {
  if (CONSTRUCTORS.has(driver)) return driver;
  if (NON_F1.has(driver)) return "Non-F1";
  if (PERSONNEL.has(driver)) return "Team personnel";
  if (HERITAGE.has(driver)) return "Heritage / Legend";

  const slug = DRIVER_SLUG_ALIASES[slugify(driver)] ?? slugify(driver);
  const seasons = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];
  // Prefer the season on the card; fall back to the most recent entry list the
  // driver appears in (cards are often released a season after the photo).
  const ordered = year && year !== "None" ? [year, ...seasons] : seasons;
  for (const s of ordered) {
    const hit = teamByDriverYear[`${slug}|${s}`];
    if (hit) return hit;
  }
  return "Junior / F2";
}

const cards: OutCard[] = raw
  .filter((r) => r.driver_name)
  // This is the 1/1 Digital Archive: a Goldin lot graded #8/25 is a real card
  // with a real photo, but it is not a one-of-one, so it belongs to the market
  // photo pool (lib/cardPhotoPlan.mjs) rather than to this gallery.
  //
  // For allofone an empty serial means the source never numbered it and the
  // archive has always defaulted those to 1/1. A Goldin *listing* without a
  // print run is just a listing that didn't show one — a base card is far more
  // likely than a 1/1 — so those stay out of the gallery too.
  .filter((r) => {
    const serial = (r.serial ?? "").trim();
    return serial === "1/1" || (r.source !== "goldin" && serial === "");
  })
  .map((r) => {
    const driver = r.driver_name!.trim();
    const year = (r.set_year ?? "").trim() || "Undated";
    const team = teamFor(splitDrivers(driver)[0], year);
    // Goldin lots keep their scraped file; allofone cards are numbered.
    const img = r.img?.trim() || `/img/archive/${r.id}.jpg`;
    return {
      id: r.id,
      driver,
      drivers: splitDrivers(driver),
      team,
      serial: (r.serial ?? "1/1").trim() || "1/1",
      setName: (r.set_name ?? "").trim() || "Unknown set",
      year,
      cardName: (r.card_name ?? "").trim(),
      img,
      ...jpegSize(path.join(ROOT, "public", img.replace(/^\//, ""))),
    };
  })
  .sort((a, b) => a.id - b.id);

const missing = cards.filter((c) => !c.w || !c.h);
if (missing.length) {
  console.warn(`no pixel size for ${missing.length} card(s):`, missing.map((c) => c.id).join(","));
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const q = (s: string) => JSON.stringify(s);

const body = cards
  .map((c) => {
    const fields = [
      `    "id": ${c.id}`,
      `    "driver": ${q(c.driver)}`,
      `    "drivers": [${c.drivers.map(q).join(", ")}]`,
      `    "team": ${q(c.team)}`,
      `    "serial": ${q(c.serial)}`,
      `    "setName": ${q(c.setName)}`,
      `    "year": ${q(c.year)}`,
      `    "cardName": ${q(c.cardName)}`,
      `    "img": ${q(c.img)}`,
      `    "w": ${c.w}`,
      `    "h": ${c.h}`,
    ];
    return `  {\n${fields.join(",\n")}\n  }`;
  })
  .join(",\n");

// Seasons newest-first; the handful of cards with no set year sort last.
const years = [...new Set(cards.map((c) => c.year))].sort((a, b) => {
  if (a === "Undated") return 1;
  if (b === "Undated") return -1;
  return b.localeCompare(a);
});
const seasons = years.filter((y) => y !== "Undated");
const sets = [...new Set(cards.map((c) => c.setName))].sort();
const teams = [...new Set(cards.map((c) => c.team))].sort();

const out = `// 1/1 Digital Archive — mirrored from allofone.app.
// GENERATED FILE — do not edit by hand. Run: npx tsx scripts/build-archive.ts
//
// ${cards.length} one-of-one cards spanning ${seasons[seasons.length - 1]}–${seasons[0]}, ${sets.length} Topps
// F1 sets and ${new Set(cards.flatMap((c) => c.drivers)).size} subjects. Every card has a real scan served
// from public/img/archive/{id}.jpg, so the gallery works fully offline.
//
// Sources: data/allofone-archive.json (cards + imagery) and
// data/driver-team.json (constructor per season, from the Ergast-compatible
// Jolpica API — the archive itself carries no team column).
//
// \`w\`/\`h\` are the real pixel size of each scan, read from the JPEG header at
// build time. The gallery frames cards at their own aspect ratio so nothing is
// cropped — see src/lib/archiveAspect.ts.

export type ArchiveCard = {
  id: number;
  /** Raw subject as catalogued, e.g. "Charles Leclerc / Lewis Hamilton". */
  driver: string;
  /** Split subjects — a dual card belongs to both drivers. */
  drivers: string[];
  team: string;
  serial: string;
  setName: string;
  year: string;
  cardName: string;
  img: string;
  /** Real scan width in px; 0 when the file could not be read. */
  w: number;
  /** Real scan height in px; 0 when the file could not be read. */
  h: number;
};

export const ARCHIVE_CARDS: ArchiveCard[] = [
${body}
];

export const ARCHIVE_YEARS: string[] = ${JSON.stringify(years)};

export const ARCHIVE_SETS: string[] = ${JSON.stringify(sets)};

export const ARCHIVE_TEAMS: string[] = ${JSON.stringify(teams)};

// ---------------------------------------------------------------------------
// Classification helpers for the archive browser.
//
// Subject names are canonicalised against the official checklist so the same
// driver is one filter entry even when the archive spells them differently.
// ---------------------------------------------------------------------------

/** Archive spelling → catalog spelling. */
const DRIVER_ALIASES: Record<string, string> = {
  "alex albon": "Alexander Albon",
  "kimi antonelli": "Andrea Kimi Antonelli",
  "sebestian vettel": "Sebastian Vettel",
  "sergio perez": "Sergio Pérez",
  "zhou guanyu": "Guanyu Zhou",
};

export function canonicalDriver(name: string): string {
  return DRIVER_ALIASES[name.trim().toLowerCase()] ?? name.trim();
}

export const ARCHIVE_DRIVER_NAMES: string[] = [
  ...new Set(ARCHIVE_CARDS.flatMap((c) => c.drivers).map(canonicalDriver)),
].sort((a, b) => a.localeCompare(b));

export const ARCHIVE_DRIVERS: string[] = [...new Set(ARCHIVE_CARDS.map((c) => c.driver))];

function compare(a: { name: string; count: number }, b: { name: string; count: number }) {
  return b.count - a.count || a.name.localeCompare(b.name);
}

export function archiveDriverCounts(): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const card of ARCHIVE_CARDS) {
    for (const driver of card.drivers) {
      const name = canonicalDriver(driver);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort(compare);
}

export function archiveSetCounts(): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const card of ARCHIVE_CARDS) {
    counts.set(card.setName, (counts.get(card.setName) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort(compare);
}

export function archiveTeamCounts(): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const card of ARCHIVE_CARDS) {
    counts.set(card.team, (counts.get(card.team) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort(compare);
}

export function archiveYearCounts(): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const card of ARCHIVE_CARDS) {
    counts.set(card.year, (counts.get(card.year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** All 1/1 scans for a driver, including dual-subject cards. */
export function archiveForDriver(name: string): ArchiveCard[] {
  const target = canonicalDriver(name).toLowerCase();
  const targetSlug = slugKey(name);
  return ARCHIVE_CARDS.filter((c) =>
    c.drivers.some((d) => {
      const d1 = canonicalDriver(d).toLowerCase();
      return d1 === target || slugKey(d1) === targetSlug;
    }),
  ).sort((a, b) => b.year.localeCompare(a.year) || a.id - b.id);
}

function slugKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
`;

fs.writeFileSync(path.join(ROOT, "src/lib/archiveData.ts"), out);

const byTeam = new Map<string, number>();
for (const c of cards) byTeam.set(c.team, (byTeam.get(c.team) ?? 0) + 1);
const portrait = cards.filter((c) => c.h && c.w / c.h < 1).length;
console.log(
  `wrote ${cards.length} cards · ${years.length} years ${years.join(",")} · ${sets.length} sets · ${byTeam.size} teams`,
);
console.log(`scans: ${portrait} portrait / ${cards.length - portrait} landscape · ${missing.length} unmeasured`);
console.log("teams:", [...byTeam.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12));
