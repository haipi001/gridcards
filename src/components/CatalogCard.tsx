import Link from "next/link";
import WatchButton from "@/components/WatchButton";
import PersonExpand from "@/components/PersonExpand";
import { catalogWatchEntry } from "@/lib/watchEntry";
import CardVisual from "@/components/CardVisual";
import type { LadderEntry } from "@/lib/ladderIndex";
import { slugify } from "@/lib/slug";
import { artKind, teamLogo, teamTheme } from "@/lib/teams";
import { demoMarket, money, shadeFor, type CatalogItem } from "@/lib/marketUi";

// One catalog record in the checklist grid. Person cards link to the Player
// page; collection objects (team / logo / car) link to Collections.
// Person cards also expand in place: the whole rarity ladder for that driver
// slides open under the card, so the checklist can be read without navigating.
export default function CatalogCard({
  card,
  ladder,
  records,
  expanded,
  onToggle,
}: {
  card: CatalogItem;
  ladder?: LadderEntry;
  records?: number;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const [c1, c2, glow] = shadeFor(card.sectionName);
  const m = demoMarket(card.cardNumber);
  const person = card.kind === "person";
  const href = person ? `/players/${slugify(card.name)}` : "/collections";
  const theme = teamTheme(card.team);
  const art = artKind(card.sectionSlug, card.kind);
  // Constructor cards get the real team mark over the generated art.
  const logo = !person ? teamLogo(card.team) : null;
  const scans = ladder?.oneOfOnes ?? [];
  const expandable =
    person && ((ladder?.rows.length ?? 0) > 0 || scans.length > 0);

  return (
    <article
      className={`marketCard ${card.sourceDuplicate ? "sourceDuplicate" : ""} ${
        expanded ? "isOpen" : ""
      }`}
      style={
        {
          "--c1": c1,
          "--c2": c2,
          "--glow": glow,
        } as React.CSSProperties
      }
    >
      <Link href={href} style={{ display: "block" }}>
        <div className="visual">
          <span className="badge">
            {card.sourceDuplicate
              ? `SOURCE DUPLICATE #${card.cardNumber}`
              : `#${card.cardNumber}`}
          </span>
          <WatchButton entry={catalogWatchEntry(card)} />
          <div className="cardObject">
            <span className="cardNo">#{card.cardNumber}</span>
            {card.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="cardArt cardArtPhoto"
                src={card.image}
                alt={card.name}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <CardVisual className="cardArt" art={art} a={theme.a} b={theme.b} />
            )}
            {logo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="cardTeamLogo"
                src={logo}
                alt={`${card.team} logo`}
                loading="lazy"
              />
            )}
            <span className="cardName">{card.name.toUpperCase()}</span>
          </div>
          <span className="sectionBadge">{card.sectionName}</span>
        </div>
        <div className="cardBody">
          <div className="cardTitle">
            #{card.cardNumber} · {card.name}
          </div>
          <div className="cardSub">{card.team || "—"}</div>
          <div className="cardStats">
            <div className="metric">
              <small>LOWEST ASK · DEMO</small>
              <b>{money(m.ask)}</b>
              <span className="mut" style={{ fontSize: 10 }}>
                {m.listings} listings
              </span>
            </div>
            <div className="metric right">
              <small>LAST SALE · DEMO</small>
              <b>{money(m.last)}</b>
            </div>
          </div>
          <div className="buyStrip">
            <span>{card.sectionName}</span>
            <b>{person ? "Player market" : "Collection market"} →</b>
          </div>
        </div>
      </Link>

      {expandable && (
        <>
          <button
            className="expandToggle"
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            {expanded
              ? "收起版本阶梯"
              : `展开 ${ladder!.rows.length} 个版本${
                  scans.length ? ` · ${ladder!.oneOfOneCount} 张 1/1` : ""
                }`}
            <i className={expanded ? "up" : ""}>⌄</i>
          </button>
          {expanded && (
            <PersonExpand
              name={card.name}
              team={card.team}
              rows={ladder!.rows}
              records={records ?? 1}
              href={href}
              oneOfOnes={scans}
              oneOfOneCount={ladder!.oneOfOneCount}
            />
          )}
        </>
      )}
    </article>
  );
}
