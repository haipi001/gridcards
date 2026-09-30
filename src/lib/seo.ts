// One place to define how this site presents itself to crawlers and link
// previews. Every route calls `pageMeta()` so titles, canonical URLs and OG
// tags stay consistent; `SITE_URL` is the only value that must change when the
// site moves to its real domain.
//
// Set NEXT_PUBLIC_SITE_URL at build time — the static export bakes absolute
// URLs into sitemap.xml, canonical tags and OG images.

import type { Metadata } from "next";

export const SITE_NAME = "GRIDCARDS";
export const SITE_TAGLINE = "F1 Card Marketplace";
export const SITE_DESCRIPTION =
  "2020 Topps Chrome Formula 1 卡谱市场：车手 → 稀有度 → 版本 → 编号 → 交易。结构来自官方 checklist，行情数据为 DEMO。";

/** Absolute origin, no trailing slash. */
export const SITE_URL = stripSlash(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gridcards.example.com",
);

/** Same-origin absolute URL for a route path ("/market/" → "https://…/market/"). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMeta({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function stripSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
