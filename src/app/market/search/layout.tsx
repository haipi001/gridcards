import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

// Query-driven results page: infinite URL space, so it stays out of the index
// and out of sitemap.xml.

export const metadata: Metadata = pageMeta({
  title: "搜索结果",
  description: "按车手、卡号、平行卡或系列搜索商品。",
  path: "/market/search/",
  noindex: true,
});

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
