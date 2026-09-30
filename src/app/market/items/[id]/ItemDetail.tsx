"use client";

import { useState } from "react";
import Link from "next/link";
import ItemGallery from "@/components/market/ItemGallery";
import TradePanel from "@/components/market/TradePanel";
import {
  ActivityTable,
  AttributeGrid,
  ListingTable,
  OfferTable,
  PriceChart,
} from "@/components/market/Tables";
import { ErrorState, SkeletonRows } from "@/components/market/States";
import { failInjected, tradeEnabled } from "@/market/config";
import { money, pct } from "@/market/format";
import { rarityMeta } from "@/market/rarity";
import { getItemBundle } from "@/market/api";
import { useAsync } from "@/market/useAsync";
import { useLocationSearch } from "@/lib/browserStore";
import type { MarketItem } from "@/market/types";

type Tab = "listings" | "offers" | "history";

export default function ItemDetail({ id }: { id: string }) {
  const search = useLocationSearch();
  const fail = failInjected(search);
  const enabled = tradeEnabled(search);
  const [tab, setTab] = useState<Tab>("listings");
  const [nonce, setNonce] = useState(0);

  const state = useAsync(() => getItemBundle(id, { fail }), [id, fail, nonce]);

  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <SkeletonRows count={8} />;

  const { item, listings, offers, activity, series } = state.data;
  if (!item) {
    return (
      <div className="mError" role="alert">
        <div className="mErrorHead">
          <span className="mErrorDot" aria-hidden />
          商品不存在
        </div>
        <p>该商品可能已下架或链接有误。</p>
        <Link className="mBtn" href="/market/items/">
          返回商品列表
        </Link>
      </div>
    );
  }

  const meta = rarityMeta(item.rarity);
  const best = [...listings].sort((a, b) => a.priceCents - b.priceCents)[0] ?? null;
  const openOffers = offers.filter((o) => o.status === "OPEN");

  return (
    <div className="mDetail">
      <div className="mDetailTop">
        <div className="mDetailLeft">
          <ItemGallery item={item} />
          <AttributeGrid item={item} />
        </div>

        <div className="mDetailRight">
          {series ? (
            <Link href={`/market/collections/${series.slug}/`} className="mCrumb">
              {series.name}
            </Link>
          ) : null}
          <h2 className="mDetailTitle">{item.title}</h2>
          <p className="mDetailSub">
            {item.subtitle} · {item.parallel}
          </p>

          <div className="mDetailTags">
            <span
              className="mRarity"
              style={
                {
                  "--rarity": meta.color,
                  "--rarityGlow": meta.glow,
                } as React.CSSProperties
              }
            >
              <i aria-hidden />
              {meta.label}
            </span>
            <span className="mTag">卡号 #{item.cardNumber}</span>
            {item.printRun ? (
              <span className="mTag">限量 {item.printRun}</span>
            ) : (
              <span className="mTag">无编号</span>
            )}
            {item.team ? <span className="mTag">{item.team}</span> : null}
          </div>

          <StatRow item={item} />

          <TradePanel
            item={item}
            best={best}
            enabled={enabled}
            onTraded={() => setNonce((n) => n + 1)}
          />
        </div>
      </div>

      <div className="mTabs">
        <button
          type="button"
          className={`mTab${tab === "listings" ? " on" : ""}`}
          onClick={() => setTab("listings")}
        >
          当前挂单<em>{listings.length}</em>
        </button>
        <button
          type="button"
          className={`mTab${tab === "offers" ? " on" : ""}`}
          onClick={() => setTab("offers")}
        >
          求购报价<em>{openOffers.length}</em>
        </button>
        <button
          type="button"
          className={`mTab${tab === "history" ? " on" : ""}`}
          onClick={() => setTab("history")}
        >
          成交历史<em>{activity.length}</em>
        </button>
      </div>

      {tab === "listings" ? (
        <ListingTable
          listings={listings}
          item={item}
          enabled={enabled}
          onTraded={() => setNonce((n) => n + 1)}
        />
      ) : null}
      {tab === "offers" ? (
        <OfferTable
          offers={openOffers}
          enabled={enabled}
          onTraded={() => setNonce((n) => n + 1)}
        />
      ) : null}
      {tab === "history" ? (
        <div className="mHistory">
          <PriceChart events={activity} floorCents={item.floorCents} />
          <ActivityTable events={activity} />
        </div>
      ) : null}
    </div>
  );
}

function StatRow({ item }: { item: MarketItem }) {
  return (
    <div className="mDetailStats">
      <div>
        <span>地板价</span>
        <b>{money(item.floorCents)}</b>
      </div>
      <div>
        <span>最近成交</span>
        <b>{money(item.lastSaleCents)}</b>
      </div>
      <div>
        <span>在售 / 持有人</span>
        <b>
          {item.listedCount} / {item.ownerCount}
        </b>
      </div>
      <div>
        <span>24h 涨跌</span>
        <b className={item.change24h >= 0 ? "up" : "down"}>
          {pct(item.change24h)}
        </b>
      </div>
      <div>
        <span>关注人数</span>
        <b>{item.watchers}</b>
      </div>
    </div>
  );
}
