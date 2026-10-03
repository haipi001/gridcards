"use client";

// The player rarity ladder, with a working filter rail.
//
// One ladder, one card component, one destination: every card — whether it has
// a real 1/1 scan or only generated livery art — is rendered by <LadderCard>,
// links to its edition page, and carries the same foil treatment. The page is
// server-prerendered in full so the first paint is never blank; the rail only
// narrows what is already there (the same contract as MarketBrowser).

import { useMemo, useState } from "react";
import Link from "next/link";
import CardVisual from "@/components/CardVisual";
import { money, scanLabel, type PhotoOrigin } from "@/lib/marketUi";
import type { ArtKind } from "@/lib/teams";

export type LadderCard = {
  key: string;
  label: string;
  variant: string;
  printRun: number | null;
  cardNo: string;
  askDemo: number;
  art: ArtKind;
  /** Parallel colours — they drive both the generated art and the tier glow. */
  c1: string;
  c2: string;
  /** Edition page — the canonical destination for every ladder card. */
  href: string;
  /** Market detail page, only when the market carries this exact edition. */
  marketHref: string | null;
  /** Real scan, or null when only generated art exists. */
  image: string | null;
  /** Which set/year that photograph really is — `exact` false is labelled. */
  photo: PhotoOrigin | null;
  effect: string | null;
  w: number;
  h: number;
};

export type LadderTier = {
  cls: "ultimate" | "legendary" | "rare" | "uncommon" | "base" | "archive";
  level: string;
  name: string;
  desc: string;
  cards: LadderCard[];
  /** Overflow link, e.g. "see all 62 archive scans" when the tier is capped. */
  more?: { href: string; label: string } | null;
};

type SortKey = "ladder" | "run" | "price";
type Numbering = "all" | "numbered" | "unnumbered";

const TIER_NAMES: Record<string, string> = {
  ultimate: "ULTIMATE",
  legendary: "LEGENDARY",
  rare: "RARE",
  uncommon: "UNCOMMON",
  base: "BASE",
  archive: "ARCHIVE",
};

// One frame, two fillings. A real 1/1 photograph and a generated livery card
// are both "a card inside the display case": .editionFace owns the size, the
// radius and the shadow, so the two never look like different products.
function Card({ card }: { card: LadderCard }) {
  const run = card.printRun;
  const effect = card.effect ?? "none";
  const cta = !run
    ? "查看版本 →"
    : run === 1
      ? "查看这张卡 →"
      : `查看全部 ${run} 个编号 →`;
  const copyLine = !run ? "unnumbered" : run === 1 ? "1 copy" : `${run} copies`;
  return (
    <Link href={card.href} className="editionCard" data-effect={effect}>
      <div
        className="editionVisual"
        style={{ "--glow": card.c1 } as React.CSSProperties}
      >
        <div className="editionFace">
          {card.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="editionScan"
                src={card.image}
                alt={`${card.label} · ${card.variant}`}
                loading="lazy"
              />
              <span
                className={card.photo?.exact ? "realScanTag" : "scanTagOther"}
                title={
                  card.photo?.exact
                    ? "2020 Topps Chrome 实物照"
                    : `实物照来自 ${card.photo?.year ?? "—"} ${card.photo?.setShort ?? ""}，非本张 2020 Chrome 卡`
                }
              >
                {scanLabel(card.photo)}
              </span>
            </>
          ) : (
            <div className="cardObject">
              <span className="cardNo">#{card.cardNo}</span>
              <CardVisual className="cardArt" art={card.art} a={card.c1} b={card.c2} />
            </div>
          )}
          <span className="editionSheen" aria-hidden />
        </div>
        {run ? (
          <span className="serialFlag">
            {run === 1 ? "1/1 · 1 COPY" : `/${run} · ${run} COPIES`}
          </span>
        ) : null}
      </div>
      <h4>{card.label}</h4>
      <div className="editionMeta">
        <span>{card.variant}</span>
        <span>{copyLine}</span>
      </div>
      <div className="editionPrice">
        <div>
          <small>LOW ASK · DEMO</small>
          <b>{card.askDemo ? money(card.askDemo) : "—"}</b>
        </div>
        <span className="link">{cta}</span>
      </div>
    </Link>
  );
}

export default function PlayerLadder({ tiers }: { tiers: LadderTier[] }) {
  const [query, setQuery] = useState("");
  const [levels, setLevels] = useState<string[]>([]);
  const [realOnly, setRealOnly] = useState(false);
  const [numbering, setNumbering] = useState<Numbering>("all");
  const [sort, setSort] = useState<SortKey>("ladder");

  const present = useMemo(
    () => tiers.map((t) => t.cls).filter((c, i, a) => a.indexOf(c) === i),
    [tiers],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: LadderTier[] = [];
    for (const t of tiers) {
      if (levels.length && !levels.includes(t.cls)) continue;
      const cards = t.cards.filter((c) => {
        if (realOnly && !c.image) return false;
        if (numbering === "numbered" && !c.printRun) return false;
        if (numbering === "unnumbered" && c.printRun) return false;
        if (!q) return true;
        return (
          c.variant.toLowerCase().includes(q) ||
          c.label.toLowerCase().includes(q) ||
          c.cardNo.toLowerCase().includes(q)
        );
      });
      if (cards.length) out.push({ ...t, cards });
    }
    if (sort !== "ladder") {
      for (const t of out) {
        t.cards = [...t.cards].sort((a, b) =>
          sort === "run"
            ? (a.printRun ?? Infinity) - (b.printRun ?? Infinity)
            : a.askDemo - b.askDemo,
        );
      }
    }
    return out;
  }, [tiers, query, levels, realOnly, numbering, sort]);

  const shown = visible.reduce((n, t) => n + t.cards.length, 0);
  const total = tiers.reduce((n, t) => n + t.cards.length, 0);
  const active = Boolean(query.trim() || levels.length || realOnly || numbering !== "all");

  const reset = () => {
    setQuery("");
    setLevels([]);
    setRealOnly(false);
    setNumbering("all");
  };

  const toggleLevel = (cls: string) =>
    setLevels((prev) => (prev.includes(cls) ? prev.filter((x) => x !== cls) : [...prev, cls]));

  return (
    <div className="mLadderShell">
      <aside className="mLadderRail">
        <div className="railHead">
          <h3>Filters</h3>
          <button
            className="railClear"
            type="button"
            onClick={reset}
            disabled={!active}
          >
            清除
          </button>
        </div>

        <input
          className="nameFilter"
          type="text"
          value={query}
          placeholder="版本名 / 卡号，如 Gold"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter editions"
        />

        <div className="railGroup">
          <small>RARITY TIER</small>
          <div className="mChips">
            {present.map((cls) => (
              <button
                key={cls}
                type="button"
                className={`mChip${levels.includes(cls) ? " on" : ""}`}
                onClick={() => toggleLevel(cls)}
              >
                {TIER_NAMES[cls] ?? cls.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="railGroup">
          <small>NUMBERING</small>
          <div className="mChips">
            {(["all", "numbered", "unnumbered"] as Numbering[]).map((n) => (
              <button
                key={n}
                type="button"
                className={`mChip${numbering === n ? " on" : ""}`}
                onClick={() => setNumbering(n)}
              >
                {n === "all" ? "全部" : n === "numbered" ? "有编号" : "未编号"}
              </button>
            ))}
          </div>
        </div>

        <div className="railGroup">
          <label className="check">
            <input
              type="checkbox"
              checked={realOnly}
              onChange={(e) => setRealOnly(e.currentTarget.checked)}
            />
            仅看有实物照
          </label>
          <span className="count">REAL SCAN</span>
        </div>

        <div className="railRoadmap">
          <small>ROADMAP</small>
          <p>
            价格区间、评级（PSA / BGS）与成交筛选，随真实挂牌与卖家上传管线开放后启用。
          </p>
        </div>
      </aside>

      <div>
        <div className="resultsTop">
          <strong>
            {shown} / {total} editions
          </strong>
          {active && (
            <button className="pill" type="button" onClick={reset}>
              清除筛选
            </button>
          )}
          <select
            className="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort editions"
          >
            <option value="ladder">稀有度 高 → 低</option>
            <option value="run">印量 少 → 多</option>
            <option value="price">要价 低 → 高</option>
          </select>
        </div>

        {shown === 0 ? (
          <div className="panel emptyWatch">
            <h3>没有匹配的版本</h3>
            <p style={{ lineHeight: 1.7 }}>换个关键词，或清除筛选看全部 {total} 个版本。</p>
            <button className="btn primary" type="button" onClick={reset}>
              重置筛选
            </button>
          </div>
        ) : (
          <div className="rarityLadder">
            {visible.map((t) => (
              <section className={`tier ${t.cls}`} key={t.level + t.name}>
                <div className="tierLabel">
                  <span className="level">{t.level}</span>
                  <h3>{t.name}</h3>
                  <span>{t.desc}</span>
                  {t.more && (
                    <Link className="tierMore" href={t.more.href}>
                      {t.more.label}
                    </Link>
                  )}
                </div>
                <div className="tierCards">
                  {t.cards.map((c) => (
                    <Card card={c} key={c.key} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
