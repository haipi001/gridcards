// Static catalog source of truth.
//
// The app was originally backed by Postgres (src/db). For static export the
// same 313 official checklist records are read straight from the JSON that
// was extracted from the source PDF. Every page keeps rendering real data —
// only the write paths (listings, offers, orders) are unavailable until a
// hosted database is attached.

import raw from "@/data/catalog.json";
import { buildPlayerTiers, type EditionTier } from "@/lib/parallels";
import { slugify } from "@/lib/slug";
import type { CatalogItem } from "@/lib/marketUi";

export { slugify };

type RawCard = {
  cardNumber: string;
  name: string;
  team: string | null;
  kind: string;
  sourceDuplicate?: boolean;
};

type RawSection = {
  slug: string;
  name: string;
  category: string;
  cards: RawCard[];
};

const source = raw as unknown as {
  slug: string;
  name: string;
  year: number;
  sections: RawSection[];
};

export const SET_SLUG = source.slug;
export const SET_NAME = source.name;
export const SET_YEAR = source.year;

export type SectionInfo = {
  slug: string;
  name: string;
  category: string;
};

// Sections in official PDF order.
export const SECTIONS: SectionInfo[] = source.sections.map((s) => ({
  slug: s.slug,
  name: s.name,
  category: s.category,
}));

// Flat checklist records, ordered exactly like the PDF.
export const ALL_ITEMS: CatalogItem[] = source.sections.flatMap((section) =>
  section.cards.map((card, idx) => ({
    id: `${section.slug}-${card.cardNumber}-${idx}`,
    cardNumber: card.cardNumber,
    name: card.name,
    team: card.team ?? null,
    kind: card.kind,
    sourceDuplicate: card.sourceDuplicate ?? false,
    sectionSlug: section.slug,
    sectionName: section.name,
    sectionCategory: section.category,
  })),
);

export function getCatalogSize(): number {
  return ALL_ITEMS.length;
}

export function getSections(): SectionInfo[] {
  return SECTIONS;
}

export function getSectionCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of ALL_ITEMS) {
    counts.set(item.sectionSlug, (counts.get(item.sectionSlug) ?? 0) + 1);
  }
  return counts;
}

// Person rows for the rarity ladder — same shape the DB query returned.
export function getPlayerRows(name: string): CatalogItem[] {
  return ALL_ITEMS.filter(
    (item) => item.name === name && item.kind === "person",
  );
}

export function getPlayerNames(): string[] {
  return [
    ...new Set(
      ALL_ITEMS.filter((i) => i.kind === "person").map((i) => i.name),
    ),
  ];
}

export function playerSlug(name: string): string {
  return slugify(name);
}

export function getPlayerBySlug(slug: string): string | undefined {
  return getPlayerNames().find((n) => playerSlug(n) === slug);
}

// Ladder input derived from a person's real PDF records.
export function playerLadderInput(rows: CatalogItem[], name: string) {
  const bySlug = (slug: string) => rows.find((r) => r.sectionSlug === slug);
  return {
    name,
    baseNo: bySlug("f1-racers")?.cardNumber ?? rows[0].cardNumber,
    autoNo: bySlug("chrome-autograph-variations")?.cardNumber ?? null,
    insertNo: bySlug("track-tags")?.cardNumber ?? null,
    worldNo: bySlug("world-on-wheels")?.cardNumber ?? null,
    pdfCards: rows.map((r) => ({
      sectionName: r.sectionName,
      cardNumber: r.cardNumber,
    })),
  };
}

export function getPlayerTiers(name: string): EditionTier[] {
  const rows = getPlayerRows(name);
  if (rows.length === 0) return [];
  return buildPlayerTiers(playerLadderInput(rows, name));
}

// Distinct edition variant slugs for a person (used to pre-render pages).
export function getPlayerVariants(name: string): string[] {
  return [
    ...new Set(
      getPlayerTiers(name).flatMap((t) => t.cards.map((c) => slugify(c.variant))),
    ),
  ];
}
