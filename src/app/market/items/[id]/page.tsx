import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketShell from "@/components/market/Shell";
import ItemDetail from "./ItemDetail";
import { ITEM_IDS } from "@/market/generated/ids";
import { readMock } from "@/lib/mockStatic";
import { pageMeta } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return ITEM_IDS.map((id) => ({ id }));
}

type ItemRow = {
  id: string;
  title: string;
  parallel: string;
  cardNumber: string;
  seriesName: string;
  printRun: number | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const items = readMock<ItemRow[]>("items.json") ?? [];
  const item = items.find((x) => x.id === id);
  if (!item) {
    return pageMeta({
      title: "商品",
      description: "商品不存在或未收录。",
      path: `/market/items/${id}/`,
      noindex: true,
    });
  }
  const run = item.printRun ? ` · 官方印量 ${item.printRun}` : "";
  return pageMeta({
    title: `${item.title} · ${item.parallel}`,
    description: `${item.seriesName} · 卡号 ${item.cardNumber} · ${item.parallel}${run}。价格与成交为 DEMO 数据。`,
    path: `/market/items/${id}/`,
  });
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ITEM_IDS.includes(id)) notFound();

  const items = readMock<ItemRow[]>("items.json") ?? [];
  const item = items.find((x) => x.id === id);

  // Structured data: what the page is, not what it costs. DEMO prices are
  // deliberately kept out of the graph so nothing invented is published as a
  // real offer.
  const jsonLd = item
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${item.title} · ${item.parallel}`,
        description: `${item.seriesName} · 卡号 ${item.cardNumber}`,
        category: "Sports trading card",
        brand: { "@type": "Brand", name: "Topps Chrome" },
      }
    : null;

  return (
    <MarketShell title="商品详情" subtitle="大图展示 · 属性与稀有度 · 挂单 / 求购 / 成交历史">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <ItemDetail id={id} />
    </MarketShell>
  );
}
