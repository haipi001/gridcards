// Presentation helpers. Money is integer cents everywhere; no float ever
// reaches the DOM.

import { CURRENCY_SYMBOL } from "./config";

export function money(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const v = cents / 100;
  if (v >= 100000) return `${CURRENCY_SYMBOL}${(v / 10000).toFixed(1)}万`;
  return `${CURRENCY_SYMBOL}${v.toLocaleString("zh-CN", {
    maximumFractionDigits: v < 100 ? 2 : 0,
  })}`;
}

export function moneyExact(cents: number): string {
  return `${CURRENCY_SYMBOL}${(cents / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function pct(v: number): string {
  const s = (v * 100).toFixed(1);
  return `${v > 0 ? "+" : ""}${s}%`;
}

export function compact(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** Serials are strings by invariant — "3/5" is built, never parsed into ints. */
export function serialLabel(serial: string, total: number | null): string {
  return total ? `${serial}/${total}` : `#${serial}`;
}

const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;

export function timeAgo(at: number, now = Date.now()): string {
  const d = Math.max(0, now - at);
  if (d < MIN) return "刚刚";
  if (d < HOUR) return `${Math.floor(d / MIN)} 分钟前`;
  if (d < DAY) return `${Math.floor(d / HOUR)} 小时前`;
  if (d < 30 * DAY) return `${Math.floor(d / DAY)} 天前`;
  return new Date(at).toLocaleDateString("zh-CN");
}

export function countdown(at: number, now = Date.now()): string {
  const d = at - now;
  if (d <= 0) return "已到期";
  const days = Math.floor(d / DAY);
  if (days >= 1) return `${days} 天后`;
  const hours = Math.floor(d / HOUR);
  if (hours >= 1) return `${hours} 小时后`;
  return `${Math.max(1, Math.floor(d / MIN))} 分钟后`;
}

export function dateLabel(at: number): string {
  return new Date(at).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}
