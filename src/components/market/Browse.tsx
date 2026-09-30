"use client";

import { useState } from "react";
import CardTile from "./CardTile";
import { EMPTY_FILTERS, FilterBar, Pager, SortBar, type FilterState } from "./Filters";
import { EmptyState, ErrorState, SkeletonTiles } from "./States";
import { failInjected } from "@/market/config";
import { useLocationSearch } from "@/lib/browserStore";
import { listItems, listItemsRaw, listSeries } from "@/market/api";
import { facetCounts } from "@/market/query";
import { useAsync } from "@/market/useAsync";

// Product list: filters + sort + pagination over the mock dataset.
//
// A real backend would take the same ItemQuery as URL params; here query.ts
// applies it in the browser. Components never see the difference.

export default function MarketBrowse({
  initial,
}: {
  initial?: Partial<FilterState>;
}) {
  const search = useLocationSearch();
  const fail = failInjected(search);
  const [filters, setFilters] = useState<FilterState>({
    ...EMPTY_FILTERS,
    ...initial,
  });
  const [page, setPage] = useState(1);

  const key = JSON.stringify(filters);
  const seriesState = useAsync(() => listSeries({ fail }), [fail]);
  // Facet buckets for the team / parallel pickers. The dataset is already
  // fetched once by listItems, so this hits the same in-process cache.
  const facetsState = useAsync(
    () => listItemsRaw({ fail }).then((rows) => facetCounts(rows)),
    [fail],
  );
  const result = useAsync(
    () =>
      listItems(
        {
          ...filters,
          // FilterState names it `rarities` (multi-select UI); the query
          // contract calls it `rarity`.
          rarity: filters.rarities,
          // "" means "any" in the UI; the query contract uses undefined.
          kind: filters.kind || undefined,
          minCents: filters.min ? Math.round(Number(filters.min) * 100) : undefined,
          maxCents: filters.max ? Math.round(Number(filters.max) * 100) : undefined,
          page,
        },
        { fail },
      ),
    [key, page, fail],
  );

  const series = seriesState.data ?? [];
  const page_ = result.data;

  return (
    <div className="mBrowse">
      <FilterBar
        state={filters}
        series={series}
        facets={facetsState.data}
        resultCount={page_?.total ?? 0}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      <div className="mBrowseMain">
        <SortBar
          value={filters.sort}
          total={page_?.total ?? 0}
          onChange={(sort) => {
            setFilters((f) => ({ ...f, sort }));
            setPage(1);
          }}
        />

        {result.error ? (
          <ErrorState error={result.error} onRetry={result.reload} />
        ) : !page_ ? (
          <SkeletonTiles count={12} />
        ) : page_.rows.length === 0 ? (
          <EmptyState
            title="没有符合条件的商品"
            hint="试着放宽价格区间或清空稀有度筛选"
            action={
              <button
                type="button"
                className="mBtn"
                onClick={() => {
                  setFilters({ ...EMPTY_FILTERS, ...initial });
                  setPage(1);
                }}
              >
                清空筛选
              </button>
            }
          />
        ) : (
          <>
            <div className={`mGrid${result.refreshing ? " refreshing" : ""}`}>
              {page_.rows.map((it) => (
                <CardTile key={it.id} item={it} />
              ))}
            </div>
            <Pager
              page={page_.page}
              pageCount={page_.pageCount}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
