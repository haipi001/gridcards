// Player market page — rarity ladder per the universal nesting rule:
// Player → Rarity Tier → Edition/Variant → Serial Copy → Transaction.
// Real card numbers come from the checklist catalog; tier structure follows
// the 2020 Topps Chrome parallel system. Ask values are DEMO-labeled
// placeholders until the Listing engine (Phase 7) goes live.
//
// Statically exported: one page per person in the checklist.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import WatchButton from "@/components/WatchButton";
import { playerWatchEntry } from "@/lib/watchEntry";
import {
  getPlayerBySlug,
  getPlayerNames,
  getPlayerRows,
  getPlayerTiers,
  playerSlug,
  slugify,
} from "@/lib/catalog";
import PlayerLadder, { type LadderTier } from "@/components/PlayerLadder";
import { scanForEdition } from "@/lib/editionScans";
import { archiveForDriver } from "@/lib/archiveData";
import { initials, teamLogo, teamTheme, variantArt } from "@/lib/teams";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name: slug } = await params;
  const name = getPlayerBySlug(slug);
  if (!name) return { title: "Player — GRIDCARDS" };
  return {
    title: `${name} — 2020 Topps Chrome F1 | GRIDCARDS`,
    description: `${name} 的稀有度阶梯：全部版本、官方印量与编号槽位。`,
  };
}

// Static export: a name outside the checklist is a 404, never a generated page.
export const dynamicParams = false;

export function generateStaticParams() {
  return getPlayerNames().map((name) => ({ name: playerSlug(name) }));
}

// The ladder is assembled server-side so the whole thing is in the prerendered
// HTML; PlayerLadder only narrows it in the browser.
function buildLadder(name: string): LadderTier[] {
  const tiers = getPlayerTiers(name);
  const out: LadderTier[] = tiers.map((t) => ({
    cls: t.cls,
    level: t.level,
    name: t.name,
    desc: t.desc,
    cards: t.cards.map((edition) => {
      const scan = scanForEdition(name, edition.variant);
      return {
        key: `${t.level}-${edition.variant}`,
        label: edition.label,
        variant: edition.variant,
        printRun: edition.printRun,
        cardNo: edition.cardNo,
        askDemo: edition.askDemo,
        art: variantArt(edition.variant),
        c1: edition.c1,
        c2: edition.c2,
        href: `/players/${playerSlug(name)}/editions/${slugify(edition.variant)}/`,
        marketHref: scan ? `/market/items/${scan.itemId}/` : null,
        image: scan?.image ?? null,
        effect: scan?.effect ?? null,
        w: 0,
        h: 0,
      };
    }),
  }));

  // Real 1/1 photographs that belong to no checklist variant still deserve a
  // home: they land in a closing Archive tier, rendered by the very same card.
  const scans = archiveForDriver(name);
  const used = new Set(out.flatMap((t) => t.cards).map((c) => c.image).filter(Boolean));
  const spare = scans.filter((s) => !used.has(s.img));
  if (spare.length) {
    // A popular driver has 60+ scans; the ladder stays readable by showing a
    // slice and handing the rest to the archive, which is built for browsing.
    out.push({
      cls: "archive",
      level: "1/1",
      name: "Archive scans",
      desc: `该人物另有 ${spare.length} 张 1/1 实物照，未对应到具体编号版本`,
      more: { href: "/archive/", label: `查看全部 ${spare.length} 张 →` },
      cards: spare.slice(0, 8).map((s) => ({
        key: `archive-${s.id}`,
        label: s.cardName || s.setName,
        variant: `${s.setName} · ${s.year}`,
        printRun: 1,
        cardNo: String(s.id),
        askDemo: 0,
        art: "racer",
        c1: "#8d7a2a",
        c2: "#342642",
        href: "/archive/",
        marketHref: null,
        image: s.img,
        effect: "superfractor",
        w: s.w,
        h: s.h,
      })),
    });
  }
  return out;
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: slug } = await params;
  const name = getPlayerBySlug(slug);
  if (!name) notFound();

  const rows = getPlayerRows(name);
  if (rows.length === 0) notFound();

  const team = rows.find((r) => r.team)?.team ?? "Formula 1";
  const theme = teamTheme(team);
  const tiers = getPlayerTiers(name);

  const editions = tiers.flatMap((t) => t.cards);
  const numberedCount = editions.filter((x) => x.printRun).length;
  const ladder = buildLadder(name);
  const scanCount = archiveForDriver(name).length;

  return (
    <div className="wrap">
      <div className="breadcrumb">
        <Link href="/">Market</Link> / Players / {name}
      </div>
      <div className="playerHero" style={{ marginTop: 16 }}>
        <div className="playerIdentity">
          <div
            className="portrait"
            style={{ "--pA": theme.a, "--pB": theme.b } as React.CSSProperties}
          >
            <span className="portraitMark">{initials(name)}</span>
          </div>
          <div>
            <div className="eyebrow">PLAYER MARKET</div>
            <h1>{name}</h1>
            <p className="playerTeamLine">
              {teamLogo(team) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className="teamBadge"
                  src={teamLogo(team)!}
                  alt={`${team} logo`}
                />
              )}
              {team} · Formula 1
            </p>
            <div className="playerTags">
              <span className="pill">{editions.length} editions</span>
              <span className="pill">{numberedCount} numbered</span>
              {scanCount > 0 && <span className="pill">{scanCount} 张 1/1 实物照</span>}
              <span className="pill">{rows.length} PDF records</span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <WatchButton entry={playerWatchEntry(name, team)} variant="btn" />
              <Link className="btn" href="/watchlist/">
                My watchlist →
              </Link>
            </div>
          </div>
        </div>
        <div className="playerMetrics">
          <div className="statTile">
            <small>PLAYER FLOOR</small>
            <b>—</b>
            <span className="mut">awaits listings</span>
          </div>
          <div className="statTile">
            <small>24H VOLUME</small>
            <b>—</b>
            <span className="mut">awaits sales</span>
          </div>
          <div className="statTile">
            <small>TOP SALE</small>
            <b>—</b>
            <span className="mut">awaits sales</span>
          </div>
        </div>
      </div>

      <div className="rarityIntro">
        <div>
          <h2>Rarity ladder</h2>
          <p>
            按稀有度从稀有到常见纵向展开 {name} 的全部版本。有实物照的版本直接显示
            1/1 扫描图，没有的用涂装色生成卡面——同一套卡片、同一种展示方式。
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link className="btn" href="/archive">
            完整 1/1 图鉴 →
          </Link>
        </div>
      </div>

      <PlayerLadder tiers={ladder} />

      <div className="infoBox" style={{ margin: "22px 0 0" }}>
        <b>统一人物嵌套规则</b>
        <p className="mut" style={{ margin: "7px 0 0", lineHeight: 1.55 }}>
          所有人物共用 Player → Rarity Tier → Edition/Variant → Serial Copy →
          Transaction。只有官方标注 print run 的版本才进入 Serial
          层；数量严格等于 print run。
        </p>
      </div>
    </div>
  );
}
