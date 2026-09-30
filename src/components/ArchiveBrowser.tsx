"use client";

// Archive browser — search + classification for the 515 one-of-one cards.
// Filters run entirely in the browser (static export, no search server), and
// the base grid is server-prerendered so the page is never blank on load.
//
// Classification dimensions: SEASON, SET, TEAM (resolved from the season entry
// list) and DRIVER (spelling variants merged, dual cards counted for both).

import Link from "next/link";
import { useMemo, useState } from "react";
import WatchButton from "@/components/WatchButton";
import { archiveAspect as aspect } from "@/lib/archiveAspect";
import { teamLogo } from "@/lib/teams";

export type ArchiveRow = {
  id: number;
  driver: string;
  drivers: string[];
  team: string;
  setName: string;
  serial: string;
  year: string;
  cardName: string;
  img: string;
  /** Real scan size, used to frame the card at its own aspect ratio. */
  w: number;
  h: number;
  href: string;
  a: string;
  b: string;
};

type Props = {
  rows: ArchiveRow[];
  sets: Array<{ name: string; count: number }>;
  teams: Array<{ name: string; count: number }>;
  drivers: Array<{ name: string; count: number }>;
  years: Array<{ name: string; count: number }>;
};

type SortKey = "year" | "driver" | "team" | "id";

export default function ArchiveBrowser({
  rows,
  sets,
  teams,
  drivers,
  years,
}: Props) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<string | null>(null);
  const [set, setSet] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [driver, setDriver] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("year");
  const [driverLimit, setDriverLimit] = useState(24);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (year && r.year !== year) return false;
      if (set && r.setName !== set) return false;
      if (team && r.team !== team) return false;
      if (driver && !r.drivers.includes(driver) && r.driver !== driver)
        return false;
      if (!q) return true;
      return (
        r.driver.toLowerCase().includes(q) ||
        r.drivers.some((d) => d.toLowerCase().includes(q)) ||
        r.team.toLowerCase().includes(q) ||
        r.setName.toLowerCase().includes(q) ||
        r.cardName.toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
    });
    return list.sort((x, y) => {
      if (sort === "id") return x.id - y.id;
      if (sort === "year")
        return y.year.localeCompare(x.year) || x.driver.localeCompare(y.driver);
      if (sort === "team")
        return x.team.localeCompare(y.team) || x.driver.localeCompare(y.driver);
      return x.driver.localeCompare(y.driver) || x.id - y.id;
    });
  }, [rows, query, year, set, team, driver, sort]);

  const active = Boolean(query.trim() || year || set || team || driver);
  const reset = () => {
    setQuery("");
    setYear(null);
    setSet(null);
    setTeam(null);
    setDriver(null);
  };

  const shownDrivers = drivers.slice(0, driverLimit);

  return (
    <>
      <div className="archiveToolbar">
        <div className="archiveSearch">
          <span className="searchIcon">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索车手、车队、系列、卡名或卡片 ID…"
            aria-label="Search the archive"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear">
              ×
            </button>
          )}
        </div>
        <select
          className="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort"
        >
          <option value="year">赛季新 → 旧</option>
          <option value="driver">车手 A → Z</option>
          <option value="team">车队 A → Z</option>
          <option value="id">卡片 ID</option>
        </select>
      </div>

      <div className="filterGroup">
        <small>赛季 SEASON</small>
        <div className="chips">
          <button
            className={`chip ${year === null ? "active" : ""}`}
            type="button"
            onClick={() => setYear(null)}
          >
            All <span className="count">{rows.length}</span>
          </button>
          {years.map((y) => (
            <button
              key={y.name}
              className={`chip ${year === y.name ? "active" : ""}`}
              type="button"
              onClick={() => setYear(year === y.name ? null : y.name)}
            >
              {y.name} <span className="count">{y.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filterGroup">
        <small>系列 SET</small>
        <div className="chips">
          <button
            className={`chip ${set === null ? "active" : ""}`}
            type="button"
            onClick={() => setSet(null)}
          >
            All <span className="count">{rows.length}</span>
          </button>
          {sets.map((s) => (
            <button
              key={s.name}
              className={`chip ${set === s.name ? "active" : ""}`}
              type="button"
              onClick={() => setSet(set === s.name ? null : s.name)}
            >
              {s.name} <span className="count">{s.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filterGroup">
        <small>车队 TEAM</small>
        <div className="chips">
          <button
            className={`chip ${team === null ? "active" : ""}`}
            type="button"
            onClick={() => setTeam(null)}
          >
            All <span className="count">{rows.length}</span>
          </button>
          {teams.map((t) => {
            const logo = teamLogo(t.name);
            return (
              <button
                key={t.name}
                className={`chip ${team === t.name ? "active" : ""}`}
                type="button"
                onClick={() => setTeam(team === t.name ? null : t.name)}
              >
                {logo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="chipLogo" src={logo} alt="" loading="lazy" />
                )}
                {t.name} <span className="count">{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filterGroup">
        <small>车手 DRIVER</small>
        <div className="chips">
          <button
            className={`chip ${driver === null ? "active" : ""}`}
            type="button"
            onClick={() => setDriver(null)}
          >
            All <span className="count">{rows.length}</span>
          </button>
          {shownDrivers.map((d) => (
            <button
              key={d.name}
              className={`chip ${driver === d.name ? "active" : ""}`}
              type="button"
              onClick={() => setDriver(driver === d.name ? null : d.name)}
            >
              {d.name} <span className="count">{d.count}</span>
            </button>
          ))}
          {driverLimit < drivers.length && (
            <button
              className="chip"
              type="button"
              onClick={() => setDriverLimit(drivers.length)}
            >
              显示全部 {drivers.length} 位 →
            </button>
          )}
        </div>
      </div>

      <div className="resultsTop">
        <strong>
          {filtered.length} / {rows.length} 张 1/1
        </strong>
        {active && (
          <button className="pill" type="button" onClick={reset}>
            清除筛选
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="panel emptyWatch">
          <h3>没有匹配的 1/1</h3>
          <p style={{ lineHeight: 1.7 }}>
            试试只按车手或只按车队筛选；{rows.length} 张卡覆盖{" "}
            {drivers.length} 位车手、{teams.length} 支车队、
            {years.length} 个赛季。
          </p>
          <button className="btn primary" type="button" onClick={reset}>
            重置筛选
          </button>
        </div>
      ) : (
        <div className="archiveGrid">
          {filtered.map((r) => (
            <div className="archiveCard" key={r.id}>
              <Link
                href={r.href}
                className="archiveVisual"
                style={
                  aspect(r.w, r.h)
                    ? ({ aspectRatio: aspect(r.w, r.h) } as React.CSSProperties)
                    : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.img}
                  alt={`${r.driver} ${r.serial} card`}
                  loading="lazy"
                  width={r.w || 360}
                  height={r.h || 500}
                />
                <span className="serialFlag">{r.serial}</span>
                <span className="yearFlag">{r.year}</span>
                <WatchButton
                  entry={{
                    id: `archive:${r.id}`,
                    kind: "archive",
                    title: `${r.driver} · ${r.serial}`,
                    subtitle: `${r.setName} · ${r.year}`,
                    meta: "Digital 1/1 archive",
                    href: "/archive/",
                    art: "racer",
                    a: r.a,
                    b: r.b,
                    img: r.img,
                  }}
                />
              </Link>
              <div className="archiveMeta">
                <b>{r.driver}</b>
                <span>
                  {r.team} · {r.setName}
                </span>
                {r.cardName && <span className="archiveCardName">{r.cardName}</span>}
                <span className="archiveId">#{r.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
