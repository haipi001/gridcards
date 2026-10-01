// Builders for watchlist entries. Plain data only — safe to call from server
// components and hand straight to the client <WatchButton />.

import type { CatalogItem } from "@/lib/marketUi";
import type { EditionCardData } from "@/lib/parallels";
import type { ArchiveCard } from "@/lib/archiveData";
import type { WatchEntry } from "@/lib/watchlist";
import { artKind, teamTheme, variantArt } from "@/lib/teams";
import { playerSlug, slugify } from "@/lib/catalog";

export function catalogWatchEntry(card: CatalogItem): WatchEntry {
  const theme = teamTheme(card.team);
  return {
    id: `card:${card.cardNumber}:${card.name}`,
    kind: "card",
    title: `#${card.cardNumber} · ${card.name}`,
    subtitle: card.team ?? "2020 Topps Chrome F1",
    meta: card.sectionName,
    href:
      card.kind === "person" ? `/players/${slugify(card.name)}/` : "/collections/",
    art: artKind(card.sectionSlug, card.kind),
    a: theme.a,
    b: theme.b,
    img: card.image ?? undefined,
  };
}

export function editionWatchEntry(
  player: string,
  edition: EditionCardData,
  team: string | null,
): WatchEntry {
  const theme = teamTheme(team);
  return {
    id: `edition:${player}:${edition.variant}`,
    kind: "edition",
    title: `${edition.label} · ${edition.variant}`,
    subtitle: player,
    meta: edition.printRun ? `${edition.printRun} serials · #${edition.cardNo}` : `#${edition.cardNo} · unnumbered`,
    href: `/players/${playerSlug(player)}/editions/${slugify(edition.variant)}/`,
    art: variantArt(edition.variant),
    a: theme.a,
    b: theme.b,
  };
}

export function playerWatchEntry(player: string, team: string | null): WatchEntry {
  const theme = teamTheme(team);
  return {
    id: `player:${player}`,
    kind: "player",
    title: player,
    subtitle: team ?? "2020 Topps Chrome F1",
    meta: "Player market",
    href: `/players/${playerSlug(player)}/`,
    art: "racer",
    a: theme.a,
    b: theme.b,
  };
}

export function archiveWatchEntry(card: ArchiveCard): WatchEntry {
  const theme = teamTheme(card.team);
  return {
    id: `archive:${card.id}`,
    kind: "archive",
    title: `${card.driver} · 1/1`,
    subtitle: `${card.setName} · ${card.year}`,
    meta: "Digital 1/1 archive",
    href: `/archive/`,
    art: "racer",
    a: theme.a,
    b: theme.b,
    img: card.img,
  };
}
