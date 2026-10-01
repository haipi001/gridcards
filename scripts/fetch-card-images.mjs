// Fetches real photographs for the subjects the 1/1 archive has never
// photographed, so no card in the catalogue has to fall back to generated art.
//
//   node scripts/fetch-card-images.mjs [--dry]
//
// Reads  data/image-manifest.json  (subject -> Wikimedia Commons search)
// Writes public/img/cards/*.jpg    (resized, re-encoded)
//    and data/image-manifest.json  (licence / author / source written back)
//
// Source is Wikimedia Commons rather than a general image search because its
// API reports a machine-readable licence and author for every file. Anything
// that is not CC0 / CC-BY / CC-BY-SA / public domain is skipped — the site has
// to be able to credit what it shows (see THIRD_PARTY_NOTICES.md).

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "img", "cards");
const MANIFEST = path.join(ROOT, "data", "image-manifest.json");
const DRY = process.argv.includes("--dry");

const API = "https://commons.wikimedia.org/w/api.php";
// Wikimedia asks that clients identify themselves; requests without a
// descriptive User-Agent get throttled.
const UA =
  "gridcards-card-images/1.0 (static F1 trading-card prototype; +https://github.com/gridcards)";

const FREE = /^(cc0|cc by|cc-by|public domain|pd)/i;
const MAX_W = 360;
const MAX_H = 504;

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const entries = [...manifest.subjects, ...manifest.series];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikimedia throttles bursts, and some networks drop the connection outright.
// Back off a few times before giving up on a single request.
async function retry(fn, tries = 4, label = "request") {
  let last;
  for (let i = 0; i < tries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < tries - 1) await sleep(1500 * 2 ** i);
    }
  }
  throw new Error(`${label}: ${last?.message ?? "failed"}`);
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Written after every subject so an interrupted run can simply be restarted.
function saveManifest() {
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n", "utf8");
}

function stripHtml(s) {
  return (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** Search Commons for file pages and keep the freely licensed ones. */
async function search(query, want) {
  const url =
    `${API}?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6` +
    `&gsrlimit=${Math.min(50, Math.max(10, want * 4))}` +
    `&prop=imageinfo&iiprop=url|extmetadata|size`;
  const json = await getJSON(url);
  const pages = Object.values(json?.query?.pages ?? {});
  const out = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value);
    if (!license || !FREE.test(license)) continue;
    if (!/\.(jpe?g|png)$/i.test(info.url)) continue;
    if ((info.width ?? 0) < 300 || (info.height ?? 0) < 300) continue;
    out.push({
      url: info.url,
      license,
      artist: stripHtml(meta.Artist?.value) || "Unknown",
      sourceUrl: info.descriptionurl ?? page.title,
    });
  }
  return out;
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

let sharp = null;
if (!DRY) {
  sharp = (await import("sharp")).default;
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const report = [];
let written = 0;
let skipped = 0;

for (const entry of entries) {
  // Already fetched on an earlier run — leave the files and credits alone.
  if (entry.images?.length >= entry.need) {
    skipped += entry.need;
    continue;
  }
  let hits = [];
  try {
    hits = await retry(() => search(entry.query, entry.need), 4, "search");
  } catch (err) {
    report.push(`  ! ${entry.key}: search failed — ${err.message}`);
    saveManifest();
    continue;
  }
  if (!hits.length) {
    report.push(`  ! ${entry.key}: no freely licensed result for "${entry.query}"`);
    continue;
  }

  const images = [];
  let n = 0;
  for (const hit of hits) {
    if (n >= entry.need) break;
    const file = `${entry.slug}-${n + 1}.jpg`;
    const dest = path.join(OUT_DIR, file);
    if (DRY) {
      images.push({ file: `/img/cards/${file}`, ...hit });
      n += 1;
      continue;
    }
    try {
      const buf = await retry(() => download(hit.url), 3, "download");
      // `inside` keeps the original proportions — the card frame letterboxes a
      // landscape photo rather than cropping half of it away.
      await sharp(buf)
        .rotate()
        .resize(MAX_W, MAX_H, { fit: "inside", withoutEnlargement: false })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(dest);
      images.push({ file: `/img/cards/${file}`, ...hit });
      written += 1;
      n += 1;
    } catch (err) {
      report.push(`  ! ${entry.key}: ${hit.url} — ${err.message}`);
    }
    await sleep(250);
  }

  entry.images = images;
  if (images.length < entry.need) {
    report.push(
      `  ~ ${entry.key}: got ${images.length}/${entry.need} for "${entry.query}"`,
    );
  }
  if (!DRY) saveManifest();
  await sleep(400);
}

const total = entries.reduce((a, e) => a + (e.need ?? 0), 0);
const got = entries.reduce((a, e) => a + (e.images?.length ?? 0), 0);
console.log(
  DRY
    ? `--dry: ${entries.length} subjects, ${total} images wanted`
    : `fetched ${written} new (${skipped} already present) · ${got}/${total} covered`,
);
if (report.length) {
  console.log("\nshortfalls:");
  console.log(report.join("\n"));
}
