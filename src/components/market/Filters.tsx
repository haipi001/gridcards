"use client";

import { RARITY_ORDER, rarityMeta } from "@/market/rarity";
import { SORT_OPTIONS, topFacets } from "@/market/query";
import { money } from "@/market/format";
import type { ItemSort, MarketSeries, RarityTier } from "@/market/types";

/** Facet buckets for the team / parallel pickers. */
export type Facets = {
  team: Map<string, number>;
  parallel: Map<string, number>;
  inStock: number;
};

export type FilterState = {
  seriesId: string;
  rarities: RarityTier[];
  serial: string;
  /** Constructor names, exact match. Empty = any. */
  team: string[];
  /** Parallel names, exact match. Empty = any. */
  parallel: string[];
  kind: "" | "person" | "collection";
  /** Keep only items with an active listing. */
  inStock: boolean;
  min: string;
  max: string;
  sort: ItemSort;
};

export const EMPTY_FILTERS: FilterState = {
  seriesId: "",
  rarities: [],
  serial: "",
  team: [],
  parallel: [],
  kind: "",
  inStock: false,
  min: "",
  max: "",
  sort: "floor_desc",
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function FilterBar({
  state,
  series,
  facets,
  onChange,
  resultCount,
}: {
  state: FilterState;
  series: MarketSeries[];
  facets?: Facets;
  onChange: (next: FilterState) => void;
  resultCount: number;
}) {
  const toggleRarity = (t: RarityTier) => {
    const has = state.rarities.includes(t);
    onChange({
      ...state,
      rarities: has
        ? state.rarities.filter((x) => x !== t)
        : [...state.rarities, t],
    });
  };

  const teams = facets ? topFacets(facets.team, 12) : [];
  const parallels = facets ? topFacets(facets.parallel, 10) : [];

  return (
    <aside className="mFilters">
      <div className="mFilterHead">
        <b>筛选</b>
        <button
          type="button"
          className="mLinkBtn"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          重置
        </button>
      </div>

      <div className="mFilterGroup">
        <span className="mFilterLabel">系列</span>
        <select
          className="mInput"
          value={state.seriesId}
          onChange={(e) => onChange({ ...state, seriesId: e.target.value })}
        >
          <option value="">全部系列</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mFilterGroup">
        <span className="mFilterLabel">稀有度</span>
        <div className="mChips">
          {RARITY_ORDER.map((t) => {
            const meta = rarityMeta(t);
            const on = state.rarities.includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`mChip${on ? " on" : ""}`}
                style={
                  { "--rarity": meta.color, "--rarityGlow": meta.glow } as React.CSSProperties
                }
                onClick={() => toggleRarity(t)}
                aria-pressed={on}
              >
                <i aria-hidden />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {teams.length > 0 && (
        <div className="mFilterGroup">
          <span className="mFilterLabel">车队</span>
          <div className="mChips">
            {teams.map((t) => {
              const on = state.team.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`mChip${on ? " on" : ""}`}
                  onClick={() => onChange({ ...state, team: toggle(state.team, t.value) })}
                  aria-pressed={on}
                  title={t.value}
                >
                  {t.value}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {parallels.length > 0 && (
        <div className="mFilterGroup">
          <span className="mFilterLabel">平行卡</span>
          <div className="mChips">
            {parallels.map((p) => {
              const on = state.parallel.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  className={`mChip${on ? " on" : ""}`}
                  onClick={() =>
                    onChange({ ...state, parallel: toggle(state.parallel, p.value) })
                  }
                  aria-pressed={on}
                  title={p.value}
                >
                  {p.value}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mFilterGroup">
        <span className="mFilterLabel">主体类型</span>
        <select
          className="mInput"
          value={state.kind}
          onChange={(e) =>
            onChange({ ...state, kind: e.target.value as FilterState["kind"] })
          }
        >
          <option value="">全部</option>
          <option value="person">车手</option>
          <option value="collection">车队 / 主题</option>
        </select>
      </div>

      <div className="mFilterGroup">
        <button
          type="button"
          className="mLive"
          aria-pressed={state.inStock}
          onClick={() => onChange({ ...state, inStock: !state.inStock })}
        >
          {state.inStock ? "✓ " : ""}仅看在售
          {facets ? `（${facets.inStock}）` : ""}
        </button>
      </div>

      <div className="mFilterGroup">
        <span className="mFilterLabel">卡号 / 编号</span>
        <input
          className="mInput"
          inputMode="numeric"
          placeholder="如 44、TT-1"
          value={state.serial}
          onChange={(e) => onChange({ ...state, serial: e.target.value })}
        />
      </div>

      <div className="mFilterGroup">
        <span className="mFilterLabel">价格区间（元）</span>
        <div className="mRangeRow">
          <input
            className="mInput"
            inputMode="numeric"
            placeholder="最低"
            value={state.min}
            onChange={(e) => onChange({ ...state, min: e.target.value })}
          />
          <em>—</em>
          <input
            className="mInput"
            inputMode="numeric"
            placeholder="最高"
            value={state.max}
            onChange={(e) => onChange({ ...state, max: e.target.value })}
          />
        </div>
      </div>

      <div className="mFilterNote">
        命中 <b>{resultCount}</b> 件 · 价格与成交量均为 DEMO 数据
      </div>
    </aside>
  );
}

export function SortBar({
  value,
  onChange,
  total,
}: {
  value: ItemSort;
  onChange: (v: ItemSort) => void;
  total: number;
}) {
  return (
    <div className="mSortBar">
      <span className="mSortCount">
        共 <b>{total}</b> 件商品
      </span>
      <label className="mSortPick">
        <span>排序</span>
        <select
          className="mInput"
          value={value}
          onChange={(e) => onChange(e.target.value as ItemSort)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function Pager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  const window_ = 2;
  const pages: number[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= window_)
      pages.push(p);
  }
  const out: Array<number | "…"> = [];
  let prev = 0;
  for (const p of pages) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return (
    <nav className="mPager" aria-label="分页">
      <button
        type="button"
        className="mPageBtn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        上一页
      </button>
      {out.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="mPageGap">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`mPageBtn${p === page ? " on" : ""}`}
            onClick={() => onPage(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="mPageBtn"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        下一页
      </button>
    </nav>
  );
}

export function priceHint(cents: number) {
  return money(cents);
}
