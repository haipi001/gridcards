// parse_goldin.mjs — turn the raw Goldin auction scrape into archive records
// with metadata the site can trust.
//
// The scraper grabs every lot on a goldin.co "f1" search page, and that search
// is fuzzy: baseball, Pokémon, concert tickets and Hollywood photos come back
// alongside the cards we actually want. So this pass does three things:
//
//   1. REJECT anything that is not an F1 card — explicitly, with a reason, so
//      a wrong photo can never enter the archive again.
//   2. PARSE the listing title into the fields the archive renders: season,
//      set, parallel, card number, print run and subject (dual cards split).
//   3. EMIT data/goldin-archive.json in the same shape as
//      data/allofone-archive.json, so both build-archive.ts (site archive) and
//      lib/cardPhotoPlan.mjs (market + checklist photos) pick the scans up and
//      allocate them to the right card, first run.
//
// Images stay at public/img/goldin/{slug}.{ext}; the record carries its own
// `img` path so nothing is duplicated.
//
// Usage: node scripts/parse-goldin.mjs [--dry]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "public/img/goldin/manifest.json");
const OUT = path.join(ROOT, "data/goldin-archive.json");
const DRY = process.argv.includes("--dry");

/** Goldin ids start at 9001: allofone ids end at 545, so the two never collide. */
const ID_BASE = 9001;

// ---------------------------------------------------------------------------
// Subject vocabulary
// ---------------------------------------------------------------------------

/** Canonical subject names, longest first so "Kimi Antonelli" wins over "Kimi". */
const SUBJECTS = [
  "Andrea Kimi Antonelli",
  "Kimi Antonelli",
  "Kimi Raikkonen",
  "Gabriel Bortoleto",
  "George Russell",
  "Charles Leclerc",
  "Fernando Alonso",
  "Isack Hadjar",
  "Lewis Hamilton",
  "Lando Norris",
  "Max Verstappen",
  "Oliver Bearman",
  "Oscar Piastri",
  "Ayrton Senna",
  "Toto Wolff",
];

/** Fix the spellings the archive already canonicalises elsewhere. */
const SUBJECT_NORMALISE = {
  "Kimi Raikkonen": "Kimi Räikkönen",
};

/** Non-racing subjects the fuzzy "f1" search drags in. */
const NON_F1_SIGNALS = [
  /pok[ée]mon/i,
  /ohtani/i,
  /bresnahan/i,
  /cy young/i,
  /jesse haines/i,
  /dimaggio/i,
  /hank bauer/i,
  /elvis presley/i,
  /kobe bryant/i,
  /john lennon/i,
  /sports illustrated/i,
  /\bwwf\b/i,
  /\bcreed\b/i,
  /my own prison/i,
  /riaa/i,
  /type i original/i,
  /snapshot photo/i,
  /concert/i,
  /movie invitation/i,
  /sales award/i,
];

// ---------------------------------------------------------------------------
// Set vocabulary — canonical names, most specific rule first.
// ---------------------------------------------------------------------------

const SET_RULES = [
  [/topps chrome f1 sapphire|sapphire edition f1 chrome/i, "Topps Chrome F1 Sapphire Edition"],
  [/topps chrome sapphire edition f1/i, "Topps Chrome F1 Sapphire Edition"],
  [/logofractor/i, "Topps Chrome F1 LogoFractor Edition"],
  [/red check(?:er)?(?:ed)? flag/i, "Topps Chrome F1 Red Checkered Flag"],
  [/topps dynasty f1/i, "Topps Dynasty F1"],
  [/topps now f1/i, "Topps Now F1"],
  [/topps paddock pass f1/i, "Topps Paddock Pass F1"],
  [/topps finest f1/i, "Topps Finest F1"],
  [/topps eccellenza f1/i, "Topps Eccellenza F1"],
  [/topps chrome f1/i, "Topps Chrome F1"],
  [/topps chrome f$/i, "Topps Chrome F1"],
  [/panini f1 grand prix/i, "Panini F1 Grand Prix"],
];

function setFor(title) {
  for (const [re, name] of SET_RULES) if (re.test(title)) return name;
  return null;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseTitle(title) {
  const year = (title.match(/\b(19|20)\d{2}\b/) ?? [])[0] ?? "";

  // Print run: "(#08/25)", "(#1/1)", "(#04/10)" — normalise leading zeros.
  const run = title.match(/\(#0*(\d+)\/0*(\d+)\)/);
  const serial = run ? `${Number(run[1])}/${Number(run[2])}` : "";

  // Card number: the token right after the set description, "#CAC-HAM" / "#8".
  // A bare "#4/5" is the print run, not a card number — Eccellenza titles use
  // that shape, and inventing a number there would misfile the card.
  let cardNo = (title.match(/#([A-Za-z0-9-]+)/) ?? [])[1] ?? "";
  if (/^#\d+\/\d+\b/.test(title.slice(title.indexOf("#")))) cardNo = "";

  // Subjects, in order of appearance; a dual card lists both.
  const drivers = [];
  for (const s of SUBJECTS) {
    if (new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(title)) {
      drivers.push(SUBJECT_NORMALISE[s] ?? s);
    }
  }

  const setName = setFor(title);

  // Parallel / card name = the descriptive span between the set name and the
  // card number, e.g. "Patch Autograph Gold", "Helmet Collection Red".
  let parallel = "";
  if (setName) {
    const start = title.toLowerCase().indexOf(setName.toLowerCase().split(" ")[0]);
    if (start >= 0) {
      const afterSet = title.slice(start).replace(new RegExp(`^.*?${setName}`, "i"), "");
      parallel = afterSet.split(/#[A-Za-z0-9-]/)[0].replace(/\s*F1\b/i, " ").trim();
    }
  }
  if (!parallel) parallel = (title.match(/#\S+\s+(.+?)(?:\s*\(#|$)/) ?? [])[1] ?? "";

  return { year, serial, cardNo, drivers, setName, parallel };
}

/** Why a lot is (or is not) an F1 card — printed so the pass is auditable. */
function classify(title) {
  for (const re of NON_F1_SIGNALS) {
    if (re.test(title)) return { f1: false, reason: `non-F1 signal /${re.source}/` };
  }
  const hasF1 = /\bF1\b|\bFormula 1\b/i.test(title);
  const hasDriver = SUBJECTS.some((s) => new RegExp(`\\b${s}\\b`, "i").test(title));
  if (hasF1 || hasDriver) return { f1: true, reason: hasF1 ? "F1 marker" : "known subject" };
  return { f1: false, reason: "no F1 marker and no known subject" };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const records = [];
const rejected = [];
const seenCards = new Map();
let nextId = ID_BASE;

for (const lot of manifest) {
  const file = lot.image ? lot.image.split("/").pop() : "";
  const ext = (path.extname(file ?? "") || ".jpg").toLowerCase();
  // The scraper names files after the lot slug; fall back to whatever exists.
  const stem = (lot.slug ?? "").replace(/[^a-z0-9-]/gi, "_");
  let imgPath = null;
  for (const candidate of [`${stem}${ext}`, `${stem}.jpg`, `${stem}.png`, `${stem}.webp`]) {
    if (fs.existsSync(path.join(ROOT, "public/img/goldin", candidate))) {
      imgPath = `/img/goldin/${candidate}`;
      break;
    }
  }

  const verdict = classify(lot.title);
  if (!verdict.f1) {
    rejected.push({ title: lot.title, reason: verdict.reason });
    continue;
  }

  const p = parseTitle(lot.title);
  if (!p.drivers.length) {
    rejected.push({ title: lot.title, reason: "F1 but no recognisable subject" });
    continue;
  }
  if (!p.setName) {
    rejected.push({ title: lot.title, reason: "F1 but set name not recognised" });
    continue;
  }
  if (!imgPath) {
    rejected.push({ title: lot.title, reason: "no image file on disk" });
    continue;
  }

  // The same physical card is listed again and again across auctions (the
  // "f1" search rotates), so identical set + number + run + subject is one
  // card, not two. Keep the first; a second photo of the same card would put
  // the same scan on two archive ids.
  const cardKey = `${p.setName}|${p.cardNo}|${p.serial}|${p.drivers.join("/")}`;
  if (seenCards.has(cardKey)) {
    rejected.push({
      title: lot.title,
      reason: `duplicate of #${seenCards.get(cardKey)}`,
    });
    continue;
  }
  seenCards.set(cardKey, nextId);

  records.push({
    id: nextId++,
    slug: lot.slug,
    driver_name: p.drivers.join(" / "),
    set_name: p.setName,
    set_year: p.year,
    card_number: p.cardNo,
    parallel_name: p.parallel,
    serial: p.serial,
    card_name: p.parallel,
    source: "goldin",
    source_url: lot.href,
    img: imgPath,
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`scanned ${manifest.length} lots → ${records.length} F1 records, ${rejected.length} rejected\n`);
console.log("ACCEPTED");
for (const r of records) {
  console.log(
    `  #${r.id}  ${r.set_year}  ${r.set_name.padEnd(38)} ${String(r.card_number).padEnd(10)} ` +
      `${(r.serial || "unnumbered").padEnd(7)} ${r.driver_name}`,
  );
}
console.log("\nREJECTED");
for (const r of rejected) console.log(`  ✗ ${r.title.slice(0, 70)}  — ${r.reason}`);

if (DRY) {
  console.log("\n(dry run — nothing written)");
} else {
  fs.writeFileSync(OUT, JSON.stringify(records, null, 2) + "\n");
  console.log(`\nwrote ${records.length} records → ${path.relative(ROOT, OUT)}`);
}
