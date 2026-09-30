// Player rarity ladder — shared structure for every person (V5 rule:
// Player → Rarity Tier → Edition/Variant → Serial Copy → Transaction).
//
// Tier membership uses the 2020 Topps Chrome parallel structure and the
// person's real card numbers from the catalog database (base / autograph /
// Track Tags / World on Wheels). Numbered editions derive their serial
// count exclusively from printRun.
//
// askDemo is a UI placeholder — always rendered with a DEMO label until the
// Listing engine (Phase 7) provides real asks.

export type EditionCardData = {
  label: string;
  variant: string;
  printRun: number | null;
  askDemo: number;
  c1: string;
  c2: string;
  cardNo: string;
};

export type EditionTier = {
  cls: "ultimate" | "legendary" | "rare" | "uncommon" | "base";
  level: string;
  name: string;
  desc: string;
  cards: EditionCardData[];
};

export type PlayerLadderInput = {
  name: string;
  baseNo: string; // F1 RACERS card number, e.g. "1"
  autoNo: string | null; // CHROME AUTOGRAPH VARIATIONS, e.g. "F1A-LH"
  insertNo: string | null; // TRACK TAGS, e.g. "TT-1"
  worldNo: string | null; // 1954 WORLD ON WHEELS, e.g. "54W-2"
  // All PDF source records for this person (for the checklist tier).
  pdfCards: Array<{ sectionName: string; cardNumber: string }>;
};

// Deterministic demo base price per player (labeled DEMO in UI).
function demoBase(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 110 + (h % 140);
}

export function buildPlayerTiers(input: PlayerLadderInput): EditionTier[] {
  const n = input.baseNo;
  const base = demoBase(input.name);
  const mk = (
    label: string,
    variant: string,
    run: number | null,
    mult: number,
    c1: string,
    c2: string,
    cardNo: string = n,
  ): EditionCardData => ({
    label,
    variant,
    printRun: run,
    askDemo: Math.round(base * mult),
    c1,
    c2,
    cardNo,
  });

  return [
    {
      cls: "ultimate",
      level: "TIER 01",
      name: "Ultimate",
      desc: "1/1",
      cards: [
        mk(`2020 Chrome #${n}`, "SuperFractor 1/1", 1, 48, "#8d7a2a", "#342642"),
        ...(input.autoNo
          ? [
              mk(
                `2020 Auto ${input.autoNo}`,
                "SuperFractor Auto 1/1",
                1,
                72,
                "#6f5e26",
                "#3d2d43",
                input.autoNo,
              ),
            ]
          : []),
      ],
    },
    {
      cls: "legendary",
      level: "TIER 02",
      name: "Legendary",
      desc: "/5",
      cards: [
        mk(`2020 Chrome #${n}`, "Red Refractor /5", 5, 31, "#7c2630", "#272f46"),
        ...(input.autoNo
          ? [
              mk(
                `2020 Auto ${input.autoNo}`,
                "Red Auto /5",
                5,
                45,
                "#7c2630",
                "#4c3922",
                input.autoNo,
              ),
            ]
          : []),
      ],
    },
    {
      cls: "rare",
      level: "TIER 03",
      name: "Rare",
      desc: "/25 · /50 · /99",
      cards: [
        mk(`2020 Chrome #${n}`, "Orange Refractor /25", 25, 21, "#b36a25", "#263e58"),
        mk(`2020 Chrome #${n}`, "Gold Refractor /50", 50, 15, "#9b7429", "#263e58"),
        mk(`2020 Chrome #${n}`, "Purple Refractor /99", 99, 7, "#5f3f7c", "#273e55"),
        ...(input.autoNo
          ? [
              mk(
                `2020 Auto ${input.autoNo}`,
                "Gold Auto /50",
                50,
                22,
                "#8f6a29",
                "#3c3144",
                input.autoNo,
              ),
            ]
          : []),
      ],
    },
    {
      cls: "uncommon",
      level: "TIER 04",
      name: "Uncommon",
      desc: "Numbered parallels · inserts",
      cards: [
        mk(`2020 Chrome #${n}`, "Blue Refractor /399", 399, 3.2, "#2e557f", "#22364f"),
        ...(input.insertNo
          ? [
              mk(
                input.insertNo,
                "Track Tags",
                null,
                1.8,
                "#375f76",
                "#2e3440",
                input.insertNo,
              ),
            ]
          : []),
        ...(input.worldNo
          ? [
              mk(
                input.worldNo,
                "World on Wheels",
                null,
                1.2,
                "#315d78",
                "#8d5228",
                input.worldNo,
              ),
            ]
          : []),
      ],
    },
    {
      cls: "base",
      level: "TIER 05",
      name: "Base",
      desc: "Unnumbered / standard issue",
      cards: [
        mk(`2020 Chrome #${n}`, "Refractor", null, 1.7, "#2f607b", "#273647"),
        mk(`2020 Chrome #${n}`, "Base", null, 1, "#244c6f", "#243744"),
      ],
    },
    {
      cls: "base",
      level: "PDF",
      name: "Official Checklist",
      desc: "All source-derived cards for this person",
      cards: input.pdfCards.map((x, i) =>
        mk(
          `${x.sectionName} · ${x.cardNumber}`,
          x.sectionName,
          null,
          1 + (i % 7) * 0.06,
          "#334d60",
          "#242f39",
          x.cardNumber,
        ),
      ),
    },
  ];
}
