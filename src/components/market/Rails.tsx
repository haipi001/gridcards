"use client";

import Link from "next/link";
import { CardFace } from "./CardArt";
import { money, pct, timeAgo } from "@/market/format";
import type { ActivityEvent, MarketSeries, Spotlight } from "@/market/types";

/* -------------------------------------------------------------- home hero --- */

export function HeroRail({ spotlight }: { spotlight: Spotlight }) {
  return (
    <div className="mRail" role="list">
      {spotlight.hero.map((h) => (
        <Link
          key={h.itemId}
          href={`/market/items/${h.itemId}/`}
          className="mHeroCard"
          role="listitem"
        >
          <div className="mHeroArt">
            <CardFace
              art={h.art}
              image={h.image}
              rarity="ultimate"
              title={h.title}
            />
          </div>
          <div className="mHeroBody">
            <span className="mHeroTag">{h.tag}</span>
            <b>{h.title}</b>
            <em>{h.parallel}</em>
            <span className="mHeroPrice">{money(h.floorCents)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ collections --- */

export function SeriesGrid({ series }: { series: MarketSeries[] }) {
  return (
    <div className="mSeriesGrid">
      {series.map((s) => (
        <Link key={s.id} href={`/market/collections/${s.slug}/`} className="mSeriesCard">
          <div
            className="mSeriesBanner"
            style={{ background: `linear-gradient(120deg, ${s.c1}, ${s.c2})` }}
          >
            <span className="mSeriesSpark" aria-hidden>
              {s.sparkline.map((v, i) => (
                <i key={i} style={{ height: `${Math.max(8, v)}%` }} />
              ))}
            </span>
            <span className="mSeriesName">{s.name}</span>
          </div>
          <div className="mSeriesBody">
            <div className="mSeriesStats">
              <div>
                <span>地板价</span>
                <b>{money(s.floorCents)}</b>
              </div>
              <div>
                <span>24h 成交额</span>
                <b>{money(s.volume24hCents)}</b>
              </div>
              <div>
                <span>商品 / 持有人</span>
                <b>
                  {s.itemCount} / {s.ownerCount}
                </b>
              </div>
            </div>
            <div className="mSeriesFoot">
              <span className={s.change24h >= 0 ? "up" : "down"}>
                {pct(s.change24h)}
              </span>
              <span className="mSeriesTags">{s.tags.join(" · ")}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- rare sales --- */

export function RareSalesTape({ spotlight }: { spotlight: Spotlight }) {
  return (
    <div className="mTape">
      {spotlight.rareSales.map((s) => (
        <Link key={s.id} href={`/market/items/${s.itemId}/`} className="mTapeRow">
          <span className="mTapeWho">
            {s.buyer} <em>买入</em>
          </span>
          <span className="mTapeWhat">
            {s.title}
            <em>{s.parallel}</em>
          </span>
          <span className="mTapeSerial">#{s.serial}</span>
          <span className="mTapePrice">{money(s.priceCents)}</span>
          <span className="mTapeTime">{timeAgo(s.at)}</span>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- leaderboard --- */

export function Leaderboard({ spotlight }: { spotlight: Spotlight }) {
  return (
    <div className="mLeaders">
      {spotlight.leaderboard.map((l) => (
        <div key={l.handle} className="mLeaderRow">
          <span className="mLeaderRank">{l.rank}</span>
          <span className="mLeaderAvatar" style={{ background: l.avatar }} aria-hidden>
            {l.handle.slice(0, 2).toUpperCase()}
          </span>
          <span className="mLeaderName">{l.handle}</span>
          <span className="mLeaderTrades">{l.trades} 笔</span>
          <span className="mLeaderVol">{money(l.volumeCents)}</span>
          <span className={l.change >= 0 ? "up" : "down"}>{pct(l.change)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ movers --- */

export function MoversRow({
  movers,
}: {
  movers: Spotlight["movers"];
}) {
  return (
    <div className="mMovers">
      {movers.map((m) => (
        <Link key={m.itemId} href={`/market/items/${m.itemId}/`} className="mMover">
          <div className="mMoverArt">
            <CardFace
              art={m.art}
              image={null}
              rarity="rare"
              title={m.title}
            />
          </div>
          <b>{m.title}</b>
          <em>{m.parallel}</em>
          <span className={m.change24h >= 0 ? "up" : "down"}>{pct(m.change24h)}</span>
          <span className="mMoverPrice">{money(m.floorCents)}</span>
        </Link>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- activity --- */

export function ActivityTape({ events }: { events: ActivityEvent[] }) {
  const LABEL: Record<string, string> = {
    SALE: "成交",
    LISTING: "挂单",
    OFFER: "出价",
    ACCEPTED_OFFER: "接受报价",
    TRANSFER: "转移",
    DELIST: "撤单",
  };
  return (
    <div className="mTape">
      {events.slice(0, 14).map((e) => (
        <Link key={e.id} href={`/market/items/${e.itemId}/`} className="mTapeRow">
          <span className="mTapeType" data-type={e.type}>
            {LABEL[e.type] ?? e.type}
          </span>
          <span className="mTapeWhat">
            {e.itemTitle}
            <em>{e.parallel}</em>
          </span>
          <span className="mTapeSerial">#{e.serial}</span>
          <span className="mTapePrice">
            {e.priceCents == null ? "—" : money(e.priceCents)}
          </span>
          <span className="mTapeTime">{timeAgo(e.at)}</span>
        </Link>
      ))}
    </div>
  );
}
