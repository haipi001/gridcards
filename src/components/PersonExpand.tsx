"use client";

// Inline ladder for a person card in the market grid — expand the card and the
// full rarity ladder (tier → edition → print run) appears without leaving the
// checklist. Same data as the player page, same DEMO labelling.

import Link from "next/link";
import { money } from "@/lib/marketUi";
import type { LadderOneOfOne, LadderRow } from "@/lib/ladderIndex";

const TIER_ORDER = ["Ultimate", "Legendary", "Rare", "Uncommon", "Base"];

export default function PersonExpand({
  name,
  team,
  rows,
  records,
  href,
  oneOfOnes = [],
  oneOfOneCount = 0,
}: {
  name: string;
  team: string | null;
  rows: LadderRow[];
  records: number;
  href: string;
  oneOfOnes?: LadderOneOfOne[];
  oneOfOneCount?: number;
}) {
  const tiers = TIER_ORDER.filter((t) => rows.some((r) => r.tier === t));
  const numbered = rows.filter((r) => r.printRun).length;

  return (
    <div className="personExpand">
      <div className="personExpandHead">
        <div>
          <small>
            {team ?? "2020 Topps Chrome F1"} · {records} 条卡谱记录 ·{" "}
            {rows.length} 个版本（{numbered} 个带编号）
          </small>
        </div>
        <Link className="link" href={href}>
          完整人物页 →
        </Link>
      </div>

      {oneOfOnes.length > 0 && (
        <div className="expandScans">
          <div className="expandScansHead">
            <small>
              1/1 实物影像 · {oneOfOneCount} 张
              {oneOfOneCount > oneOfOnes.length &&
                ` · 显示前 ${oneOfOnes.length} 张`}
            </small>
            <Link className="link" href="/archive/">
              Digital archive →
            </Link>
          </div>
          <div className="scanStrip">
            {oneOfOnes.map((s) => (
              <Link
                className="scanThumb"
                key={s.id}
                href="/archive/"
                title={`${s.setName} · ${s.year} · #${s.id}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt={`${name} 1/1 ${s.setName}`} loading="lazy" />
                <span className="scanYear">{s.year}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="ladderMini">
        {tiers.map((tier) => {
          const cls = rows.find((r) => r.tier === tier)?.cls ?? "base";
          return (
            <div className={`ladderRow ${cls}`} key={tier}>
              <span className="ladderTier">{tier}</span>
              <div className="ladderChips">
                {rows
                  .filter((r) => r.tier === tier)
                  .map((r) => (
                    <Link
                      className="ladderChip"
                      key={r.href + r.variant}
                      href={r.href}
                      title={`${r.label} · ${r.variant}`}
                    >
                      <b>{r.variant}</b>
                      <span>
                        {r.printRun ? `/${r.printRun}` : "unnumbered"} ·{" "}
                        {money(r.askDemo)} DEMO
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
