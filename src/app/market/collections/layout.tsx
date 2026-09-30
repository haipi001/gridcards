import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "合集与系列",
  description:
    "7 个 2020 Topps Chrome F1 官方系列：地板价、成交量、持有人数与在售商品数。行情为 DEMO 数据。",
  path: "/market/collections/",
});

export default function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
