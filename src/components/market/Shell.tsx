"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "./Toast";
import { useLocationSearch } from "@/lib/browserStore";
import { DEV_SWITCHES, tradeEnabled } from "@/market/config";

const LINKS = [
  { href: "/market", label: "首页推荐" },
  { href: "/market/collections", label: "合集 / 系列" },
  { href: "/market/items", label: "全部商品" },
  { href: "/market/me", label: "我的资产" },
];

/** Market sub-header: section nav + the frozen-trade indicator. */
export default function MarketShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const search = useLocationSearch();
  const live = tradeEnabled(search);

  return (
    <div className="mShell">
      <div className="mHead">
        <div className="mHeadText">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className={`mFlag ${live ? "live" : "frozen"}`}>
          <b>{live ? "TRADE DEMO" : "TRADE FROZEN"}</b>
          <span>
            {live
              ? "演练模式：交易按钮可用（模拟请求，不产生真实资金流动）"
              : DEV_SWITCHES
                ? "买入 / 出售已冻结 · 追加 ?trade=1 开启演练"
                : "买入 / 出售尚未开放 · 当前仅展示卡谱与市场结构"}
          </span>
        </div>
      </div>

      <nav className="mSubNav">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={
              (l.href === "/market"
                ? pathname === "/market"
                : pathname.startsWith(l.href))
                ? "page"
                : undefined
            }
            className={
              l.href === "/market"
                ? pathname === "/market"
                  ? "on"
                  : undefined
                : pathname.startsWith(l.href)
                  ? "on"
                  : undefined
            }
          >
            {l.label}
          </Link>
        ))}
        <form className="mSearch" action="/market/search/" method="get">
          <input
            className="mInput"
            name="q"
            placeholder="搜索车手 / 卡号 / 平行卡"
            aria-label="搜索商品"
          />
          <button type="submit" className="mBtn">
            搜索
          </button>
        </form>
      </nav>

      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
