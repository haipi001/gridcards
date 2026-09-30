"use client";

// Activity tape — now fed by the local market_events log instead of being
// permanently empty. Events are produced by the sandbox transaction flow
// (list → reserve → pay → ship → complete → ownership transfer → sale), and
// are labeled as such: they are a walkthrough, not real market activity.

import { useEffect, useState } from "react";
import {
  EVENT_LABEL,
  money,
  readMarket,
  subscribeMarket,
  type MarketEvent,
  type MarketState,
} from "@/lib/marketEngine";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sale", label: "Sales" },
  { key: "listing", label: "Listings" },
  { key: "offer", label: "Offers" },
  { key: "order", label: "Orders" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function bucket(type: MarketEvent["type"]): FilterKey {
  if (type === "SALE" || type === "ORDER_COMPLETED" || type === "OWNERSHIP_TRANSFERRED")
    return "sale";
  if (type === "LISTING_CREATED" || type === "LISTING_CANCELLED") return "listing";
  if (type.startsWith("OFFER")) return "offer";
  return "order";
}

export function ActivityStats() {
  const [state, setState] = useState<MarketState | null>(null);
  useEffect(() => {
    const sync = () => setState(readMarket());
    sync();
    return subscribeMarket(sync);
  }, []);

  const events = state?.events ?? [];
  const sales = events.filter((e) => bucket(e.type) === "sale" && e.type === "SALE");
  const volume = sales.reduce((s, e) => s + (e.priceCents ?? 0), 0);

  return (
    <div className="activityStats">
      <div className="statTile">
        <small>EVENTS · LOCAL</small>
        <b>{events.length}</b>
        <span className="mut">sandbox log</span>
      </div>
      <div className="statTile">
        <small>SALES</small>
        <b>{sales.length}</b>
        <span className="mut">completed orders</span>
      </div>
      <div className="statTile">
        <small>VOLUME</small>
        <b>{volume ? money(volume) : "—"}</b>
        <span className="mut">sandbox only</span>
      </div>
      <div className="statTile">
        <small>REAL MARKET</small>
        <b>—</b>
        <span className="mut">awaits listings</span>
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const [state, setState] = useState<MarketState | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const sync = () => setState(readMarket());
    sync();
    return subscribeMarket(sync);
  }, []);

  if (!state) return <div className="panel">Loading tape…</div>;

  const events = state.events.filter((e) => filter === "all" || bucket(e.type) === filter);

  return (
    <>
      <div className="marketTabs" style={{ marginTop: 6 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "active" : ""}`}
            type="button"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {state.events.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: 40 }}>
          <h3>市场磁带暂时为空</h3>
          <p style={{ maxWidth: 560, margin: "6px auto 0", lineHeight: 1.7 }}>
            真实交易引擎（Phase 7–9）上线后，这里会出现 Sale、Listing、Offer 与
            Ownership transfer 事件——不会用演示数据填充。现在可以先在版本页走一遍
            本地挂单 → 成交流程，事件会实时写进这条磁带。
          </p>
        </div>
      ) : (
        <>
          <div className="tape">
            <div className="tapeHead">
              <span>TIME</span>
              <span>EVENT</span>
              <span>CARD / EDITION</span>
              <span>SERIAL</span>
              <span>PRICE</span>
              <span>ACTOR</span>
            </div>
            {events.map((e) => (
              <div className="tapeRow" key={e.id}>
                <span className="mut">{new Date(e.at).toLocaleTimeString()}</span>
                <span>
                  <i className={`eventPill k-${bucket(e.type)}`}>{EVENT_LABEL[e.type]}</i>
                </span>
                <span className="tapeCard">
                  {e.editionId.split(":").slice(1).join(" · ")}
                  {e.note ? <em>{e.note}</em> : null}
                </span>
                <span>{e.serialIndex === null ? "—" : `#${e.serialIndex}`}</span>
                <b>{e.priceCents ? money(e.priceCents) : "—"}</b>
                <span className="mut">{e.actor === "you" ? "我" : "本地买家"}</span>
              </div>
            ))}
          </div>
          <p className="mut" style={{ fontSize: 11, marginTop: 14 }}>
            以上事件来自本机 market_events（SANDBOX 模拟流程），不是真实成交记录。
          </p>
        </>
      )}
    </>
  );
}
