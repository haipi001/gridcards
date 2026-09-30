// Pre-computed rarity-ladder index for every person in the checklist.
//
// The market grid expands a person card inline, and that expansion needs the
// same ladder the player page renders. Computing it on the server and shipping
// the compact result keeps the parallel logic (src/lib/parallels.ts) out of the
// client bundle while still letting the grid expand instantly.

import { getPlayerNames, getPlayerTiers, playerSlug } from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { archiveForDriver } from "@/lib/archiveData";

export type LadderRow = {
  tier: string;
  cls: string;
  label: string;
  variant: string;
  printRun: number | null;
  cardNo: string;
  askDemo: number;
  c1: string;
  c2: string;
  href: string;
};

/** A real 1/1 scan from the digital archive, shown as a thumbnail strip. */
export type LadderOneOfOne = {
  id: number;
  img: string;
  setName: string;
  year: string;
  label: string;
};

export type LadderEntry = {
  rows: LadderRow[];
  oneOfOnes: LadderOneOfOne[];
  /** Total 1/1 scans in the archive for this driver (may exceed the strip). */
  oneOfOneCount: number;
};

export type LadderIndex = Record<string, LadderEntry>;

// The thumbnail strip is capped: a handful of drivers have 30+ scans and the
// index ships with the page.
const ONE_OF_ONE_LIMIT = 10;

export function buildLadderIndex(): LadderIndex {
  const index: LadderIndex = {};
  for (const name of getPlayerNames()) {
    const rows: LadderRow[] = [];
    for (const tier of getPlayerTiers(name)) {
      for (const card of tier.cards) {
        rows.push({
          tier: tier.name,
          cls: tier.cls,
          label: card.label,
          variant: card.variant,
          printRun: card.printRun,
          cardNo: card.cardNo,
          askDemo: card.askDemo,
          c1: card.c1,
          c2: card.c2,
          href: `/players/${playerSlug(name)}/editions/${slugify(card.variant)}/`,
        });
      }
    }
    const scans = archiveForDriver(name);
    index[name] = {
      rows,
      oneOfOnes: scans.slice(0, ONE_OF_ONE_LIMIT).map((c) => ({
        id: c.id,
        img: c.img,
        setName: c.setName,
        year: c.year,
        label: c.cardName || c.setName,
      })),
      oneOfOneCount: scans.length,
    };
  }
  return index;
}
