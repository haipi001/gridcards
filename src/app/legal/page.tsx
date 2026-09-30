import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";

// What this site is, in plain language, before anyone trades on it.
// The prototype ships DEMO pricing and frozen trading; saying so on a legal
// page is the difference between a demo and a misleading marketplace.

export const metadata: Metadata = pageMeta({
  title: "数据与版权说明",
  description:
    "站点性质、DEMO 数据说明、浏览器本地存储与隐私、权利联系渠道。本站为原型演示，不提供真实交易。",
  path: "/legal/",
});

const SECTIONS = [
  {
    title: "1 · 站点性质",
    body: "GRIDCARDS 是一个静态导出的原型站点，用于展示 2020 Topps Chrome Formula 1 卡谱的结构（车手 → 稀有度 → 版本 → 编号 → 交易）。它不是交易平台：没有账户体系、没有支付通道、没有托管与履约能力，站内任何“买入 / 出售 / 出价 / 接受报价”按钮均处于冻结状态，点击不会产生任何交易或资金变动。",
  },
  {
    title: "2 · 行情数据均为 DEMO",
    body: "卡号、平行卡层级与官方印量来自公开 checklist；地板价、成交额、涨幅榜、持有人数与余额一律是带 DEMO 标注的演示值，由 scripts/gen-market-mock.mjs 用固定种子生成，不代表任何真实成交，不得用于估值、报价或投资参考。市场尚无公开 listing 的条目显示 “—”，而不是编造数字。",
  },
  {
    title: "3 · 影像与商标",
    body: "卡面扫描图由第三方藏家公开投稿，仅用于演示真实卡面外观；卡面 artwork、车队标识与车手形象可能各自拥有独立的著作权、商标或数据库权利，本站不主张任何权利，也未获得任何授权。F1、Formula 1、Topps、PSA 等名称与标识为各自权利人所有。权利人可随时要求下架。",
  },
  {
    title: "4 · 隐私与本地存储",
    body: "本站没有服务端，因此不收集、不上传、不共享任何个人信息。通过「出售卡牌」上传的照片只在当前设备的浏览器内处理：经 canvas 重编码剥离 EXIF / GPS 后存入 IndexedDB，从不离开本机，也从不进入代码仓库。关注列表、认领编号与演示账本保存在 localStorage。清除浏览器数据即可彻底删除这些内容。",
  },
  {
    title: "5 · 第三方代码",
    body: "卡面立体效果使用了 RuiC-card-skill（MIT License, Copyright (c) 2026 HRuiCcc），许可与署名完整保留在 THIRD_PARTY_NOTICES.md 与 /notices/ 页面。其余构建依赖见 package.json。",
  },
  {
    title: "6 · 联系与下架",
    body: "若您是卡面影像、数据或其他内容的权利人并希望移除，或发现事实性错误，请通过下架请求页面提交，我们会优先处理权利人请求。",
  },
];

export default function LegalPage() {
  return (
    <div className="wrap">
      <div className="communityHead">
        <div className="eyebrow">LEGAL · DATA & COPYRIGHT</div>
        <h1>数据与版权说明</h1>
        <p>
          本页说明本站的性质、数据来源、本地存储行为与权利联系渠道。卡谱结构与
          DEMO 数据的边界，是全站唯一不可让步的规则。
        </p>
      </div>

      <div className="noticeList">
        {SECTIONS.map((s) => (
          <section className="infoBox noticeItem" key={s.title}>
            <b>{s.title}</b>
            <p className="mut" style={{ margin: "7px 0 0", lineHeight: 1.65 }}>
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <div className="actionRow" style={{ marginTop: 18 }}>
        <Link className="btn primary" href="/takedown/">
          提交下架 / 更正请求
        </Link>
        <Link className="btn" href="/notices/">
          Third-party notices
        </Link>
      </div>
    </div>
  );
}
