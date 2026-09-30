// Collections · Index Lab — V8 layout.
// All index / analytics numbers below are clearly-labeled UI demo values per
// docs/14 (V6 原型数据声明). Real values arrive with market_events
// materialization (Phase 10) and third-party population data licensing.

import Link from "next/link";
import CardVisual from "@/components/CardVisual";
import { ALL_ITEMS, getCatalogSize, getPlayerNames, getSections } from "@/lib/catalog";
import { ARCHIVE_CARDS } from "@/lib/archiveData";

const LOGO_COLORS = [
  "#00d7b6",
  "#e8002d",
  "#1e41ff",
  "#ff8700",
  "#f596c8",
  "#469bff",
];

const INDEX_KPIS: Array<[string, string, string, "up" | "down"]> = [
  ["RACING MARKET INDEX", "1,284.62", "+2.84% · 30D", "up"],
  ["HIGH-END /50↓", "1,412.20", "+8.60% · 30D", "up"],
  ["LOW-POP INDEX", "1,536.80", "+6.10% · 30D", "up"],
  ["PSA 10 PREMIUM", "1.31×", "+0.04× · 30D", "up"],
  ["LIQUIDITY SCORE", "62.4", "+3.7 pts", "up"],
  ["MARKET BREADTH", "58%", "+6 pts", "up"],
];

const INDEX_ROWS = [
  ["GRID Racing Composite", "1,284.62", "+0.3%", "+1.8%", "+2.8%", "+11.8%", "+16.2%", "120"],
  ["High-End /50↓", "1,412.20", "+0.8%", "+3.6%", "+8.6%", "+18.1%", "+23.7%", "84"],
  ["Low-Pop", "1,536.80", "+0.4%", "+2.9%", "+6.1%", "+14.4%", "+19.0%", "96"],
  ["Autograph", "1,198.40", "-0.2%", "+1.2%", "+4.7%", "+9.2%", "+12.5%", "52"],
  ["Liquid Base", "1,071.30", "+0.1%", "+0.6%", "+1.9%", "+5.8%", "+7.2%", "110"],
  ["PSA 10 Basket", "1,344.10", "+0.5%", "+2.1%", "+5.3%", "+12.6%", "+17.4%", "100"],
];

const COLLECTION_ROWS = [
  ["2020 Topps Chrome F1", "92.4", "$78", "$4.82M", "$42.6K", "+8.1%", "78", "4.8%", "14.8%", "3,284", "$188", "1.34×"],
  ["Chrome Autograph Variations", "89.7", "$310", "$1.74M", "$31.8K", "+12.4%", "66", "3.9%", "9.2%", "1,018", "$612", "1.41×"],
  ["Track Tags", "78.3", "$92", "$846K", "$14.7K", "-2.1%", "71", "5.2%", "18.5%", "1,744", "$132", "1.28×"],
  ["1954 World on Wheels", "75.8", "$68", "$724K", "$9.7K", "+1.8%", "69", "4.1%", "21.3%", "1,302", "$109", "1.22×"],
  ["Base Image Variations", "84.1", "$140", "$592K", "$6.3K", "+6.2%", "58", "2.7%", "11.8%", "904", "$271", "1.39×"],
  ["Grand Prix Winners", "73.5", "$72", "$498K", "$4.9K", "+0.8%", "63", "3.4%", "19.6%", "1,478", "$104", "1.19×"],
  ["Driver of the Day", "71.6", "$66", "$442K", "$4.2K", "+1.4%", "61", "3.1%", "20.4%", "1,391", "$98", "1.17×"],
  ["Team Logos", "64.2", "$44", "$318K", "$2.8K", "-1.2%", "55", "2.2%", "24.7%", "1,208", "$67", "1.08×"],
];

// Real numbers derived from the 2020 Topps Chrome F1 source checklist.
function computeCatalogFacts() {
  const sections = getSections().map((section) => {
    const items = ALL_ITEMS.filter((i) => i.sectionSlug === section.slug);
    const drivers = new Set(
      items.filter((i) => i.kind === "person").map((i) => i.name),
    ).size;
    const teams = new Set(items.map((i) => i.team).filter(Boolean)).size;
    const numbered = new Set(items.map((i) => i.cardNumber)).size;
    return {
      ...section,
      records: items.length,
      drivers,
      teams,
      numbered,
      personCards: items.filter((i) => i.kind === "person").length,
      objectCards: items.filter((i) => i.kind === "collection").length,
    };
  });

  const datasetOf = (slug: string) =>
    slug === "track-tags"
      ? "tt"
      : slug === "world-on-wheels"
        ? "54w"
        : slug === "base-card-image-variations"
          ? "variations"
          : slug === "chrome-autograph-variations"
            ? "autographs"
            : null;

  return {
    total: getCatalogSize(),
    drivers: getPlayerNames().length,
    teams: new Set(ALL_ITEMS.map((i) => i.team).filter(Boolean)).size,
    sections,
    digitals: ARCHIVE_CARDS.length,
    hrefFor: (slug: string, category: string) => {
      const d = datasetOf(slug);
      if (d) return `/?dataset=${d}`;
      return category === "base" ? `/?section=${slug}` : "/";
    },
  };
}

export default function CollectionsPage() {
  const facts = computeCatalogFacts();

  return (
    <div className="wrap">
      <div className="collectionsHero">
        <div>
          <div className="eyebrow">PRO MARKET DATA · INDEX LAB</div>
          <h1>Collections &amp; Indices</h1>
          <p>
            专业卡牌市场数据层：不只看 Floor 和成交额，还看指数、市场广度、流动性、挂牌深度、换手率、波动率、评级溢价与分级人口。当前数值为
            UI / 数据模型演示，正式版接真实成交、挂牌和评级数据。
          </p>
        </div>
        <div className="indexHero">
          <div>
            <small>GRID RACING COMPOSITE</small>
            <b>1,284.62</b>
            <span className="delta up">+2.84% · 30D</span>
            <em>Base 1000 · demo index</em>
          </div>
        </div>
      </div>

      <div className="yearBar">
        <b>YEAR</b>
        <button className="pill active">2020</button>
        {[2021, 2022, 2023, 2024, 2025].map((y) => (
          <button key={y} className="pill futurePill">
            {y} · Soon
          </button>
        ))}
      </div>

      {/* ---- REAL DATA: everything below is computed from the PDF checklist ---- */}
      <div className="sectionTitle">
        <div>
          <div className="eyebrow">LIVE FROM SOURCE PDF · REAL</div>
          <h2>Catalog coverage</h2>
          <p>
            以下全部来自 2020 Topps Chrome F1 官方 checklist
            解析结果，不是模拟值。市场指数与成交额仍为演示（见下方 DEMO 区块）。
          </p>
        </div>
      </div>
      <div className="indexBoard">
        {[
          ["CHECKLIST RECORDS", String(facts.total), "source PDF lines"],
          ["DRIVERS", String(facts.drivers), "person records"],
          ["CONSTRUCTORS", String(facts.teams), "team entries"],
          ["SECTIONS", String(facts.sections.length), "checklist groups"],
          ["1/1 DIGITALS", String(facts.digitals), "digital 1/1 set"],
          ["GRADED CARDS", "1", "PSA/DNA certified"],
        ].map((x) => (
          <div className="indexKpi" key={x[0]}>
            <small>{x[0]}</small>
            <b>{x[1]}</b>
            <span className="mut">{x[2]}</span>
          </div>
        ))}
      </div>

      <div className="sectionTitle">
        <div>
          <div className="eyebrow">CHECKLIST BREAKDOWN · REAL</div>
          <h2>Sections &amp; composition</h2>
          <p>
            每个分区的记录数、人物卡与实物卡比例、涉及的车手与车队数量。点任意行进入市场对应筛选。
          </p>
        </div>
      </div>
      <div className="indexTable">
        <div className="indexHead">
          <span>SECTION</span>
          <span>RECORDS</span>
          <span>DRIVERS</span>
          <span>TEAMS</span>
          <span>PERSON</span>
          <span>OBJECT</span>
          <span>TYPE</span>
        </div>
        {facts.sections.map((s, i) => (
          <Link className="indexRow linkRow" href={facts.hrefFor(s.slug, s.category)} key={s.slug}>
            <b>
              {String(i + 1).padStart(2, "0")} · {s.name}
            </b>
            <b>{s.records}</b>
            <span>{s.drivers}</span>
            <span>{s.teams}</span>
            <span>{s.personCards}</span>
            <span>{s.objectCards}</span>
            <span>{s.category.toUpperCase()}</span>
          </Link>
        ))}
      </div>

      {/* ---- DEMO MODEL: market index / analytics values below are simulated ---- */}
      <div className="sectionTitle">
        <div>
          <div className="eyebrow">DEMO MODEL · NOT REAL MARKET DATA</div>
          <h2>Market indices</h2>
          <p>
            以下指数、成交额、流动性与评级溢价均为原型演示值，用于校验 UI
            与数据模型；真实数值需等 Listing / Order 引擎（Phase 7–9）与评级人口数据接入。
          </p>
        </div>
      </div>

      <div className="indexBoard">
        {INDEX_KPIS.map((x) => (
          <div className="indexKpi" key={x[0]}>
            <small>{x[0]} · DEMO</small>
            <b>{x[1]}</b>
            <span className={`delta ${x[3]}`}>{x[2]}</span>
          </div>
        ))}
      </div>

      <div className="analyticsBand proCharts">
        <div className="panel">
          <div className="row space">
            <div>
              <h3>GRID Racing Market Index</h3>
              <p>
                成交价格加权的赛车卡市场基准；正式版应使用可复核成交样本并处理异常成交。
              </p>
            </div>
            <div className="indexNow">
              <b>1,284.62</b>
              <span className="delta up">+11.8% 90D</span>
            </div>
          </div>
          <div className="chart">
            <svg viewBox="0 0 700 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#63caff" stopOpacity=".28" />
                  <stop offset="1" stopColor="#63caff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="grid">
                <line x1="0" y1="40" x2="700" y2="40" />
                <line x1="0" y1="90" x2="700" y2="90" />
                <line x1="0" y1="140" x2="700" y2="140" />
                <line x1="0" y1="190" x2="700" y2="190" />
              </g>
              <path
                className="area"
                d="M0 178 L55 167 L110 171 L165 147 L220 151 L275 124 L330 134 L385 108 L440 116 L495 82 L550 94 L605 58 L660 67 L700 48 L700 220 L0 220 Z"
              />
              <polyline
                className="line"
                points="0,178 55,167 110,171 165,147 220,151 275,124 330,134 385,108 440,116 495,82 550,94 605,58 660,67 700,48"
              />
            </svg>
          </div>
        </div>
        <div className="panel">
          <h3>Market breadth</h3>
          <p>上涨成分占比、成交活跃度和供给变化组合观察。</p>
          <div className="breadthGauge">
            <div>
              <b>58%</b>
              <span>ADVANCING</span>
            </div>
            <div>
              <b>62.4</b>
              <span>LIQUIDITY</span>
            </div>
            <div>
              <b>4.8%</b>
              <span>SELL-THROUGH</span>
            </div>
            <div>
              <b>13.6%</b>
              <span>LISTED / SUPPLY</span>
            </div>
          </div>
          <div className="dist">
            {[
              ["High-End /50↓", "76%", "+8.6%"],
              ["Low-Pop", "68%", "+6.1%"],
              ["Base / Liquid", "51%", "+1.9%"],
              ["Autographs", "63%", "+4.7%"],
            ].map((d) => (
              <div className="distRow" key={d[0]}>
                <span>{d[0]}</span>
                <div className="bar">
                  <i style={{ width: d[1] }}></i>
                </div>
                <b>{d[2]}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sectionTitle">
        <div>
          <div className="eyebrow">INDEX PERFORMANCE</div>
          <h2>Card market indices</h2>
          <p>
            指数框架参考专业卡牌市场常见的 Racing / Low-Pop / High-End
            分段逻辑，并加入实体卡交易所需要的流动性与评级溢价指标。
          </p>
        </div>
      </div>
      <div className="indexTable">
        <div className="indexHead">
          <span>INDEX</span>
          <span>LEVEL</span>
          <span>1D</span>
          <span>7D</span>
          <span>30D</span>
          <span>90D</span>
          <span>YTD</span>
          <span>COMPONENTS</span>
        </div>
        {INDEX_ROWS.map((r) => (
          <div className="indexRow" key={r[0]}>
            <b>{r[0]}</b>
            <b>{r[1]}</b>
            {r.slice(2, 7).map((v, i) => (
              <span key={i} className={v.startsWith("-") ? "delta down" : "delta up"}>
                {v}
              </span>
            ))}
            <span>{r[7]}</span>
          </div>
        ))}
      </div>

      <div className="sectionTitle">
        <div>
          <div className="eyebrow">COLLECTION RANKING</div>
          <h2>2020 collection analytics</h2>
          <p>
            系列层级同时观察价格、成交、供给、持有人、流动性和评级结构。下面全部为原型模拟值，不代表真实市场报价。
          </p>
        </div>
      </div>
      <div className="dataToolbar">
        <input placeholder="Search collection / subset..." readOnly />
        <button className="pill active">2020</button>
        <button className="pill">F1</button>
        <select className="sort" disabled>
          <option>Composite score</option>
        </select>
      </div>
      <div className="dataTablePro">
        <div className="proHead">
          <span>COLLECTION</span>
          <span>SCORE</span>
          <span>FLOOR</span>
          <span>MKT CAP</span>
          <span>24H VOL</span>
          <span>30D</span>
          <span>LIQUIDITY</span>
          <span>TURNOVER</span>
          <span>LISTED</span>
          <span>OWNERS</span>
          <span>MEDIAN SALE</span>
          <span>PSA10 PREM.</span>
        </div>
        {COLLECTION_ROWS.map((r, i) => (
          <div className="proRow" key={r[0]}>
            <div className="setCell">
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <i className="setLogo">
                <CardVisual
                  className="setLogoArt"
                  art="crest"
                  a={LOGO_COLORS[i % LOGO_COLORS.length]}
                  b="#10161c"
                />
              </i>
              <div className="setName">
                <b>{r[0]}</b>
                <span>2020 · Topps Chrome Formula 1</span>
              </div>
            </div>
            <b>{r[1]}</b>
            <b>{r[2]}</b>
            <b>{r[3]}</b>
            <b>{r[4]}</b>
            <b className={r[5].startsWith("-") ? "delta down" : "delta up"}>{r[5]}</b>
            <span>{r[6]}</span>
            <span>{r[7]}</span>
            <span>{r[8]}</span>
            <span>{r[9]}</span>
            <b>{r[10]}</b>
            <span>{r[11]}</span>
          </div>
        ))}
      </div>

      <div className="metricGlossary">
        <div>
          <b>Liquidity Score</b>
          <span>成交频率、买卖价差、挂牌深度与成交天数综合值。</span>
        </div>
        <div>
          <b>Turnover</b>
          <span>周期成交额 / 可交易市值，用于观察库存换手速度。</span>
        </div>
        <div>
          <b>PSA10 Premium</b>
          <span>PSA 10 中位成交价相对 Raw / PSA 9 基准的溢价倍数。</span>
        </div>
        <div>
          <b>Population</b>
          <span>正式版接 PSA 等评级人口数据；评级人口不等于总存世量。</span>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Collections — GRIDCARDS",
  description:
    "Checklist coverage, section breakdown and market indices for 2020 Topps Chrome F1.",
  path: "/collections/",
});

