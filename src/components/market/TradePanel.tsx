"use client";

import { useState } from "react";
import { Spinner } from "./States";
import { useToast } from "./Toast";
import { buyNow, makeOffer } from "@/market/actions";
import { DEV_SWITCHES, TRADE_HINT } from "@/market/config";
import { money, moneyExact, serialLabel } from "@/market/format";
import { useAccount } from "@/market/useAsync";
import type { Listing, MarketItem } from "@/market/types";

// Buy / Sell surface.
//
// `enabled === false` (the default) renders the frozen state: every control is
// visibly disabled, carries a FROZEN badge and explains why. Nothing dispatches
// an action and no balance changes. With ?trade=1 the same controls run the
// full mock round trip — pending → success / failure — and the balance settles.

export default function TradePanel({
  item,
  best,
  enabled,
  onTraded,
}: {
  item: MarketItem;
  best: Listing | null;
  enabled: boolean;
  onTraded?: () => void;
}) {
  const toast = useToast();
  const account = useAccount();
  const [busy, setBusy] = useState<"buy" | "offer" | null>(null);
  const [offer, setOffer] = useState("");
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const offerCents = Math.round(Number(offer) * 100);
  const offerValid = Number.isFinite(offerCents) && offerCents > 0;
  const shortfall =
    best && account && account.balanceCents < best.priceCents
      ? best.priceCents - account.balanceCents
      : 0;

  const doBuy = async () => {
    if (!best) return;
    setBusy("buy");
    const id = toast.push(
      "loading",
      `正在买入 ${serialLabel(best.serial, best.serialTotal)}…`,
    );
    const res = await buyNow({
      enabled,
      listingId: best.id,
      itemId: item.id,
      serial: best.serial,
      priceCents: best.priceCents,
    });
    if (res.ok) {
      setLastReceipt(
        `成交 ${serialLabel(best.serial, best.serialTotal)} · ${moneyExact(
          Math.abs(res.data.deltaCents),
        )}`,
      );
      toast.update(
        id,
        "success",
        `买入成功 · ${moneyExact(Math.abs(res.data.deltaCents))} · 余额 ${money(res.data.balanceCents)}`,
      );
      onTraded?.();
    } else {
      toast.update(id, "error", res.message);
    }
    setBusy(null);
  };

  const doOffer = async () => {
    setBusy("offer");
    const id = toast.push("loading", "正在提交出价…");
    const res = await makeOffer({
      enabled,
      itemId: item.id,
      priceCents: offerCents,
    });
    if (res.ok) {
      setLastReceipt(`出价 ${moneyExact(offerCents)} 已提交`);
      toast.update(id, "success", `出价成功 · 保证金 ${money(offerCents)} 已冻结`);
      setOffer("");
      onTraded?.();
    } else {
      toast.update(id, "error", res.message);
    }
    setBusy(null);
  };

  return (
    <div className="mTrade">
      <div className="mTradePrice">
        <span className="mTradeLabel">
          {best ? "当前最低挂单" : "地板价"}
        </span>
        <b>{money(best ? best.priceCents : item.floorCents)}</b>
        <em>
          {best
            ? `${serialLabel(best.serial, best.serialTotal)} · ${best.seller.handle}`
            : `暂无在售 · 最近成交 ${money(item.lastSaleCents)}`}
        </em>
      </div>

      <div className="mBalance">
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

      {!enabled ? (
        <div className="mFrozen" role="note">
          <b>FROZEN</b>
          <span>
            买入 / 出售按钮{TRADE_HINT}：本页为演示环境，价格、成交与余额均为
            DEMO 数据，不会产生真实交易。
            {DEV_SWITCHES ? (
              <>
                {" "}
                开发演练请在地址后追加 <code>?trade=1</code>。
              </>
            ) : null}
          </span>
        </div>
      ) : (
        <div className="mLive" role="note">
          <b>LIVE DEMO</b>
          <span>交易演练已开启：点击按钮将模拟真实请求（含失败与余额校验）。</span>
        </div>
      )}

      {busy === "buy" ? (
        <div className="mBtn primary wide disabled">
          <Spinner label="正在结算…" />
        </div>
      ) : (
        <button
          type="button"
          className={`mBtn primary wide${enabled ? "" : " frozen"}`}
          onClick={() => void doBuy()}
          disabled={!best}
          title={enabled ? "一键买入" : `购买功能${TRADE_HINT}`}
        >
          {best ? `一键买入 ${money(best.priceCents)}` : "暂无可买挂单"}
        </button>
      )}

      <div className="mOfferRow">
        <input
          className="mInput"
          inputMode="decimal"
          placeholder="出价金额（元）"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          disabled={!enabled}
        />
        {busy === "offer" ? (
          <div className="mBtn disabled">
            <Spinner label="提交中" />
          </div>
        ) : (
          <button
            type="button"
            className={`mBtn${enabled ? "" : " frozen"}`}
            onClick={() => void doOffer()}
            disabled={!enabled || !offerValid}
            title={enabled ? "提交出价" : `出价功能${TRADE_HINT}`}
          >
            出价
          </button>
        )}
      </div>

      {enabled && shortfall > 0 ? (
        <div className="mWarn">
          余额不足：还差 {money(shortfall)}（买入将失败，可在 /market/me 查看资产）
        </div>
      ) : null}

      {lastReceipt ? <div className="mReceipt">{lastReceipt}</div> : null}

      <div className="mTradeNote">
        挂单、撤单与报价管理见 <a href="/market/me/">我的资产</a>
      </div>
    </div>
  );
}
