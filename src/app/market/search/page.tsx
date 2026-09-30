"use client";

// Search results. The form in MarketShell is a plain GET, so the query arrives
// as ?q= — read in the browser because the page is prerendered.

import Link from "next/link";
import CardTile from "@/components/market/CardTile";
import MarketShell from "@/components/market/Shell";
import { EmptyState, ErrorState, SkeletonTiles } from "@/components/market/States";
import { failInjected } from "@/market/config";
import { searchItems } from "@/market/api";
import { useAsync } from "@/market/useAsync";
import { useLocationSearch } from "@/lib/browserStore";

export default function SearchPage() {
  const search = useLocationSearch();
  const fail = failInjected(search);
  const q = new URLSearchParams(search).get("q") ?? "";

  const state = useAsync(() => searchItems(q, { fail }), [q, fail]);
  const rows = state.data ?? [];

  return (
    <MarketShell
      title={q ? `搜索「${q}」` : "搜索"}
      subtitle="匹配车手、车队、卡号与平行卡名称"
    >
      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : !state.data ? (
        <SkeletonTiles count={8} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={q ? `没有找到与「${q}」相关的商品` : "输入关键词开始搜索"}
          hint="试试车手姓名（Hamilton）、卡号（44）或平行卡（Refractor）"
          action={
            <Link className="mBtn" href="/market/items/">
              浏览全部商品
            </Link>
          }
        />
      ) : (
        <>
          <div className="mResultCount">
            命中 <b>{rows.length}</b> 件商品
          </div>
          <div className="mGrid">
            {rows.slice(0, 60).map((it) => (
              <CardTile key={it.id} item={it} />
            ))}
          </div>
          {rows.length > 60 ? (
            <div className="mResultMore">
              仅显示前 60 条，缩小关键词或使用{" "}
              <Link href="/market/items/">全部商品</Link> 的筛选器
            </div>
          ) : null}
        </>
      )}
    </MarketShell>
  );
}
