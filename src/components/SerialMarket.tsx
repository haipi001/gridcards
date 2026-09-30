"use client";

// Copy-level market table for an edition: one row per serial, each row showing
// the real state machine — who holds the copy, whether it is listed, and which
// side of the order acts next.
//
// SANDBOX: the counterparty is a local simulated buyer. Nothing here is market
// data; it is the Listing → Order → Ownership path walked end to end.

import { useEffect, useState } from "react";
import {
  activeListing,
  advanceOrder,
  buyNow,
  cancelListing,
  createListing,
  money,
  orderForListing,
  ownerOf,
  readMarket,
  SELLER_ID,
  setRole,
  subscribeMarket,
  type MarketState,
  type Order,
  type Result,
} from "@/lib/marketEngine";
import { ownedSerials, subscribeClaims } from "@/lib/claims";

const NEXT_LABEL: Record<string, string> = {
  RESERVED: "买家付款 Pay",
  PAID: "卖家发货 Ship",
  SHIPPED: "买家确认收货 Complete",
};

const NEXT_ROLE: Record<string, "buyer" | "seller"> = {
  RESERVED: "buyer",
  PAID: "seller",
  SHIPPED: "buyer",
};

export default function SerialMarket({
  editionId,
  run,
}: {
  editionId: string;
  run: number;
}) {
  const [state, setState] = useState<MarketState | null>(null);
  const [price, setPrice] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Claims are their own store: the market snapshot does not change when a
  // serial is claimed, so this needs its own state (and its own subscription)
  // or the "is it mine?" flag would go stale.
  const [claimed, setClaimed] = useState<number[]>([]);

  useEffect(() => {
    const sync = () => setState(readMarket());
    const syncClaims = () => setClaimed(ownedSerials(editionId));
    sync();
    syncClaims();
    const a = subscribeMarket(sync);
    const b = subscribeClaims(syncClaims);
    return () => {
      a();
      b();
    };
  }, [editionId]);

  if (!state) {
    return (
      <div className="panel" style={{ marginTop: 14 }}>
        <h3>Loading copy market…</h3>
      </div>
    );
  }

  const act = (fn: () => Result) => {
    const res = fn();
    if (!res.ok) setError(res.error ?? "操作失败");
    else {
      setError(null);
      setState(res.state);
    }
  };

  const rows = Array.from({ length: run }, (_, i) => i + 1);

  return (
    <div className="copyMarket">
      <div className="copyMarketHead">
        <div>
          <div className="eyebrow">COPY MARKET · SANDBOX</div>
          <p>
            每个编号是一个独立的实体 Copy。挂单 → 预留 → 付款 → 发货 →
            完成，所有权只在 COMPLETED 时转移；同一张卡只能卖一次。
          </p>
        </div>
        <div className="roleSwitch" role="group" aria-label="切换本地身份">
          <button
            className={state.role === "seller" ? "active" : ""}
            type="button"
            onClick={() => {
              setRole("seller");
              setState(readMarket());
            }}
          >
            卖家（我）
          </button>
          <button
            className={state.role === "buyer" ? "active" : ""}
            type="button"
            onClick={() => {
              setRole("buyer");
              setState(readMarket());
            }}
          >
            买家（本地模拟）
          </button>
        </div>
      </div>

      {error && <div className="copyError">{error}</div>}

      <div className="serialRows">
        <div className="serialListHead">
          <span>SERIAL</span>
          <span>HOLDER</span>
          <span>STATUS</span>
          <span>PRICE</span>
          <span></span>
        </div>
        {rows.map((n) => {
          const holder = ownerOf(state, editionId, n);
          const listing = activeListing(state, editionId, n);
          const order: Order | undefined = listing
            ? orderForListing(state, listing.id)
            : state.orders.find((o) => o.editionId === editionId && o.serialIndex === n);
          const mine = holder === SELLER_ID && claimed.includes(n);

          let status: React.ReactNode = <span className="mut">无公开 copy</span>;
          if (order?.status === "COMPLETED")
            status = <span className="eventPill sold">SOLD</span>;
          else if (order)
            status = <span className="eventPill">{order.status}</span>;
          else if (listing?.status === "ACTIVE")
            status = <span className="eventPill listed">LISTED</span>;
          else if (holder) status = <span className="mut">持有中 held</span>;

          let action: React.ReactNode = null;
          if (order && order.status !== "COMPLETED") {
            const needs = NEXT_ROLE[order.status];
            const label = NEXT_LABEL[order.status];
            action =
              state.role === needs ? (
                <button
                  className="buySmall"
                  type="button"
                  onClick={() => act(() => advanceOrder(order.id))}
                >
                  {label}
                </button>
              ) : (
                <span className="mut" style={{ fontSize: 11 }}>
                  等待{needs === "buyer" ? "买家" : "卖家"}
                </span>
              );
          } else if (order?.status === "COMPLETED") {
            action = <span className="mut" style={{ fontSize: 11 }}>所有权已转移</span>;
          } else if (listing?.status === "ACTIVE") {
            action =
              state.role === "buyer" ? (
                <button
                  className="buySmall"
                  type="button"
                  onClick={() => act(() => buyNow(listing.id))}
                >
                  Buy now {money(listing.priceCents)}
                </button>
              ) : (
                <button
                  className="claimBtn"
                  type="button"
                  onClick={() => act(() => cancelListing(listing.id))}
                >
                  取消挂单
                </button>
              );
          } else if (mine && state.role === "seller") {
            action = (
              <div className="listRow">
                <input
                  value={price[n] ?? ""}
                  inputMode="numeric"
                  placeholder="价格 ¥"
                  onChange={(e) => setPrice({ ...price, [n]: e.target.value })}
                  aria-label={`挂单价格 ${n}`}
                />
                <button
                  className="buySmall"
                  type="button"
                  onClick={() =>
                    act(() =>
                      createListing(editionId, n, Math.round(Number(price[n]) * 100)),
                    )
                  }
                >
                  List
                </button>
              </div>
            );
          }

          return (
            <div className="serialRow" key={n}>
              <span className="serialNo">
                {String(n).padStart(String(run).length, "0")}/{run}
              </span>
              <span className="mut">
                {holder === SELLER_ID ? "我" : holder ? "本地买家" : "—"}
              </span>
              <span>{status}</span>
              <b className={order || listing ? "ask" : "ask mut"}>
                {order ? money(order.priceCents) : listing ? money(listing.priceCents) : "—"}
              </b>
              <span className="copyAction">{action}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
