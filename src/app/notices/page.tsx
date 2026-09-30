// /notices — third-party attribution, rendered in-site.
// The authoritative record lives in THIRD_PARTY_NOTICES.md; this page is the
// visible counterpart so a rights holder never has to find the repo to read it.
//
// Deliberately does not name the upstream card archive on the page — the footer
// and archive copy use neutral wording ("collector-submitted photography"); the
// full source attribution is recorded in THIRD_PARTY_NOTICES.md.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";

export const metadata: Metadata = pageMeta({
  title: "Third-party notices — GRIDCARDS",
  description:
    "Attribution and licensing status for the card imagery, data and open-source code this prototype ships.",
  path: "/notices/",
});

const SECTIONS = [
  {
    title: "卡面影像 · 515 张 1/1 扫描",
    body: "档案库中的实体卡照片由第三方藏家公开投稿，仅用于演示“真实卡面长什么样”。卡面 artwork、车队标识与车手形象可能各自拥有独立的著作权、商标或数据库权利；开源软件许可不授予对这些素材的任何权利。正式上线前会以已授权素材或用户自有上传替换。",
    action: "权利人可提交下架 / 更正请求 →",
  },
  {
    title: "车队标识 · 自绘",
    body: "站点不再分发任何第三方车队标识。public/img/teams/ 下的标识由本项目按车队涂装配色生成的抽象几何图形，不复制厂商 artwork。",
    action: null,
  },
  {
    title: "卡表数据 · 2020 Topps Chrome F1",
    body: "313 条官方 checklist 记录仅作结构性用途（卡号层级、稀有度阶梯骨架）。页面上的价格、成交额、指数与流动性分数都是带 DEMO 标注的界面占位值，不是真实行情。",
    action: null,
  },
  {
    title: "开源代码 · RuiC-card-skill (MIT)",
    body: "卡面立体效果引擎计划引入上游 RuiC-card-skill（MIT License, Copyright (c) 2026 HRuiCcc）。引入时会保留其 LICENSE 并在此署名。上游许可不覆盖用户上传的卡图。",
    action: null,
  },
  {
    title: "商标",
    body: "F1、Formula 1、Topps、PSA、McLaren 等名称与标识为各自权利人的商标。本站为演示项目，不主张任何权利，也未获得任何授权。",
    action: null,
  },
];

export default function NoticesPage() {
  return (
    <div className="wrap">
      <div className="communityHead">
        <div className="eyebrow">LEGAL · ATTRIBUTION</div>
        <h1>Third-party notices</h1>
        <p>
          本页说明站内第三方素材与代码的来源与许可状态。完整记录见仓库内的
          THIRD_PARTY_NOTICES.md。
        </p>
      </div>

      <div className="noticeList">
        {SECTIONS.map((s) => (
          <section className="infoBox noticeItem" key={s.title}>
            <b>{s.title}</b>
            <p className="mut" style={{ margin: "7px 0 0", lineHeight: 1.65 }}>
              {s.body}
            </p>
            {s.action && (
              <Link className="link" href="/takedown/">
                {s.action}
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
