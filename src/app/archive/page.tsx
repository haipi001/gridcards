// /archive — the 1/1 Digital Archive.
// 515 one-of-one cards (2020–2026) mirrored from the public allofone.app
// archive, every one with a real card scan served from
// public/img/archive/{id}.jpg — the gallery works fully offline/statically.
//
// The grid is server-prerendered, then filtered in the browser by season, set,
// constructor and driver — plus free-text search. Constructor attribution is
// precomputed in scripts/build-archive.ts from the season entry list, because
// the archive itself carries no team column.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import {
  ARCHIVE_CARDS,
  ARCHIVE_DRIVER_NAMES,
  archiveDriverCounts,
  archiveSetCounts,
  archiveTeamCounts,
  archiveYearCounts,
  canonicalDriver,
} from "@/lib/archiveData";
import { ALL_ITEMS } from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { teamTheme } from "@/lib/teams";
import ArchiveBrowser, { type ArchiveRow } from "@/components/ArchiveBrowser";

export const metadata: Metadata = pageMeta({
  title: "1/1 Digital Archive — GRIDCARDS",
  description:
    "515 one-of-one Topps F1 cards, 2020–2026: real scans filterable by season, set, constructor and driver.",
  path: "/archive/",
});

// Only drivers that appear in the checklist have a market page of their own;
// everyone else links back into the archive filtered on their name.
const PLAYER_SLUGS = new Set<string>();
for (const item of ALL_ITEMS) {
  if (item.kind === "person") PLAYER_SLUGS.add(slugify(item.name));
}

const ROWS: ArchiveRow[] = ARCHIVE_CARDS.map((card) => {
  const driver = canonicalDriver(card.drivers[0] ?? card.driver);
  const theme = teamTheme(card.team);
  const slug = slugify(driver);
  return {
    id: card.id,
    driver,
    drivers: card.drivers.map(canonicalDriver),
    team: card.team,
    setName: card.setName,
    serial: card.serial,
    year: card.year,
    cardName: card.cardName,
    img: card.img,
    w: card.w,
    h: card.h,
    href: PLAYER_SLUGS.has(slug) ? `/players/${slug}/` : "/archive/",
    a: theme.a,
    b: theme.b,
  };
});

const SETS = archiveSetCounts();
const TEAMS = archiveTeamCounts();
const DRIVERS = archiveDriverCounts();
const YEARS = archiveYearCounts();

const SEASONS = new Set(ROWS.map((r) => r.year).filter((y) => y !== "Undated"));
const SPAN = [...SEASONS].sort();

export default function ArchivePage() {
  return (
    <div className="wrap">
      <div className="activityHero">
        <div>
          <div className="eyebrow">1/1 DISCOVERY NETWORK</div>
          <h1>Digital Archive</h1>
          <p>
            {ROWS.length} 张 1/1 数字卡，覆盖 {SPAN[0]}–{SPAN[SPAN.length - 1]}{" "}
            赛季与 {SETS.length} 个 Topps 系列：真实卡面影像，每张全网唯一。
            按赛季、系列、车队或车手筛选，点任意卡片进入该车手的市场页。
          </p>
        </div>
        <div className="activityStats">
          <div className="statTile">
            <small>CARDS</small>
            <b>{ROWS.length}</b>
            <span className="mut">every one a 1/1</span>
          </div>
          <div className="statTile">
            <small>SEASONS</small>
            <b>{SPAN.length}</b>
            <span className="mut">
              {SPAN[0]}–{SPAN[SPAN.length - 1]}
            </span>
          </div>
          <div className="statTile">
            <small>DRIVERS</small>
            <b>{ARCHIVE_DRIVER_NAMES.length}</b>
            <span className="mut">featured</span>
          </div>
          <div className="statTile">
            <small>SERIAL</small>
            <b>1/1</b>
            <span className="mut">every single one</span>
          </div>
        </div>
      </div>

      <ArchiveBrowser
        rows={ROWS}
        sets={SETS}
        teams={TEAMS}
        drivers={DRIVERS}
        years={YEARS}
      />

      <p className="mut" style={{ marginTop: 28, fontSize: 11 }}>
        {ROWS.length} 张 1/1 数字卡影像 · 每张全网唯一 · 车队归属按赛季参赛名单解析
      </p>
      <p className="mut archiveCredit">
        <b>影像来源：</b>以上卡面照片为第三方藏家公开投稿的实物照，本站不主张其权利，
        仅用于演示真实卡面。来源与许可状态见{" "}
        <Link className="link" href="/notices/">
          Third-party notices
        </Link>
        ；权利人或车手本人可{" "}
        <Link className="link" href="/takedown/">
          提交下架请求
        </Link>
        。
      </p>
    </div>
  );
}
