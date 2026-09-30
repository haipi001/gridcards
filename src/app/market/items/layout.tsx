import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "全部商品",
  description:
    "按系列、稀有度、编号与价格区间筛选 2020 Topps Chrome F1 商品，支持排序与分页。行情为 DEMO 数据。",
  path: "/market/items/",
});

export default function ItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
