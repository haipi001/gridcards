// Shared market UI helpers ported from the V8 prototype.
// demoMarket values are UI placeholders ONLY — always rendered with a DEMO
// label. Real ask/last-sale values arrive with the Listing engine (Phase 7).

export function shadeFor(section: string): [string, string, string] {
  const map: Record<string, [string, string, string]> = {
    "F1 RACERS": ["#244c6f", "#243744", "#326d9a"],
    "F1 CARS": ["#315a70", "#1e313e", "#3d728b"],
    "F2 RACERS": ["#4b3f76", "#232a46", "#6d58a1"],
    "F2 CARS": ["#465e78", "#243445", "#527b9a"],
    "F1 CREW": ["#5b4a3a", "#272522", "#76614b"],
    "F2 CREW": ["#3f505d", "#252d32", "#566b78"],
    "TEAM LOGOS": ["#5a3540", "#292127", "#814d5a"],
    "GRAND PRIX WINNERS": ["#856228", "#2b3342", "#a47c35"],
    "GRAND PRIX DRIVER OF THE DAY": ["#7b3b3f", "#2c2527", "#9b4e53"],
    "F1 AWARD WINNERS": ["#685d31", "#2d2a20", "#8b7a3d"],
    "F1 FRESHEST": ["#286552", "#20302d", "#37826a"],
  };
  return map[section] ?? ["#30536b", "#242f38", "#44748d"];
}

export function demoMarket(cardNumber: string) {
  const n = parseInt(cardNumber, 10) || 50;
  return {
    ask: Math.max(32, Math.round(48 + (n % 37) * 7.4)),
    last: Math.max(29, Math.round(45 + (n % 31) * 6.8)),
    listings: 2 + (n % 18),
  };
}

export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export type CatalogItem = {
  id: string;
  cardNumber: string;
  name: string;
  team: string | null;
  kind: string;
  sourceDuplicate: boolean;
  sectionSlug: string;
  sectionName: string;
  sectionCategory: string;
  /** Real 1/1 scan when the archive has photographed this driver, else null. */
  image: string | null;
};

export type DatasetKey = "base" | "tt" | "54w" | "variations" | "autographs";

export const DATASETS: Array<{
  key: DatasetKey;
  label: string;
  sectionSlugs: string[] | null; // null = all base-category sections
}> = [
  { key: "base", label: "Base checklist · #1–200", sectionSlugs: null },
  { key: "tt", label: "Track Tags · TT", sectionSlugs: ["track-tags"] },
  {
    key: "54w",
    label: "World on Wheels · 54W",
    sectionSlugs: ["world-on-wheels"],
  },
  {
    key: "variations",
    label: "Image Variations",
    sectionSlugs: ["base-card-image-variations"],
  },
  {
    key: "autographs",
    label: "Autographs · F1A",
    sectionSlugs: ["chrome-autograph-variations"],
  },
];
