"use client";

import MarketBrowse from "@/components/market/Browse";
import { ErrorState, SkeletonRows } from "@/components/market/States";
import { failInjected } from "@/market/config";
import { money, pct } from "@/market/format";
import { getSeries } from "@/market/api";
import { useAsync } from "@/market/useAsync";
import { useLocationSearch } from "@/lib/browserStore";

export default function SeriesDetail({ slug }: { slug: string }) {
  const search = useLocationSearch();
  const fail = failInjected(search);
  const state = useAsync(() => getSeries(slug, { fail }), [slug, fail]);

  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <SkeletonRows count={4} />;

  const s = state.data;
  return (
    <>
      <div
        className="mSeriesHero"
        style={{ background: `linear-gradient(120deg, ${s.c1}, ${s.c2})` }}
      >
        <div>
          <h2>{s.name}</h2>
          <p>{s.blurb}</p>
          <div className="mSeriesTagsRow">
            {(s.tags ?? []).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <div className="mSeriesKpis">
          <div>
            <span>地板价</span>
            <b>{money(s.floorCents)}</b>
          </div>
          <div>
            <span>24h 成交额</span>
            <b>{money(s.volume24hCents)}</b>
          </div>
          <div>
            <span>累计成交额</span>
            <b>{money(s.volumeTotalCents)}</b>
          </div>
          <div>
            <span>持有人</span>
            <b>{s.ownerCount}</b>
          </div>
          <div>
            <span>24h 涨跌</span>
            <b className={s.change24h >= 0 ? "up" : "down"}>{pct(s.change24h)}</b>
          </div>
        </div>
      </div>

      <MarketBrowse initial={{ seriesId: s.id }} />
    </>
  );
}
