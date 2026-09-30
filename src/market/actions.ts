// Trade actions.
//
// FROZEN BY DEFAULT. While Buy / Sell are frozen every action short-circuits
// with code "FROZEN" and the button that called it renders a disabled state.
// Append ?trade=1 to any market URL to run the real (mock) flow: latency,
// balance checks, and a 1-in-8 simulated network failure — i.e. the loading /
// success / failure states the UI has to handle.

import { WRITE_LATENCY_MS } from "./config";
import { nextId, mutate } from "./ledger";
import type { Account } from "./types";

export type ActionErrorCode =
  | "FROZEN"
  | "INSUFFICIENT_FUNDS"
  | "NOT_OWNED"
  | "NETWORK"
  | "VALIDATION";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; message: string };

export type Receipt = {
  id: string;
  kind: "BUY" | "LIST" | "DELIST" | "OFFER" | "ACCEPT_OFFER" | "CANCEL_OFFER";
  /** Signed cents: negative debits the balance, positive credits it. */
  deltaCents: number;
  balanceCents: number;
  note: string;
  at: number;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const frozen = (): ActionResult<never> => ({
  ok: false,
  code: "FROZEN",
  message: "交易功能已冻结 · 当前为演示环境，不会产生真实成交",
});

/** Deterministic-ish failure so error states are reachable on demand. */
function networkFailed(): boolean {
  return Math.random() < 0.12;
}

function settle(
  kind: Receipt["kind"],
  deltaCents: number,
  note: string,
): Receipt {
  let balanceCents = 0;
  mutate((ledger) => {
    ledger.user.balanceCents += deltaCents;
    balanceCents = ledger.user.balanceCents;
  });
  return {
    id: nextId("R"),
    kind,
    deltaCents,
    balanceCents,
    note,
    at: Date.now(),
  };
}

/* --------------------------------------------------------------- buy now --- */

export async function buyNow(args: {
  enabled: boolean;
  listingId: string;
  itemId: string;
  serial: string;
  priceCents: number;
}): Promise<ActionResult<Receipt>> {
  if (!args.enabled) return frozen();
  if (!(args.priceCents > 0))
    return { ok: false, code: "VALIDATION", message: "挂单价无效" };
  await sleep(WRITE_LATENCY_MS);
  if (networkFailed())
    return {
      ok: false,
      code: "NETWORK",
      message: "网络抖动，扣款未完成，请重试",
    };

  const balance = currentBalance();
  if (balance != null && balance < args.priceCents) {
    const short = args.priceCents - balance;
    return {
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      message: `余额不足，还差 ¥${(short / 100).toFixed(2)}`,
    };
  }

  const receipt = settle(
    "BUY",
    -args.priceCents,
    `买入 ${args.itemId} · ${args.serial}`,
  );
  mutate((ledger) => {
    ledger.assets = [
      {
        copyId: nextId("C"),
        itemId: args.itemId,
        serial: args.serial,
        serialTotal: null,
        acquiredCents: args.priceCents,
        at: Date.now(),
        grade: null,
        status: "HELD",
      },
      ...ledger.assets,
    ];
    ledger.user.sales += 0;
  });
  return { ok: true, data: receipt };
}

/* ------------------------------------------------------------ make an offer --- */

export async function makeOffer(args: {
  enabled: boolean;
  itemId: string;
  priceCents: number;
}): Promise<ActionResult<Receipt>> {
  if (!args.enabled) return frozen();
  if (!(args.priceCents > 0))
    return { ok: false, code: "VALIDATION", message: "请输入出价金额" };
  await sleep(WRITE_LATENCY_MS);
  if (networkFailed())
    return { ok: false, code: "NETWORK", message: "出价未提交成功，请重试" };

  const balance = currentBalance();
  if (balance != null && balance < args.priceCents)
    return {
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      message: "余额不足，出价将被自动拒绝",
    };

  mutate((ledger) => {
    ledger.offersMade = [
      {
        id: nextId("MO"),
        itemId: args.itemId,
        priceCents: args.priceCents,
        status: "OPEN",
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 86400000,
      },
      ...ledger.offersMade,
    ];
    ledger.user.lockedCents += args.priceCents;
    ledger.user.balanceCents -= args.priceCents;
  });
  const receipt = settle(
    "OFFER",
    0,
    `出价 ¥${(args.priceCents / 100).toFixed(2)} 已冻结为保证金`,
  );
  return { ok: true, data: receipt };
}

/* ------------------------------------------------- accept / decline an offer --- */

export async function acceptOffer(args: {
  enabled: boolean;
  offerId: string;
  itemId: string;
  priceCents: number;
}): Promise<ActionResult<Receipt>> {
  if (!args.enabled) return frozen();
  await sleep(WRITE_LATENCY_MS);
  if (networkFailed())
    return { ok: false, code: "NETWORK", message: "接受报价失败，请重试" };

  mutate((ledger) => {
    ledger.offersReceived = ledger.offersReceived.filter(
      (o) => o.id !== args.offerId,
    );
  });
  const receipt = settle(
    "ACCEPT_OFFER",
    args.priceCents,
    `接受报价 · +¥${(args.priceCents / 100).toFixed(2)}`,
  );
  return { ok: true, data: receipt };
}

export async function cancelOffer(args: {
  enabled: boolean;
  offerId: string;
  priceCents: number;
}): Promise<ActionResult<Receipt>> {
  if (!args.enabled) return frozen();
  await sleep(WRITE_LATENCY_MS / 2);
  mutate((ledger) => {
    ledger.offersMade = ledger.offersMade.filter((o) => o.id !== args.offerId);
    ledger.user.lockedCents -= args.priceCents;
  });
  const receipt = settle("CANCEL_OFFER", args.priceCents, "撤销出价，保证金已退回");
  return { ok: true, data: receipt };
}

/* ------------------------------------------------------- list / delist mine --- */

export async function createListing(args: {
  enabled: boolean;
  copyId: string;
  itemId: string;
  serial: string;
  serialTotal: number | null;
  priceCents: number;
}): Promise<ActionResult<Receipt>> {
  if (!args.enabled) return frozen();
  if (!(args.priceCents > 0))
    return { ok: false, code: "VALIDATION", message: "请输入挂单价" };
  await sleep(WRITE_LATENCY_MS);
  if (networkFailed())
    return { ok: false, code: "NETWORK", message: "挂单未上链，请重试" };

  mutate((ledger) => {
    ledger.listings = [
      {
        id: nextId("ML"),
        itemId: args.itemId,
        copyId: args.copyId,
        serial: args.serial,
        serialTotal: args.serialTotal,
        priceCents: args.priceCents,
        status: "ACTIVE",
        views: 0,
        watchers: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 14 * 86400000,
      },
      ...ledger.listings,
    ];
    ledger.assets = ledger.assets.map((a) =>
      a.copyId === args.copyId ? { ...a, status: "LISTED" } : a,
    );
  });
  const receipt = settle("LIST", 0, `挂单 ¥${(args.priceCents / 100).toFixed(2)}`);
  return { ok: true, data: receipt };
}

export async function cancelListing(args: {
  enabled: boolean;
  listingId: string;
}): Promise<ActionResult<Receipt>> {
  if (!args.enabled) return frozen();
  await sleep(WRITE_LATENCY_MS / 2);
  if (networkFailed())
    return { ok: false, code: "NETWORK", message: "撤单失败，请重试" };

  let copyId: string | null = null;
  mutate((ledger) => {
    const target = ledger.listings.find((l) => l.id === args.listingId);
    copyId = target?.copyId ?? null;
    ledger.listings = ledger.listings.filter((l) => l.id !== args.listingId);
    if (copyId)
      ledger.assets = ledger.assets.map((a) =>
        a.copyId === copyId ? { ...a, status: "HELD" } : a,
      );
  });
  const receipt = settle("DELIST", 0, "已撤单，卡牌回到我的资产");
  return { ok: true, data: receipt };
}

/* ----------------------------------------------------------------- helpers --- */

export function currentBalance(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("gridcards:market-me:v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: Account };
    return parsed.user?.balanceCents ?? null;
  } catch {
    return null;
  }
}
