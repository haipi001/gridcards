// Constructor marks — self-drawn geometric badges that replace the third-party
// team logos the site used to ship.
//
// Why this exists: the 10 PNGs previously under public/img/teams/ came from an
// AGPL-licensed repository. AGPL obligations and the team trademarks behind the
// artwork are both wrong for a statically exported demo, so the marks are now
// generated here from each constructor's livery colours. They are abstract
// geometry — no manufacturer artwork is reproduced.
//
// Usage: npx tsx scripts/gen-team-marks.ts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/img/teams");

type Shape =
  | "chevron"
  | "doubleChevron"
  | "shield"
  | "wedge"
  | "bars"
  | "splitSquare"
  | "grid"
  | "hex"
  | "horns"
  | "orbit";

type Mark = { file: string; a: string; b: string; shape: Shape };

// Livery colours mirror src/lib/teams.ts; teams added after the 2020 checklist
// (Alpine, Kick Sauber, Racing Bulls) carry their current colours.
const MARKS: Mark[] = [
  { file: "mercedes", a: "#00d7b6", b: "#0b3a3f", shape: "chevron" },
  { file: "red-bull-racing", a: "#1e41ff", b: "#141a4d", shape: "doubleChevron" },
  { file: "ferrari", a: "#e8002d", b: "#3d0a12", shape: "shield" },
  { file: "mclaren", a: "#ff8700", b: "#3b2000", shape: "wedge" },
  { file: "alpine", a: "#00a1e8", b: "#0d2340", shape: "orbit" },
  { file: "aston-martin", a: "#00d1b2", b: "#05352c", shape: "bars" },
  { file: "williams", a: "#0082fa", b: "#062a4d", shape: "splitSquare" },
  { file: "haas-f1-team", a: "#d9dee3", b: "#2a2f34", shape: "grid" },
  { file: "kick-sauber", a: "#00e701", b: "#0b1f0b", shape: "hex" },
  { file: "racing-bulls", a: "#469bff", b: "#0f2b4d", shape: "horns" },
];

function body(shape: Shape, a: string, b: string): string {
  switch (shape) {
    case "chevron":
      return `<path d="M60 22 L98 82 L60 66 L22 82 Z" fill="${a}"/>\n  <path d="M60 40 L82 78 L60 68 L38 78 Z" fill="${b}" opacity=".85"/>`;
    case "doubleChevron":
      return `<path d="M60 18 L96 56 L60 44 L24 56 Z" fill="${a}"/>\n  <path d="M60 56 L96 94 L60 82 L24 94 Z" fill="${a}" opacity=".72"/>`;
    case "shield":
      return `<path d="M60 18 L96 34 V66 Q96 90 60 104 Q24 90 24 66 V34 Z" fill="${a}"/>\n  <path d="M60 32 L82 42 V66 Q82 80 60 90 Q38 80 38 66 V42 Z" fill="${b}" opacity=".8"/>`;
    case "wedge":
      return `<path d="M20 40 H84 L100 60 H36 Z" fill="${a}"/>\n  <path d="M20 68 H84 L100 88 H36 Z" fill="${a}" opacity=".6"/>`;
    case "orbit":
      return `<circle cx="60" cy="60" r="38" fill="none" stroke="${a}" stroke-width="10"/>\n  <circle cx="60" cy="60" r="16" fill="${b}"/>\n  <circle cx="60" cy="22" r="9" fill="${a}"/>`;
    case "bars":
      return `<path d="M14 44 H106 V56 H14 Z" fill="${a}"/>\n  <path d="M26 66 H94 V78 H26 Z" fill="${a}" opacity=".65"/>\n  <path d="M40 88 H80 V98 H40 Z" fill="${b}"/>`;
    case "splitSquare":
      return `<path d="M26 26 H94 V94 H26 Z" fill="${b}"/>\n  <path d="M26 26 H94 L26 94 Z" fill="${a}"/>`;
    case "grid":
      return `<rect x="26" y="26" width="30" height="30" rx="4" fill="${a}"/>\n  <rect x="64" y="26" width="30" height="30" rx="4" fill="${b}" stroke="${a}" stroke-width="3"/>\n  <rect x="26" y="64" width="30" height="30" rx="4" fill="${b}" stroke="${a}" stroke-width="3"/>\n  <rect x="64" y="64" width="30" height="30" rx="4" fill="${a}"/>`;
    case "hex":
      return `<path d="M60 18 L96 39 V81 L60 102 L24 81 V39 Z" fill="${b}" stroke="${a}" stroke-width="6"/>\n  <path d="M60 40 L80 52 V80 L60 92 L40 80 V52 Z" fill="${a}" opacity=".8"/>`;
    case "horns":
      return `<path d="M22 34 Q46 22 58 56" fill="none" stroke="${a}" stroke-width="12" stroke-linecap="round"/>\n  <path d="M98 34 Q74 22 62 56" fill="none" stroke="${a}" stroke-width="12" stroke-linecap="round"/>\n  <path d="M60 58 V96" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round"/>`;
  }
}

function svg(mark: Mark): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Constructor mark">
  ${body(mark.shape, mark.a, mark.b)}
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const mark of MARKS) {
  fs.writeFileSync(path.join(OUT, `${mark.file}.svg`), svg(mark));
}
console.log(`wrote ${MARKS.length} constructor marks to public/img/teams/`);
