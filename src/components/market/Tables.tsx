"use client";

import { useState } from "react";
import { RarityDot } from "./CardArt";
import { Spinner } from "./States";
import { useToast } from "./Toast";
import { buyNow, acceptOffer } from "@/market/actions";
import { TRADE_HINT } from "@/market/config";
import { countdown, money, moneyExact, serialLabel, timeAgo } from "@/market/format";
import { rarityMeta } from "@/market/rarity";
import type {
  ActivityEvent,
  ActivityType,
  Listing,
  MarketItem,
  Offer,
} from "@/market/types";

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  SALE: "成交",
  LISTING: "挂单",
  OFFER: "出价",
  ACCEPTED_OFFER: "接受报价",
  TRANSFER: "转移",
  DELIST: "撤单",
};

/* --------------------------------------------------------------- listings --- */

export function ListingTable({
  listings,
  item,
  enabled,
  onTraded,
}: {
  listings: Listing[];
  item: MarketItem;
  enabled: boolean;
  onTraded?: () => void;
}) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = [...listings].sort((a, b) => a.priceCents - b.priceCents);
  if (rows.length === 0)
    return <div className="mTableEmpty">该版本暂无在售挂单</div>;

  const buy = async (l: Listing) => {
    setBusyId(l.id);
    const id = toast.push("loading", `正在买入 ${serialLabel(l.serial, l.serialTotal)}…`);
    const res = await buyNow({
      enabled,
      listingId: l.id,
      itemId: item.id,
      serial: l.serial,
      priceCents: l.priceCents,
    });
    if (res.ok) {
      toast.update(
        id,
        "success",
        `买入成功 · -${moneyExact(Math.abs(res.data.deltaCents))} · 余额 ${money(res.data.balanceCents)}`,
      );
      onTraded?.();
    } else {
      toast.update(id, "error", res.message);
    }
    setBusyId(null);
  };

  return (
    <div className="mTable">
      <div className="mTableHead">
        <span>编号</span>
        <span>价格</span>
        <span>卖家</span>
        <span>状态</span>
        <span />
      </div>
      {rows.map((l) => (
        <div key={l.id} className="mTableRow">
          <span className="mMono">{serialLabel(l.serial, l.serialTotal)}</span>
          <span className="mTablePrice">{money(l.priceCents)}</span>
          <span className="mTableUser">
            {l.seller.handle}
            <em>{l.seller.rating.toFixed(1)}★</em>
          </span>
          <span className="mTableMeta">
            {l.kind === "auction" ? "拍卖" : "一口价"} ·{" "}
            {countdown(l.expiresAt)}
          </span>
          <span className="mTableAct">
            {busyId === l.id ? (
              <Spinner label="处理中" />
            ) : (
              <button
                type="button"
                className={`mBtn primary${enabled ? "" : " frozen"}`}
                onClick={() => void buy(l)}
                title={enabled ? "立即买入" : `购买功能${TRADE_HINT}`}
              >
                买入
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- offers --- */

export function OfferTable({
  offers,
  enabled,
  mine = false,
  onTraded,
}: {
  offers: Offer[];
  enabled: boolean;
  mine?: boolean;
  onTraded?: () => void;
}) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const rows = [...offers].sort((a, b) => b.priceCents - a.priceCents);
  if (rows.length === 0)
    return <div className="mTableEmpty">{mine ? "你还没有出价" : "暂无求购报价"}</div>;

  const accept = async (o: Offer) => {
    setBusyId(o.id);
    const id = toast.push("loading", "正在接受报价…");
    const res = await acceptOffer({
      enabled,
      offerId: o.id,
      itemId: o.itemId,
      priceCents: o.priceCents,
    });
    if (res.ok) {
      toast.update(id, "success", `已接受 · +${moneyExact(res.data.deltaCents)}`);
      onTraded?.();
    } else toast.update(id, "error", res.message);
    setBusyId(null);
  };

  return (
    <div className="mTable">
      <div className="mTableHead">
        <span>{mine ? "商品" : "出价"}</span>
        <span>金额</span>
        <span>{mine ? "" : "买家"}</span>
        <span>有效期</span>
        <span />
      </div>
      {rows.map((o) => (
        <div key={o.id} className="mTableRow">
          <span className={mine ? "mTableItem" : "mMono"}>
            {mine ? o.itemId.replace(/-/g, " ") : money(o.priceCents)}
          </span>
          <span className="mTablePrice">{money(o.priceCents)}</span>
          <span className="mTableUser">{mine ? "你" : o.buyer.handle}</span>
          <span className="mTableMeta">{countdown(o.expiresAt)}</span>
          <span className="mTableAct">
            {mine ? null : busyId === o.id ? (
              <Spinner label="处理中" />
            ) : (
              <button
                type="button"
                className={`mBtn${enabled ? "" : " frozen"}`}
                onClick={() => void accept(o)}
                title={enabled ? "接受该报价" : `交易功能${TRADE_HINT}`}
              >
                接受
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- activity --- */

export function ActivityTable({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0)
    return <div className="mTableEmpty">暂无成交记录（DEMO 数据）</div>;
  return (
    <div className="mTable">
      <div className="mTableHead">
        <span>事件</span>
        <span>编号</span>
        <span>金额</span>
        <span>买家 / 卖家</span>
        <span>时间</span>
      </div>
      {events.map((e) => (
        <div key={e.id} className="mTableRow">
          <span className="mTableType" data-type={e.type}>
            {ACTIVITY_LABEL[e.type]}
          </span>
          <span className="mMono">{e.serial}</span>
          <span className="mTablePrice">
            {e.priceCents == null ? "—" : money(e.priceCents)}
          </span>
          <span className="mTableUser">
            {e.actor.handle}
            <em>→</em>
            {e.counterparty.handle}
          </span>
          <span className="mTableMeta">{timeAgo(e.at)}</span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- price history --- */

export function PriceChart({
  events,
  floorCents,
}: {
  events: ActivityEvent[];
  floorCents: number;
}) {
  const sales = events
    .filter((e) => e.priceCents != null)
    .slice()
    .sort((a, b) => a.at - b.at)
    .slice(-16);

  if (sales.length < 2) {
    return (
      <div className="mChartEmpty">
        成交样本不足（DEMO 数据），当前地板价 {money(floorCents)}
      </div>
    );
  }

  const prices = sales.map((s) => s.priceCents as number);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const w = 320;
  const h = 92;
  const step = w / (sales.length - 1);
  const y = (p: number) => h - 8 - ((p - min) / span) * (h - 16);
  const points = prices.map((p, i) => `${(i * step).toFixed(1)},${y(p).toFixed(1)}`);
  const area = `0,${h} ${points.join(" ")} ${w},${h}`;

  return (
    <div className="mChart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="mChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#55dbff" stopOpacity=".35" />
            <stop offset="100%" stopColor="#55dbff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#mChartFill)" />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#55dbff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mChartScale">
        <span>{money(max)}</span>
        <span>{money(min)}</span>
      </div>
      <div className="mChartNote">
        近 {sales.length} 笔成交 · DEMO 数据，不构成行情参考
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- attributes --- */

export function AttributeGrid({ item }: { item: MarketItem }) {
  return (
    <div className="mAttrs">
      {item.attributes.map((a) => (
        <div key={a.trait} className="mAttr">
          <RarityDot tier={item.rarity} />
          <span className="mAttrTrait">{a.trait}</span>
          <b>{a.value}</b>
          {a.pct != null ? <em>{a.pct}% 持有</em> : null}
        </div>
      ))}
      <div className="mAttr">
        <span
          className="mAttrTrait"
          style={{ color: rarityMeta(item.rarity).color }}
        >
          稀有度
        </span>
        <b>{rarityMeta(item.rarity).label}</b>
        <em>{rarityMeta(item.rarity).cn}</em>
      </div>
    </div>
  );
}
