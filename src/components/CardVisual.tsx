// Card art — replaces the single generic silhouette that every one of the 313
// cards used to share. Three figures, chosen from the real checklist data:
//
//   racer  drivers, crew, award winners  → helmeted figure
//   car    F1/F2 car checklist sections  → side-view grand prix car
//   crest  team / collection records     → shield badge
//
// Colours come from the constructor's real livery via src/lib/teams.ts and are
// passed as inline CSS variables, so no SVG defs ids ever collide between the
// hundreds of cards rendered on one page.

import type { ArtKind } from "@/lib/teams";

export default function CardVisual({
  art,
  a,
  b,
  className,
}: {
  art: ArtKind;
  a: string;
  b: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 128"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      style={{ "--artA": a, "--artB": b } as React.CSSProperties}
    >
      {art === "car" ? <CarArt /> : art === "crest" ? <CrestArt /> : <RacerArt />}
    </svg>
  );
}

function RacerArt() {
  return (
    <g>
      {/* torso */}
      <path
        d="M50 72c-16 0-27 9-30 26l-4 30h68l-4-30c-3-17-14-26-30-26z"
        fill="#151a20"
      />
      {/* shoulder yoke in team colour */}
      <path
        d="M50 72c-9 0-16.5 2.6-21.6 7.4L50 86l21.6-6.6C66.5 74.6 59 72 50 72z"
        fill="var(--artB)"
        opacity=".75"
      />
      {/* collar */}
      <path d="M41 73l9 13 9-13c-3-1.6-15-1.6-18 0z" fill="var(--artA)" />
      {/* helmet shell */}
      <path
        d="M50 8c-19 0-30 16-30 38 0 15 6 25 13 29h34c7-4 13-14 13-29 0-22-11-38-30-38z"
        fill="var(--artA)"
      />
      {/* side shading */}
      <path
        d="M50 8c-17 0-27.5 13-29 32h13c0-18 7-30 16-32z"
        fill="var(--artB)"
        opacity=".55"
      />
      <path
        d="M50 8c14 1 24 11 27 26l2 12c2-14-1-38-29-38z"
        fill="var(--artB)"
        opacity=".35"
      />
      {/* centre stripe */}
      <rect x="46" y="9" width="8" height="29" rx="4" fill="var(--artB)" opacity=".5" />
      {/* visor window */}
      <rect x="29" y="40" width="42" height="15" rx="7.5" fill="#0b0f13" />
      <rect x="33" y="43" width="22" height="4.5" rx="2.2" fill="#fff" opacity=".22" />
      {/* helmet gloss */}
      <path
        d="M22 38c1-16 11-27 26-29-12 5-19 15-20 29z"
        fill="#fff"
        opacity=".14"
      />
      {/* chin bar */}
      <path
        d="M33 75c7 6 27 6 34 0l-2 9c-6 4-24 4-30 0z"
        fill="#0e1318"
      />
    </g>
  );
}

function CarArt() {
  return (
    <g>
      {/* rear wing — two elements + endplate + pylon */}
      <path d="M9 49h24v4H9z" fill="var(--artA)" />
      <path d="M11 44h20v3.4H11z" fill="var(--artA)" opacity=".85" />
      <path d="M11 44h3v40h-3z" fill="#0d1116" />
      <path d="M24 53h3v24h-3z" fill="#0d1116" />
      {/* front wing + endplate */}
      <path d="M79 95h19v4H79z" fill="var(--artA)" />
      <path d="M94 85h3.6v14H94z" fill="#0d1116" />
      {/* floor */}
      <path d="M11 83l79-1 3 6-82 1z" fill="var(--artB)" />
      {/* body — low nose flowing into cockpit and engine cover */}
      <path
        d="M98 79c-10-2-20-2-28-5-4-7-10-14-18-14-4 0-8 3-12 8-8 3-20 5-30 6l-3 8 6 5h82z"
        fill="var(--artA)"
      />
      {/* engine cover shadow */}
      <path
        d="M52 60c-4 0-8 3-12 8-8 3-20 5-30 6l-1 3 20-3c10-2 18-6 23-14z"
        fill="var(--artB)"
        opacity=".65"
      />
      {/* cockpit opening */}
      <path d="M43 60l8-2 5 5-2 6-8 1z" fill="#0b0f13" />
      {/* halo */}
      <path
        d="M41 61c2-6 13-8 17-1"
        fill="none"
        stroke="#0d1116"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* driver helmet */}
      <circle cx="49" cy="58" r="4.6" fill="#e8ecf0" />
      <path d="M44.4 58a4.6 4.6 0 019.2 0z" fill="#0b0f13" />
      {/* wheels on top */}
      <circle cx="24" cy="90" r="12.5" fill="#0b0f13" />
      <circle cx="24" cy="90" r="5" fill="#2c333b" />
      <circle cx="76" cy="90" r="11.5" fill="#0b0f13" />
      <circle cx="76" cy="90" r="4.6" fill="#2c333b" />
    </g>
  );
}

function CrestArt() {
  return (
    <g>
      {/* outer shield */}
      <path
        d="M50 10l36 12v38c0 26-18 46-36 58-18-12-36-32-36-58V22z"
        fill="var(--artB)"
      />
      {/* inner shield */}
      <path
        d="M50 17l29 10v32c0 23-15 40-29 51-14-11-29-28-29-51V27z"
        fill="var(--artA)"
      />
      {/* racing stripes */}
      <path d="M35 17h11L20 100H9z" fill="#fff" opacity=".14" />
      <path d="M62 17h6L42 110h-6z" fill="#000" opacity=".16" />
      {/* star */}
      <path
        d="M50 42l3.65 10.99L65.2 53.06 55.9 59.92l3.5 11.02L50 64.2l-9.4 6.74 3.5-11.02-10.9-6.86L46.35 52.99z"
        fill="#fff"
        opacity=".9"
      />
    </g>
  );
}
