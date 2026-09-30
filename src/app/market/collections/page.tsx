"use client";

// Collection index — OpenSea-style grid of sets with floor / volume / supply.

import MarketShell from "@/components/market/Shell";
import { SeriesGrid } from "@/components/market/Rails";
import { ErrorState, SkeletonTiles } from "@/components/market/States";
import { failInjected } from "@/market/config";
import { listSeries } from "@/market/api";
import { useAsync } from "@/market/useAsync";
import { useLocationSearch } from "@/lib/browserStore";

export default function CollectionsPage() {
  const search = useLocationSearch();
  const fail = failInjected(search);
  const state = useAsync(() => listSeries({ fail }), [fail]);

  return (
    <MarketShell
      title="合集与系列"
      subtitle="7 个官方系列 · 商品结构参考 OpenSea 合集，行情数据均为 DEMO"
    >
      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : !state.data ? (
        <SkeletonTiles count={6} />
      ) : (
        <SeriesGrid series={state.data} />
      )}
    </MarketShell>
  );
}
