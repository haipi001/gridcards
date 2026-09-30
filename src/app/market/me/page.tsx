"use client";

// My assets & listing management.

import MarketShell from "@/components/market/Shell";
import MyAssetsBoard from "@/components/market/MyAssets";
import { tradeEnabled } from "@/market/config";
import { useLocationSearch } from "@/lib/browserStore";

export default function MyMarketPage() {
  const search = useLocationSearch();

  return (
    <MarketShell
      title="我的资产与挂单"
      subtitle="持有卡牌 · 在售挂单 · 出价与收到的报价 · 余额与结算（DEMO）"
    >
      <MyAssetsBoard enabled={tradeEnabled(search)} />
    </MarketShell>
  );
}
