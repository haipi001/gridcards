// Market homepage — V8 layout driven by the real checklist data.
// Market pulse / ask / last-sale numbers carry DEMO labels: they are UI
// placeholders until the Listing engine (Phase 7) produces real market data.
//
// Statically exported: filtering happens client-side in <MarketBrowser>.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import MarketBrowser from "@/components/MarketBrowser";
import SellButton from "@/components/SellButton";
import SpotlightCarousel, {
  type SpotlightSlide,
} from "@/components/SpotlightCarousel";
import { archiveForDriver } from "@/lib/archiveData";
import { ALL_ITEMS, getCatalogSize, getSections } from "@/lib/catalog";
import { buildLadderIndex } from "@/lib/ladderIndex";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = pageMeta({
  title: "2020 Topps Chrome F1 — GRIDCARDS",
  description:
    "Browse the official 2020 Topps Chrome Formula 1 checklist: 313 records, 57 drivers, every parallel and print run.",
  path: "/",
});

// Spotlight rotation: the PSA-graded Lando Norris Auto Red Refractor leads,
// followed by real 1/1 digital cards — one per featured driver.
const FEATURED = [
  "Lando Norris",
  "Max Verstappen",
  "Lewis Hamilton",
  "Charles Leclerc",
  "Carlos Sainz",
  "George Russell",
];

function buildSlides(): SpotlightSlide[] {
  const slides: SpotlightSlide[] = [
    {
      id: "graded-norris",
      img: "/img/graded/lando-norris-auto-red-refractor-psa10.jpg",
      alt: "2020 Topps Chrome F1 Lando Norris Auto Red Refractor — PSA GEM MT 10",
      eyebrow: "GRADED SPOTLIGHT · PSA/DNA",
      title: "Lando Norris",
      subtitle: "Auto Red Refractor /5",
      badges: ["PSA GEM MT 10", "AUTO 10", "CERT #63278613", "McLaren F1® Team"],
      text: "新秀年红折射签（Topps Certified Autograph Issue），双满分评级。真实卡面影像直接挂在市场页——卖家上传管线（Phase 6）开放后，每一张实体卡都会这样带图上架。",
      href: "/players/lando-norris/",
      cta: "View Lando Norris market →",
    },
  ];

  for (const name of FEATURED) {
    // Newest scan first — a driver with several 1/1s shows their latest.
    const card = archiveForDriver(name)[0];
    if (!card) continue;
    slides.push({
      id: `archive-${card.id}`,
      img: card.img,
      alt: `${name} 1/1 digital card`,
      eyebrow: "1/1 DIGITAL ARCHIVE",
      title: name,
      subtitle: `${card.setName} · ${card.year} · ${card.serial}`,
      badges: ["1/1", card.setName, card.year],
      text: "全网唯一的数字卡影像。1/1 不进入编号阶梯，它是该版本仅存的一张。",
      href: `/players/${slugify(name)}/`,
      cta: `View ${name} market →`,
    });
  }

  return slides;
}

export default function MarketPage() {
  const catalogSize = getCatalogSize();
  const slides = buildSlides();

  return (
    <div className="wrap">
      {/* Hero */}
      <div className="marketHeader marketHeaderV7">
        <div>
          <div className="eyebrow">OFFICIAL CHECKLIST · MARKETPLACE</div>
          <h1>2020 Topps Chrome F1</h1>
          <p>
            2020 Topps Chrome Formula 1 全卡谱市场。按 PDF 官方卡号顺序浏览，点人物进入完整人物卡谱；团队
            / Logo / 车辆类卡进入 Collection 数据终端。
          </p>
          <div className="datasetLine">
            <span className="liveDot"></span>
            <b>2020 dataset live</b>
            <span>2021–2025 schema reserved</span>
            <span>·</span>
            <span>{catalogSize} source records</span>
          </div>
        </div>
        <div className="marketHeroActions">
          <SellButton className="btn primary" label="List a card" />
          <Link className="btn" href="/activity">
            Market activity
          </Link>
        </div>
      </div>

      {/* Pulse — all values are UI placeholders until Phase 7+ */}
      <div className="marketPulse">
        <div>
          <small>MARKET INDEX · DEMO</small>
          <b>1,284.62</b>
          <span className="delta up">+2.84% · 30D</span>
        </div>
        <div>
          <small>24H VOLUME · DEMO</small>
          <b>$42.6K</b>
          <span className="delta up">+8.7%</span>
        </div>
        <div>
          <small>LISTED COPIES · DEMO</small>
          <b>286</b>
          <span>across 2020 market</span>
        </div>
        <div>
          <small>ACTIVE COLLECTORS · DEMO</small>
          <b>3,284</b>
          <span>owners / buyers</span>
        </div>
      </div>

      {/* Real cards, rotating: graded PSA card first, then 1/1 archive cards */}
      <SpotlightCarousel slides={slides} />

      <MarketBrowser
        items={ALL_ITEMS}
        sections={getSections()}
        ladders={buildLadderIndex()}
      />
    </div>
  );
}
