// Edition / Serial market page (Phase 4).
// Numbered editions expand into exactly `printRun` serial slots — never one
// more, never one less (V5 rule). No copies exist yet, so every slot honestly
// shows "No public copy" instead of invented owners, grades, or prices. Real
// statuses arrive with seller uploads (Phase 6+).
//
// Statically exported: one page per (person, variant) in the rarity ladder.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlayerBySlug,
  getPlayerNames,
  getPlayerRows,
  getPlayerTiers,
  getPlayerVariants,
  playerSlug,
  slugify,
} from "@/lib/catalog";
import { money } from "@/lib/marketUi";
import CardVisual from "@/components/CardVisual";
import WatchButton from "@/components/WatchButton";
import { OwnedMeter, SerialMap } from "@/components/SerialClaim";
import SerialMarket from "@/components/SerialMarket";
import { editionWatchEntry } from "@/lib/watchEntry";
import { serialLabel, type ClaimEntry } from "@/lib/claims";
import { teamTheme, variantArt } from "@/lib/teams";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; variant: string }>;
}): Promise<Metadata> {
  const { name: nameSlug, variant: variantSlug } = await params;
  const name = getPlayerBySlug(nameSlug);
  if (!name) return { title: "Edition — GRIDCARDS" };
  const edition = getPlayerTiers(name)
    .flatMap((t) => t.cards)
    .find((x) => slugify(x.variant) === variantSlug);
  if (!edition) return { title: `${name} — GRIDCARDS` };
  return {
    title: `${name} · ${edition.variant} — GRIDCARDS`,
    description: edition.printRun
      ? `${edition.variant}，官方印量 ${edition.printRun}，展开 ${edition.printRun} 个编号槽位。`
      : `${edition.variant}，未编号版本。`,
  };
}

// Static export: an unknown (driver, variant) pair is a 404, never a page.
export const dynamicParams = false;

export function generateStaticParams() {
  const params: Array<{ name: string; variant: string }> = [];
  for (const name of getPlayerNames()) {
    const slug = playerSlug(name);
    for (const variant of getPlayerVariants(name)) {
      params.push({ name: slug, variant });
    }
  }
  return params;
}

function claimEntry(name: string, edition: { variant: string; label: string }, run: number): ClaimEntry {
  return {
    id: `edition:${name}:${edition.variant}`,
    title: `${edition.label} · ${edition.variant}`,
    player: name,
    run,
    href: `/players/${playerSlug(name)}/editions/${slugify(edition.variant)}/`,
  };
}

export default async function EditionPage({
  params,
}: {
  params: Promise<{ name: string; variant: string }>;
}) {
  const { name: nameSlug, variant: variantSlug } = await params;
  const name = getPlayerBySlug(nameSlug);
  if (!name) notFound();

  const rows = getPlayerRows(name);
  if (rows.length === 0) notFound();

  const edition = getPlayerTiers(name)
    .flatMap((t) => t.cards)
    .find((x) => slugify(x.variant) === variantSlug);
  if (!edition) notFound();

  const theme = teamTheme(rows.find((r) => r.team)?.team ?? null);
  const run = edition.printRun;
  const claim = claimEntry(name, edition, run ?? 0);

  return (
    <div className="wrap">
      <div className="breadcrumb">
        <Link href={`/players/${playerSlug(name)}`}>{name}</Link>
        {" / "}
        <span>2020 Topps Chrome / {edition.variant}</span>
      </div>

      <div className="serialHero" style={{ marginTop: 12 }}>
        <div className="serialVisual">
          <div
            className="cardObject"
            style={
              {
                "--c1": edition.c1,
                "--c2": edition.c2,
                width: "48%",
              } as React.CSSProperties
            }
          >
            <span className="cardNo">#{edition.cardNo}</span>
            <CardVisual
              className="cardArt"
              art={variantArt(edition.variant)}
              a={theme.a}
              b={theme.b}
            />
            <span className="cardName">{name.toUpperCase()}</span>
          </div>
        </div>
        <div className="serialInfo">
          <div className="eyebrow">
            {run ? "NUMBERED EDITION" : "UNNUMBERED EDITION"}
          </div>
          <h1>
            {edition.label}
            <br />
            {edition.variant}
          </h1>
          <p className="mut">
            {run
              ? `该版本官方印量为 ${run}。页面严格展开 ${run} 个具体编号：${serialLabel(1, run)}–${serialLabel(run, run)}，不会多一个也不会少一个。`
              : "未编号版本没有官方 print run，不生成编号槽位。"}
          </p>
          <div className="marketMetrics">
            <div className="marketMetric">
              <small>LOWEST ASK</small>
              <b>—</b>
            </div>
            <div className="marketMetric">
              <small>LAST SALE</small>
              <b>—</b>
            </div>
            <div className="marketMetric">
              <small>TOP OFFER</small>
              <b>—</b>
            </div>
            <div className="marketMetric">
              <small>LISTED</small>
              <b>{run ? `0 / ${run}` : "0"}</b>
            </div>
          </div>
          {run ? <OwnedMeter entry={claim} /> : null}
          <div className="actionRow">
            <button className="btn primary" type="button">
              Buy lowest<i className="soonTag">SOON</i>
            </button>
            <button className="btn" type="button">
              Make edition offer<i className="soonTag">SOON</i>
            </button>
            <WatchButton
              entry={editionWatchEntry(name, edition, rows.find((r) => r.team)?.team ?? null)}
              variant="btn"
            />
          </div>
          <div className="serialTabs">
            <button className="active">
              {run ? `All ${run} serials` : "Edition"}
            </button>
            <button type="button">
              Listings 0<i className="soonTag">SOON</i>
            </button>
            <button type="button">
              Sales<i className="soonTag">SOON</i>
            </button>
            <button type="button">
              Owners<i className="soonTag">SOON</i>
            </button>
          </div>
        </div>
      </div>

      {run ? (
        <>
          <div className="sectionTitle">
            <div>
              <h2>All {run} serials</h2>
              <p>
                {serialLabel(1, run)}–{serialLabel(run, run)} 的完整编号地图。先在下方
                Serial map 认领你持有的编号，再回到这里挂单；挂单 → 预留 →
                付款 → 发货 → 完成，所有权只在最后一步转移。
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="pill active">List</button>
              <button className="pill">Serial map</button>
              <select className="sort" disabled>
                <option>Serial low → high</option>
              </select>
            </div>
          </div>
          <SerialMarket editionId={claim.id} run={run} />

          <div className="sectionTitle">
            <div>
              <h2>Serial map</h2>
              <p>
                整个 /{run} 版本共 {run} 个编号槽位。点任意编号标记“我持有这张实体卡”，
                再次点击取消；认领结果只保存在这台设备的浏览器里。
              </p>
            </div>
          </div>
          <SerialMap entry={claim} />
        </>
      ) : (
        <div className="panel" style={{ marginTop: 24 }}>
          <h3>Edition market</h3>
          <p style={{ lineHeight: 1.7, maxWidth: 640 }}>
            {edition.variant} 为未编号版本。卖家上传该版本的实体 Copy
            后，这里会列出全部可售 Copy 与成交历史；当前市场暂无公开
            Copy。占位参考价（DEMO）：{money(edition.askDemo)}。
          </p>
        </div>
      )}
    </div>
  );
}
