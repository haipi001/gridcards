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
// Images are downloaded separately into public/img/archive/{id}.jpg.
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
};

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw: RawCard[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/allofone-archive.json"), "utf8"),
);
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
const DRIVER_SLUG_ALIASES: Record<string, string> = {
  "alex-albon": "alexander-albon",
  "kimi-antonelli": "andrea-kimi-antonelli",
  "zhou-guanyu": "guanyu-zhou",
};

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
  .map((r) => {
    const driver = r.driver_name!.trim();
    const year = (r.set_year ?? "").trim() || "Undated";
    const team = teamFor(splitDrivers(driver)[0], year);
    return {
      id: r.id,
      driver,
      drivers: splitDrivers(driver),
      team,
      serial: (r.serial ?? "1/1").trim() || "1/1",
      setName: (r.set_name ?? "").trim() || "Unknown set",
      year,
      cardName: (r.card_name ?? "").trim(),
      img: `/img/archive/${r.id}.jpg`,
    };
  })
  .sort((a, b) => a.id - b.id);

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
console.log(
  `wrote ${cards.length} cards · ${years.length} years ${years.join(",")} · ${sets.length} sets · ${byTeam.size} teams`,
);
console.log("teams:", [...byTeam.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12));
