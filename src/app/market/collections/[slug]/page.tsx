import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketShell from "@/components/market/Shell";
import SeriesDetail from "./SeriesDetail";
import { SERIES_SLUGS } from "@/market/generated/ids";
import { readMock } from "@/lib/mockStatic";
import { pageMeta } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return SERIES_SLUGS.map((slug) => ({ slug }));
}

type SeriesRow = {
  slug: string;
  name: string;
  shortName: string;
  blurb?: string;
  itemCount: number;
  season?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = readMock<SeriesRow[]>("series.json") ?? [];
  const s = series.find((x) => x.slug === slug);
  if (!s) {
    return pageMeta({
      title: "系列",
      description: "系列不存在或未收录。",
      path: `/market/collections/${slug}/`,
      noindex: true,
    });
  }
  return pageMeta({
    title: `${s.shortName || s.name} · 系列`,
    description: `${s.name}：${s.itemCount} 件商品${s.season ? ` · ${s.season} 赛季` : ""}。${
      s.blurb ?? ""
    }`,
    path: `/market/collections/${slug}/`,
  });
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!SERIES_SLUGS.includes(slug)) notFound();

  return (
    <MarketShell title="系列详情" subtitle="该系列下的全部商品 · DEMO 行情">
      <SeriesDetail slug={slug} />
    </MarketShell>
  );
}
