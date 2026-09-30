import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

// Per-visitor state lives in localStorage / IndexedDB — nothing here is
// shareable, so the route is noindex.

export const metadata: Metadata = pageMeta({
  title: "我的资产",
  description: "本机持有的卡牌、挂单与报价管理（数据仅保存在当前浏览器）。",
  path: "/market/me/",
  noindex: true,
});

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
