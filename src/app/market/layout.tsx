import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

// Section-level metadata. The market pages are client components, so they
// cannot export `metadata` themselves — each route carries it in its layout.

export const metadata: Metadata = pageMeta({
  title: "F1 卡牌交易市场",
  description:
    "2020 Topps Chrome F1 官方 checklist 驱动的交易市场：合集 / 系列、商品筛选、挂单与成交历史。价格与成交为 DEMO 数据。",
  path: "/market/",
});

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
