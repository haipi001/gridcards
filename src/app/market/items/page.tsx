"use client";

// Full product list. Query params seed the filters so links from the home page
// (e.g. /market/items/?rarity=ultimate) land on a pre-filtered grid.

import MarketShell from "@/components/market/Shell";
import MarketBrowse from "@/components/market/Browse";
import { useLocationSearch } from "@/lib/browserStore";
import { RARITY_ORDER } from "@/market/rarity";
import type { ItemSort, RarityTier } from "@/market/types";

const SORTS: ItemSort[] = [
  "floor_desc",
  "floor_asc",
  "volume_desc",
  "newest",
  "rarity",
];

export default function ItemsPage() {
  const search = useLocationSearch();
  const params = new URLSearchParams(search);

  const rarityParam = params.get("rarity");
  const rarities: RarityTier[] = rarityParam
    ? (rarityParam.split(",").filter((r) =>
        RARITY_ORDER.includes(r as RarityTier),
      ) as RarityTier[])
    : [];
  const sortParam = params.get("sort") as ItemSort | null;

  return (
    <MarketShell
      title="全部商品"
      subtitle="按系列、稀有度、卡号与价格区间筛选 · 支持排序与分页"
    >
      <MarketBrowse
        initial={{
          seriesId: params.get("series") ?? "",
          rarities,
          serial: params.get("serial") ?? "",
          min: params.get("min") ?? "",
          max: params.get("max") ?? "",
          sort: sortParam && SORTS.includes(sortParam) ? sortParam : "floor_desc",
        }}
      />
    </MarketShell>
  );
}
