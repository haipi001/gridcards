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
import type { EditionCardData } from "@/lib/parallels";
import { money } from "@/lib/marketUi";
import CardVisual from "@/components/CardVisual";
import { archiveForDriver, type ArchiveCard } from "@/lib/archiveData";
import { initials, teamLogo, teamTheme, variantArt } from "@/lib/teams";
import { archiveAspect } from "@/lib/archiveAspect";

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

function EditionCard({
  edition,
  player,
  theme,
}: {
  edition: EditionCardData;
  player: string;
  theme: { a: string; b: string };
}) {
  const run = edition.printRun;
  const href = `/players/${playerSlug(player)}/editions/${slugify(edition.variant)}`;
  return (
    <Link href={href} style={{ display: "block" }}>
      <article className="editionCard">
        <div
          className="editionVisual"
          style={{ "--glow": edition.c1 } as React.CSSProperties}
        >
          <div
            className="cardObject"
            style={
              {
                "--c1": edition.c1,
                "--c2": edition.c2,
              } as React.CSSProperties
            }
          >
            <span className="cardNo">#{edition.cardNo}</span>
            <CardVisual
              className="cardArt"
              art={variantArt(edition.variant)}
              a={theme.a}
              b={theme.b}
            />
            <span className="cardName">{player.toUpperCase()}</span>
          </div>
          {run ? (
            <span className="serialFlag">
              {run === 1 ? "1/1 · 1 COPY" : `/${run} · ${run} COPIES`}
            </span>
          ) : null}
        </div>
        <h4>{edition.label}</h4>
        <div className="editionMeta">
          <span>{edition.variant}</span>
          <span>{run ? `${run} serial${run === 1 ? "" : "s"}` : "Edition"}</span>
        </div>
        <div className="editionPrice">
          <div>
            <small>LOW ASK · DEMO</small>
            <b>{money(edition.askDemo)}</b>
          </div>
          <span className="link">
            {run ? "View all serials →" : "View edition →"}
          </span>
        </div>
      </article>
    </Link>
  );
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
  const digitals: ArchiveCard[] = archiveForDriver(name);

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

      <div className="playerNav">
        <button className="active">Card ladder</button>
        <button type="button">
          For sale<i className="soonTag">SOON</i>
        </button>
        <button type="button">
          Sales<i className="soonTag">SOON</i>
        </button>
        <button type="button">
          Collectors<i className="soonTag">SOON</i>
        </button>
      </div>

      <div className="rarityIntro">
        <div>
          <h2>Rarity ladder</h2>
          <p>按稀有度从稀有到常见纵向展开 {name} 的全部卡牌版本。</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="pill">2020</button>
          <button className="pill">
            All sets<i className="soonTag">SOON</i>
          </button>
        </div>
      </div>

      <div className="infoBox" style={{ margin: "0 0 16px" }}>
        <b>统一人物嵌套规则</b>
        <p className="mut" style={{ margin: "7px 0 0", lineHeight: 1.55 }}>
          所有人物共用 Player → Rarity Tier → Edition/Variant → Serial Copy →
          Transaction。只有官方标注 print run 的版本才进入 Serial
          层；数量严格等于 print run。
        </p>
      </div>

      {digitals.length > 0 && (
        <>
          <div className="sectionTitle" style={{ marginTop: 30 }}>
            <div>
              <div className="eyebrow">1/1 DISCOVERY NETWORK</div>
              <h2>Digital 1/1s — {name}</h2>
              <p>{digitals.length} 张 1/1 数字卡影像，全网仅此一份。</p>
            </div>
            <Link className="btn" href="/archive">
              Full archive →
            </Link>
          </div>
          <div className="archiveGrid">
            {digitals.map((card) => (
              <div className="archiveCard" key={card.id}>
                <div
                  className="archiveVisual"
                  style={
                    archiveAspect(card.w, card.h)
                      ? ({ aspectRatio: archiveAspect(card.w, card.h) } as React.CSSProperties)
                      : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.img}
                    alt={`${card.driver} 1/1 digital card`}
                    loading="lazy"
                    width={card.w || 360}
                    height={card.h || 500}
                  />
                  <span className="serialFlag">1/1</span>
                </div>
                <div className="archiveMeta">
                  <b>{card.driver}</b>
                  <span>
                    {card.setName} · {card.year} · {card.serial}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rarityLadder">
        {tiers.map((t) => (
          <section className={`tier ${t.cls}`} key={t.level + t.name}>
            <div className="tierLabel">
              <span className="level">{t.level}</span>
              <h3>{t.name}</h3>
              <span>{t.desc}</span>
            </div>
            <div className="tierCards">
              {t.cards.map((x) => (
                <EditionCard
                  key={x.label + x.variant}
                  edition={x}
                  player={name}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
