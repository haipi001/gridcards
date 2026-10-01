// One place that decides which real photograph a card shows.
//
// Shared by gen-market-mock.mjs and gen-catalog-images.mjs so the market grid
// and the home checklist cannot disagree about who has a scan.
//
// Three tiers, best first:
//   portrait  — an upright 1/1 scan. Fills the 2.5:3.5 card frame as shot.
//   landscape — a sideways 1/1 scan. Letterboxed rather than cropped.
//   external  — a Wikimedia photograph fetched by fetch-card-images.mjs for a
//               subject the archive never photographed. Only used once the real
//               scans run out.
//
// Every tier is walked with a modulo cursor, so when a subject has fewer photos
// than editions the photos repeat instead of leaving cards blank. Parallels of
// one card genuinely look alike, so a repeat beats generated art.

import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");

const read = (...parts) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, ...parts), "utf8"));

export function loadAliases() {
  const raw = read("data", "driver-aliases.json");
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => !k.startsWith("_")),
  );
}

/** Real pixel size out of the JPEG SOF marker — no image library needed. */
export function jpegSize(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return null;
  }
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  return null;
}

const EMPTY = { portrait: [], landscape: [], external: [] };

/**
 * Builds the per-subject photo pools and returns a lookup that hands out the
 * next photo for a subject. `key(name)` resolves a spelling through the alias
 * table; pass the raw checklist / item subject to it.
 */
export function createImagePicker() {
  const aliases = loadAliases();
  const key = (name) => {
    const n = (name ?? "").trim();
    return aliases[n] ?? n;
  };

  const archive = read("data", "allofone-archive.json");
  const pools = new Map();
  const bucket = (name) => {
    if (!pools.has(name)) pools.set(name, { portrait: [], landscape: [], external: [] });
    return pools.get(name);
  };

  for (const c of archive) {
    const name = key(c.driver_name);
    const file = path.join(ROOT, "public", "img", "archive", `${c.id}.jpg`);
    if (!name || !fs.existsSync(file)) continue;
    const size = jpegSize(file);
    // An unreadable header is treated as upright rather than dropped.
    const upright = size && size.h ? size.w / size.h < 1.0 : true;
    bucket(name)[upright ? "portrait" : "landscape"].push(`/img/archive/${c.id}.jpg`);
  }

  // Fetched photographs, if fetch-card-images.mjs has been run. Absent file is
  // fine — the pools simply stay empty and those cards keep generated art.
  let manifest = null;
  try {
    manifest = read("data", "image-manifest.json");
  } catch {
    manifest = null;
  }
  if (manifest) {
    for (const entry of [...(manifest.subjects ?? []), ...(manifest.series ?? [])]) {
      const files = (entry.images ?? []).map((i) => i.file);
      if (!files.length) continue;
      bucket(key(entry.key)).external.push(...files);
    }
  }

  const cursor = new Map();

  /** Next photo for `subject`, or null when nothing exists for them at all. */
  function next(subject) {
    const k = key(subject);
    const pool = pools.get(k) ?? EMPTY;
    const all = [...pool.portrait, ...pool.landscape, ...pool.external];
    if (!all.length) return null;
    const at = cursor.get(k) ?? 0;
    cursor.set(k, at + 1);
    return all[at % all.length];
  }

  /** How many distinct photos are known for `subject` (0 = none at all). */
  function count(subject) {
    const p = pools.get(key(subject)) ?? EMPTY;
    return p.portrait.length + p.landscape.length + p.external.length;
  }

  return { key, next, count, pools };
}
