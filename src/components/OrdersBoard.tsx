"use client";

// /orders — the transaction console: my listings, the orders against them and
// the offers waiting on a copy. Mirrors DEV_AGENTS.md boundaries: a Listing is
// the sell state of exactly one UserCardCopy, an Order is the only source of
// truth for a completed purchase.

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  advanceOrder,
  cancelListing,
  declineOffer,
  makeOffer,
  money,
  readMarket,
  resetMarket,
  SELLER_ID,
  setRole,
  subscribeMarket,
  type MarketState,
  type Order,
  type Result,
} from "@/lib/marketEngine";

const STEPS: Order["status"][] = ["RESERVED", "PAID", "SHIPPED", "COMPLETED"];

export default function OrdersBoard() {
  const [state, setState] = useState<MarketState | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerEdition, setOfferEdition] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setState(readMarket());
    sync();
    return subscribeMarket(sync);
  }, []);

  if (!state) return <div className="panel">Loading orders…</div>;

  const act = (fn: () => Result) => {
    const res = fn();
    if (!res.ok) setError(res.error ?? "操作失败");
    else {
      setError(null);
      setState(res.state);
    }
  };

  const myListings = state.listings.filter((l) => l.sellerId === SELLER_ID);
  const openOffers = state.offers.filter((o) => o.status === "OPEN");
  const sold = state.orders.filter((o) => o.status === "COMPLETED");
  const volume = sold.reduce((s, o) => s + o.priceCents, 0);

  return (
    <div className="wrap">
      <div className="collectionsHero">
        <div>
          <div className="eyebrow">TRANSACTION CONSOLE · SANDBOX</div>
          <h1>Orders</h1>
          <p>
            挂单属于一个具体的实体 Copy；订单是成交的唯一事实来源，到 COMPLETED
            才转移所有权。这里的记录来自本机的 market_events，不是真实行情。
          </p>
        </div>
        <div className="indexStats" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
          <div className="statTile">
            <small>LISTINGS</small>
            <b>{myListings.filter((l) => l.status === "ACTIVE").length}</b>
            <span className="mut">active</span>
          </div>
          <div className="statTile">
            <small>ORDERS</small>
            <b>{state.orders.length}</b>
            <span className="mut">{sold.length} completed</span>
          </div>
          <div className="statTile">
            <small>VOLUME</small>
            <b>{volume ? money(volume) : "—"}</b>
            <span className="mut">completed only</span>
          </div>
          <div className="statTile">
            <small>OFFERS</small>
            <b>{openOffers.length}</b>
            <span className="mut">open</span>
          </div>
        </div>
      </div>

      <div className="dataToolbar">
        <div className="roleSwitch">
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
        <Link className="btn" href="/activity/">
          Activity tape →
        </Link>
        <button
          className="btn"
          type="button"
          onClick={() => {
            if (window.confirm("清空本机全部挂单、订单与事件？")) {
              resetMarket();
              setState(readMarket());
            }
          }}
        >
          Reset sandbox
        </button>
      </div>

      {error && <div className="copyError">{error}</div>}

      <div className="sectionTitle">
        <div>
          <div className="eyebrow">LISTINGS · ONE COPY EACH</div>
          <h2>我的挂单 {myListings.length}</h2>
        </div>
      </div>
      {myListings.length === 0 ? (
        <div className="panel">
          <p style={{ margin: 0 }}>
            还没有挂单。去任一版本页，在 Serial map 上认领编号，然后在 Copy
            market 表里挂单。
          </p>
        </div>
      ) : (
        <div className="orderGrid">
          {myListings.map((l) => (
            <article className="orderCard" key={l.id}>
              <div className="eyebrow">{l.status}</div>
              <b>{l.editionId.split(":").slice(1).join(" · ")}</b>
              <span className="mut">
                编号 {String(l.serialIndex).padStart(2, "0")} · {money(l.priceCents)}
              </span>
              <div className="watchFoot">
                <Link className="link" href="/activity/">
                  查看事件 →
                </Link>
                {l.status === "ACTIVE" && (
                  <button type="button" onClick={() => act(() => cancelListing(l.id))}>
                    Cancel
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="sectionTitle">
        <div>
          <div className="eyebrow">ORDERS · RESERVED → PAID → SHIPPED → COMPLETED</div>
          <h2>订单 {state.orders.length}</h2>
        </div>
      </div>
      {state.orders.length === 0 ? (
        <div className="panel">
          <p style={{ margin: 0 }}>
            还没有订单。买家在版本页对已挂单编号点 Buy now 即会原子预留该 Copy。
          </p>
        </div>
      ) : (
        <div className="orderList">
          {state.orders.map((o) => {
            const idx = STEPS.indexOf(o.status);
            return (
              <div className="orderRow" key={o.id}>
                <div>
                  <b>{o.editionId.split(":").slice(1).join(" · ")}</b>
                  <div className="mut" style={{ fontSize: 11 }}>
                    #{String(o.serialIndex).padStart(2, "0")} · {money(o.priceCents)} ·{" "}
                    {o.status}
                  </div>
                </div>
                <div className="orderSteps">
                  {STEPS.map((s, i) => (
                    <span key={s} className={i <= idx ? "done" : ""}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {o.status !== "COMPLETED" && (
                    <button
                      className="buySmall"
                      type="button"
                      onClick={() => act(() => advanceOrder(o.id))}
                    >
                      推进下一步
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="sectionTitle">
        <div>
          <div className="eyebrow">OFFERS · COPY-SPECIFIC OR EDITION-LEVEL</div>
          <h2>报价 {openOffers.length}</h2>
        </div>
      </div>
      <div className="panel">
        <p style={{ margin: "0 0 12px" }}>
          买家可以对某个具体编号报价（copy-specific），也可以对整个版本报价（edition-level）。
        </p>
        <div className="listRow" style={{ maxWidth: 520 }}>
          <input
            value={offerEdition}
            placeholder="版本 ID，如 edition:Lewis Hamilton:Red Refractor /5"
            onChange={(e) => setOfferEdition(e.target.value)}
          />
          <input
            value={offerAmount}
            inputMode="numeric"
            placeholder="¥ 金额"
            onChange={(e) => setOfferAmount(e.target.value)}
          />
          <button
            className="buySmall"
            type="button"
            onClick={() =>
              act(() =>
                makeOffer(
                  offerEdition || "edition:Demo:Base",
                  null,
                  Math.round(Number(offerAmount) * 100),
                ),
              )
            }
          >
            Make offer
          </button>
        </div>
      </div>
      {openOffers.length > 0 && (
        <div className="orderGrid">
          {openOffers.map((o) => (
            <article className="orderCard" key={o.id}>
              <div className="eyebrow">
                {o.serialIndex === null ? "EDITION LEVEL" : "COPY SPECIFIC"}
              </div>
              <b>{o.editionId.split(":").slice(1).join(" · ")}</b>
              <span className="mut">
                {o.serialIndex === null ? "整版报价" : `编号 ${o.serialIndex}`} ·{" "}
                {money(o.amountCents)}
              </span>
              <div className="watchFoot">
                <span className="mut" style={{ fontSize: 11 }}>
                  {new Date(o.createdAt).toLocaleString()}
                </span>
                <button type="button" onClick={() => act(() => declineOffer(o.id))}>
                  Decline
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
