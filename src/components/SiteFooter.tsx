// Global footer — every page ends with the same provenance block so the
// project's one hard rule is stated everywhere it matters:
//   real checklist & real imagery · invented prices are always labeled DEMO.

import Link from "next/link";
import { ARCHIVE_CARDS } from "@/lib/archiveData";

// Counted from the data, never hardcoded: the archive grows every time the
// Goldin scrape turns up another one-of-one.
const ARCHIVE_COUNT = ARCHIVE_CARDS.length;

const COLUMNS = [
  {
    title: "Market",
    links: [
      { href: "/", label: "Checklist market" },
      { href: "/archive/", label: "1/1 Digital Archive" },
      { href: "/collections/", label: "Collections & indices" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/activity/", label: "Activity tape" },
      { href: "/community/", label: "Collector feed" },
    ],
  },
  {
    title: "You",
    links: [
      { href: "/watchlist/", label: "Watchlist" },
      { href: "/orders/", label: "Orders" },
      { href: "/profile/", label: "My Space" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/", label: "数据与版权说明" },
      { href: "/notices/", label: "Third-party notices" },
      { href: "/takedown/", label: "Takedown request" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="footerGrid">
        <div className="footerBrand">
          <div className="brand">
            <i className="mark"></i>
            <span>
              GRID<em>CARDS</em>
            </span>
          </div>
          <p>
            2020 Topps Chrome Formula 1 的卡谱市场：车手 → 稀有度 → 版本 →
            编号 → 交易，结构来自官方 checklist，不编造。
          </p>
          <div className="footerProvenance">
            <div>
              <small>CHECKLIST</small>
              <b>313 official records · 57 drivers</b>
            </div>
            <div>
              <small>IMAGERY</small>
              <b>{ARCHIVE_COUNT} 张 1/1 数字卡 · 第三方藏家投稿实物照</b>
            </div>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <nav className="footerCol" key={col.title}>
            <small>{col.title}</small>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        ))}

        <div className="footerNote">
          <small>DATA HONESTY</small>
          <p>
            所有标 DEMO 的价格都是界面占位值，不是真实行情；市场尚无公开
            listing，因此 Ask / Last sale 显示 “—” 而不是编造数字。
          </p>
          <p className="kbd">⌘ K 搜索车手、卡号、分区</p>
        </div>
      </div>
      <div className="footerBottom">
        <span>GRIDCARDS · 2020 Topps Chrome F1 market prototype</span>
        <span>
          PSA 实物卡照片由藏家提供 · 2020 Topps Chrome F1 checklist 来自官方卡表
        </span>
      </div>
    </footer>
  );
}
