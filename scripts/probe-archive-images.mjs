// One-off measurement: real pixel dimensions of every archive scan.
// Used to decide how the archive grid should frame images whose aspect ratios
// range from tall portrait to very wide landscape.
//
// Usage: node scripts/probe-archive-images.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "public/img/archive");

/** Minimal JPEG SOF reader — no dependencies, no full decode. */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF15 minus DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".jpg"));
const rows = [];
for (const f of files) {
  const buf = fs.readFileSync(path.join(DIR, f));
  const size = jpegSize(buf);
  if (!size) {
    console.warn("unreadable:", f);
    continue;
  }
  rows.push({ id: Number(f.replace(/\.jpg$/, "")), ...size, r: size.w / size.h });
}

rows.sort((a, b) => a.r - b.r);
const ratios = rows.map((r) => r.r);
const q = (p) => ratios[Math.floor((ratios.length - 1) * p)];
const box = 5 / 7;

console.log(`files=${files.length} measured=${rows.length}`);
console.log(
  `ratio  min=${q(0).toFixed(3)}  p10=${q(0.1).toFixed(3)}  p25=${q(0.25).toFixed(3)}  ` +
    `median=${q(0.5).toFixed(3)}  p75=${q(0.75).toFixed(3)}  p90=${q(0.9).toFixed(3)}  max=${q(1).toFixed(3)}`,
);
console.log(`container 5/7 = ${box.toFixed(3)}`);

const buckets = [
  ["< 0.62 (very tall)", (r) => r < 0.62],
  ["0.62 – 0.68", (r) => r >= 0.62 && r < 0.68],
  ["0.68 – 0.75", (r) => r >= 0.68 && r < 0.75],
  ["0.75 – 0.90", (r) => r >= 0.75 && r < 0.9],
  ["0.90 – 1.05", (r) => r >= 0.9 && r < 1.05],
  ["1.05 – 1.30", (r) => r >= 1.05 && r < 1.3],
  ["1.30 – 1.60", (r) => r >= 1.3 && r < 1.6],
  ["1.60 – 2.00", (r) => r >= 1.6 && r < 2.0],
  [">= 2.00 (panorama)", (r) => r >= 2.0],
];
for (const [label, test] of buckets) {
  const n = ratios.filter(test).length;
  console.log(`  ${label.padEnd(22)} ${String(n).padStart(4)}  ${((n / ratios.length) * 100).toFixed(1)}%`);
}

// If the box keeps 5/7 and switches to `contain`, how much of the box does an
// image of this ratio actually paint?
const fill = (r) => (r > box ? box / r : r / box);
console.log(
  `\ncontain in a fixed 5/7 box: mean fill=${(
    (ratios.reduce((s, r) => s + fill(r), 0) / ratios.length) *
    100
  ).toFixed(1)}%  worst=${(fill(q(1)) * 100).toFixed(1)}%`,
);

// With a per-card aspect ratio clamped to [lo, hi], how many images are cropped
// (by `cover`) or letterboxed (by `contain`)?
for (const [lo, hi] of [
  [0.6, 1.0],
  [0.6, 1.2],
  [0.6, 1.4],
  [0.62, 1.6],
]) {
  const inside = ratios.filter((r) => r >= lo && r <= hi).length;
  const outWide = ratios.filter((r) => r > hi).length;
  const outTall = ratios.filter((r) => r < lo).length;
  console.log(
    `clamp [${lo}, ${hi}]: exact=${inside} (${((inside / ratios.length) * 100).toFixed(1)}%) ` +
      `too-wide=${outWide} too-tall=${outTall}`,
  );
}

console.log("\nwidest 6:", rows.slice(-6).map((r) => `#${r.id} ${r.w}x${r.h} (${r.r.toFixed(2)})`).join(", "));
console.log("tallest 6:", rows.slice(0, 6).map((r) => `#${r.id} ${r.w}x${r.h} (${r.r.toFixed(2)})`).join(", "));
