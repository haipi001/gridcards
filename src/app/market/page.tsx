"use client";

// Market home — NBA Top Shot style merchandising over the F1 checklist:
// a 1/1 hero rail, hot collections, a rare-sales tape, movers and a leaderboard.
// Everything is DEMO: prices, volumes and sales come from the mock dataset.

import Link from "next/link";
import MarketShell from "@/components/market/Shell";
import {
  ActivityTape,
  HeroRail,
  Leaderboard,
  MoversRow,
  RareSalesTape,
} from "@/components/market/Rails";
import { ErrorState, SkeletonRows, SkeletonTiles } from "@/components/market/States";
import { failInjected } from "@/market/config";
import { money, pct } from "@/market/format";
import { getSpotlight, listActivity } from "@/market/api";
import { useAsync } from "@/market/useAsync";
import { useLocationSearch } from "@/lib/browserStore";

export default function MarketHome() {
  const search = useLocationSearch();
  const fail = failInjected(search);

  const spot = useAsync(() => getSpotlight({ fail }), [fail]);
  const feed = useAsync(() => listActivity({ fail }), [fail]);
  const s = spot.data;

  return (
    <MarketShell
      title="F1 卡牌交易市场"
      subtitle="2020 Topps Chrome F1 官方 checklist 驱动 · 价格与成交均为 DEMO 数据"
    >
      {spot.error ? (
        <ErrorState error={spot.error} onRetry={spot.reload} />
      ) : !s ? (
        <SkeletonTiles count={6} />
      ) : (
        <>
          <section className="mSection">
            <div className="mSectionHead">
              <h2>1/1 孤品 · 本周焦点</h2>
              <Link href="/market/items/?rarity=ultimate">查看全部 ULTIMATE</Link>
            </div>
            <HeroRail spotlight={s} />
          </section>

          <section className="mSection">
            <div className="mSectionHead">
              <h2>热门系列</h2>
              <Link href="/market/collections/">全部合集</Link>
            </div>
            <div className="mHotSeries">
              {s.hotSeries.map((h) => (
                <Link
                  key={h.seriesId}
                  href={`/market/collections/${h.seriesId}/`}
                  className="mHotCard"
                  style={
                    {
                      background: `linear-gradient(140deg, ${h.c1}33, ${h.c2}cc)`,
                    } as React.CSSProperties
                  }
                >
                  <span className="mHotRank">#{h.rank}</span>
                  <b>{h.name}</b>
                  <div className="mHotStats">
                    <span>
                      地板价 <b>{money(h.floorCents)}</b>
                    </span>
                    <span>
                      24h <b>{money(h.volume24hCents)}</b>
                    </span>
                    <span className={h.change24h >= 0 ? "up" : "down"}>
                      {pct(h.change24h)}
                    </span>
                  </div>
                  <em>{h.itemCount} 件在售</em>
                </Link>
              ))}
            </div>
          </section>

          <div className="mTwoCol">
            <section className="mSection">
              <div className="mSectionHead">
                <h2>稀有成交</h2>
                <span className="mDemoTag">DEMO</span>
              </div>
              <RareSalesTape spotlight={s} />
            </section>

            <section className="mSection">
              <div className="mSectionHead">
                <h2>涨幅榜</h2>
                <span className="mDemoTag">DEMO</span>
              </div>
              <MoversRow movers={s.movers} />
            </section>
          </div>

          <div className="mTwoCol">
            <section className="mSection">
              <div className="mSectionHead">
                <h2>收藏家榜单</h2>
                <span className="mDemoTag">DEMO</span>
              </div>
              <Leaderboard spotlight={s} />
            </section>

            <section className="mSection">
              <div className="mSectionHead">
                <h2>最新市场动态</h2>
                <Link href="/activity/">全部动态</Link>
              </div>
              {feed.error ? (
                <ErrorState error={feed.error} onRetry={feed.reload} />
              ) : !feed.data ? (
                <SkeletonRows count={6} />
              ) : (
                <ActivityTape events={feed.data} />
              )}
            </section>
          </div>
        </>
      )}
    </MarketShell>
  );
}
