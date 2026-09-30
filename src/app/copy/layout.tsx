import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

// Copy detail is driven by device-local state (IndexedDB / localStorage), so
// there is nothing for a crawler to index.

export const metadata: Metadata = pageMeta({
  title: "卡牌副本",
  description: "本机建立的实体卡副本详情：编号、评级、挂单与交易状态。",
  path: "/copy/",
  noindex: true,
});

export default function CopyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
