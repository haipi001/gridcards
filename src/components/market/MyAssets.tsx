"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CardFace } from "./CardArt";
import { EmptyState, ErrorState, SkeletonRows } from "./States";
import { useToast } from "./Toast";
import { acceptOffer, cancelListing, cancelOffer, createListing } from "@/market/actions";
import { money, moneyExact, serialLabel, timeAgo } from "@/market/format";
import { DEV_SWITCHES, TRADE_HINT } from "@/market/config";
import { ensureLedger, readLedger, subscribeLedger } from "@/market/ledger";
import { useAccount, useAsync } from "@/market/useAsync";
import { listItemsRaw } from "@/market/api";
import type { Ledger } from "@/market/ledger";
import type { MarketItem } from "@/market/types";

type Tab = "assets" | "listings" | "offers" | "received" | "watch";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "assets", label: "我的资产" },
  { id: "listings", label: "我的挂单" },
  { id: "offers", label: "我的出价" },
  { id: "received", label: "收到的报价" },
  { id: "watch", label: "关注" },
];

export default function MyAssetsBoard({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("assets");
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [listPrice, setListPrice] = useState<Record<string, string>>({});

  const account = useAccount();
  const items = useAsync(() => listItemsRaw(), []);

  // The ledger lives in localStorage; resubscribe so mutations made on a detail
  // page (or in another tab) show up here.
  useEffect(() => {
    let alive = true;
    void ensureLedger().then((l) => {
      if (alive) setLedger(l);
    });
    const off = subscribeLedger(() => {
      const next = readLedger();
      if (next) setLedger({ ...next });
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, MarketItem>();
    for (const it of items.data ?? []) m.set(it.id, it);
    return m;
  }, [items.data]);

  if (items.error) return <ErrorState error={items.error} onRetry={items.reload} />;
  if (!items.data || !ledger) return <SkeletonRows count={6} />;

  const run = async (
    key: string,
    fn: () => Promise<{ ok: boolean; message?: string; data?: { note: string } }>,
  ) => {
    setBusyKey(key);
    const id = toast.push("loading", "处理中…");
    const res = await fn();
    if (res.ok) toast.update(id, "success", res.data?.note ?? "操作成功");
    else toast.update(id, "error", res.message ?? "操作失败");
    setBusyKey(null);
  };

  const heldAssets = ledger.assets.filter((a) => a.status !== "LISTED");

  return (
    <div className="mMe">
      <div className="mMeHead">
        <div className="mMeBal">
          <div>
            <span>可用余额</span>
            <b>{account ? money(account.balanceCents) : "—"}</b>
          </div>
          <div>
            <span>保证金冻结</span>
            <b>{account ? money(account.lockedCents) : "—"}</b>
          </div>
          <div>
            <span>待结算</span>
            <b>{account ? money(account.pendingCents) : "—"}</b>
          </div>
        </div>
        <div className={`mMeFlag ${enabled ? "live" : "frozen"}`}>
          {enabled
            ? "交易演练已开启（?trade=1）"
            : DEV_SWITCHES
              ? "买入 / 出售已冻结（?trade=1 演练）"
              : "买入 / 出售尚未开放"}
        </div>
      </div>

      <div className="mTabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mTab${tab === t.id ? " on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <em>
              {t.id === "assets"
                ? heldAssets.length
                : t.id === "listings"
                  ? ledger.listings.length
                  : t.id === "offers"
                    ? ledger.offersMade.length
                    : t.id === "received"
                      ? ledger.offersReceived.length
                      : ledger.watchlist.length}
            </em>
          </button>
        ))}
      </div>

      {tab === "assets" ? (
        heldAssets.length === 0 ? (
          <EmptyState
            title="还没有持有的卡牌"
            hint="在商品详情页买入后，卡牌会出现在这里（DEMO 数据）"
            action={
              <Link className="mBtn" href="/market/items/">
                去逛市场
              </Link>
            }
          />
        ) : (
          <div className="mCopyGrid">
            {heldAssets.map((a) => {
              const it = byId.get(a.itemId);
              if (!it) return null;
              const price = listPrice[a.copyId] ?? "";
              const cents = Math.round(Number(price) * 100);
              return (
                <div key={a.copyId} className="mCopyCard">
                  <Link href={`/market/items/${it.id}/`} className="mCopyThumb">
                    <CardFace
                      art={it.art}
                      image={it.image}
                      rarity={it.rarity}
                      title={it.title}
                    />
                  </Link>
                  <div className="mCopyBody">
                    <b>{it.title}</b>
                    <span className="mut">{it.parallel}</span>
                    <span className="mut">
                      {serialLabel(a.serial, a.serialTotal)} · 成本{" "}
                      {money(a.acquiredCents)}
                    </span>
                    <div className="mCopyAct">
                      <input
                        className="mInput sm"
                        inputMode="decimal"
                        placeholder="挂单价（元）"
                        value={price}
                        onChange={(e) =>
                          setListPrice((p) => ({ ...p, [a.copyId]: e.target.value }))
                        }
                        disabled={!enabled}
                      />
                      <button
                        type="button"
                        className={`mBtn${enabled ? "" : " frozen"}`}
                        disabled={!enabled || !(cents > 0)}
                        onClick={() =>
                          void run(a.copyId, () =>
                            createListing({
                              enabled,
                              copyId: a.copyId,
                              itemId: it.id,
                              serial: a.serial,
                              serialTotal: a.serialTotal,
                              priceCents: cents,
                            }),
                          )
                        }
                        title={enabled ? "挂单出售" : `出售功能${TRADE_HINT}`}
                      >
                        挂单
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "listings" ? (
        ledger.listings.length === 0 ? (
          <EmptyState title="暂无在售挂单" hint="在「我的资产」里选择一张卡挂单" />
        ) : (
          <div className="mTable wide">
            <div className="mTableHead">
              <span>商品</span>
              <span>编号</span>
              <span>挂单价</span>
              <span>浏览 / 关注</span>
              <span>剩余时间</span>
              <span />
            </div>
            {ledger.listings.map((l) => {
              const it = byId.get(l.itemId);
              return (
                <div key={l.id} className="mTableRow">
                  <span className="mTableItem">{it?.title ?? l.itemId}</span>
                  <span className="mMono">{serialLabel(l.serial, l.serialTotal)}</span>
                  <span className="mTablePrice">{money(l.priceCents)}</span>
                  <span className="mTableMeta">
                    {l.views} / {l.watchers}
                  </span>
                  <span className="mTableMeta">{timeAgo(l.expiresAt)}</span>
                  <span className="mTableAct">
                    {busyKey === l.id ? (
                      <em>处理中…</em>
                    ) : (
                      <button
                        type="button"
                        className={`mBtn danger${enabled ? "" : " frozen"}`}
                        onClick={() =>
                          void run(l.id, () =>
                            cancelListing({ enabled, listingId: l.id }),
                          )
                        }
                        title={enabled ? "撤销挂单" : `撤单功能${TRADE_HINT}`}
                      >
                        撤单
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "offers" ? (
        ledger.offersMade.length === 0 ? (
          <EmptyState title="还没有出价" hint="在商品详情页可以对任意版本出价" />
        ) : (
          <div className="mTable wide">
            <div className="mTableHead">
              <span>商品</span>
              <span>出价</span>
              <span>状态</span>
              <span>提交时间</span>
              <span />
            </div>
            {ledger.offersMade.map((o) => {
              const it = byId.get(o.itemId);
              return (
                <div key={o.id} className="mTableRow">
                  <span className="mTableItem">{it?.title ?? o.itemId}</span>
                  <span className="mTablePrice">{moneyExact(o.priceCents)}</span>
                  <span className="mStatus" data-status={o.status}>
                    {o.status === "OPEN" ? "待回应" : "已接受"}
                  </span>
                  <span className="mTableMeta">{timeAgo(o.createdAt)}</span>
                  <span className="mTableAct">
                    {o.status === "OPEN" ? (
                      <button
                        type="button"
                        className={`mBtn${enabled ? "" : " frozen"}`}
                        onClick={() =>
                          void run(o.id, () =>
                            cancelOffer({
                              enabled,
                              offerId: o.id,
                              priceCents: o.priceCents,
                            }),
                          )
                        }
                        title={enabled ? "撤销出价" : `撤价功能${TRADE_HINT}`}
                      >
                        撤价
                      </button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "received" ? (
        ledger.offersReceived.length === 0 ? (
          <EmptyState title="暂未收到报价" />
        ) : (
          <div className="mTable wide">
            <div className="mTableHead">
              <span>商品</span>
              <span>买家</span>
              <span>报价</span>
              <span>有效期</span>
              <span />
            </div>
            {ledger.offersReceived.map((o) => {
              const it = byId.get(o.itemId);
              return (
                <div key={o.id} className="mTableRow">
                  <span className="mTableItem">{it?.title ?? o.itemId}</span>
                  <span className="mTableUser">{o.buyer?.handle ?? "—"}</span>
                  <span className="mTablePrice">{moneyExact(o.priceCents)}</span>
                  <span className="mTableMeta">{timeAgo(o.expiresAt)}</span>
                  <span className="mTableAct">
                    <button
                      type="button"
                      className={`mBtn primary${enabled ? "" : " frozen"}`}
                      onClick={() =>
                        void run(o.id, () =>
                          acceptOffer({
                            enabled,
                            offerId: o.id,
                            itemId: o.itemId,
                            priceCents: o.priceCents,
                          }),
                        )
                      }
                      title={enabled ? "接受报价" : `接受报价${TRADE_HINT}`}
                    >
                      接受
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "watch" ? (
        ledger.watchlist.length === 0 ? (
          <EmptyState title="关注列表为空" />
        ) : (
          <div className="mGrid">
            {ledger.watchlist.map((id) => {
              const it = byId.get(id);
              if (!it) return null;
              return (
                <Link key={id} href={`/market/items/${id}/`} className="mTile">
                  <div className="mTileArt">
                    <CardFace
                      art={it.art}
                      image={it.image}
                      rarity={it.rarity}
                      title={it.title}
                    />
                  </div>
                  <div className="mTileBody">
                    <div className="mTileTop">
                      <b>{it.title}</b>
                    </div>
                    <span className="mTileSub">{it.parallel}</span>
                    <div className="mTileFoot">
                      <span className="mTilePrice">
                        <em>地板价</em>
                        <b>{money(it.floorCents)}</b>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
