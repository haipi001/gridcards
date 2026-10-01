"use client";

// Client-side market browser.
//
// The app is statically exported, so there is no server to evaluate
// ?dataset= / ?section= / ?player= at request time. Instead every one of the
// 313 official checklist records ships with the page and filtering happens in
// the browser from the URL query — the links keep working exactly as before.
//
// Server render = the default base checklist (real HTML, no blank first
// paint). On mount the component reads the actual query string and re-filters,
// so a shared /?dataset=tt link still lands on the right dataset.

import { useCallback, useEffect, useMemo, useState } from "react";
import CatalogCard from "@/components/CatalogCard";
import { DATASETS, type CatalogItem, type DatasetKey } from "@/lib/marketUi";
import type { SectionInfo } from "@/lib/catalog";
import type { LadderIndex } from "@/lib/ladderIndex";

const SPECIAL_SETS = [
  {
    key: "tt" as DatasetKey,
    name: "Track Tags",
    code: "TT",
    slug: "track-tags",
    desc: "INSERTS · TT-1–TT-15",
  },
  {
    key: "54w" as DatasetKey,
    name: "1954 Topps World on Wheels",
    code: "54W",
    slug: "world-on-wheels",
    desc: "INSERTS · 54W-1–54W-35",
  },
  {
    key: "variations" as DatasetKey,
    name: "Base Card Image Variations",
    code: "VAR",
    slug: "base-card-image-variations",
    desc: "IMAGE VARIATIONS",
  },
  {
    key: "autographs" as DatasetKey,
    name: "Chrome Autograph Variations",
    code: "F1A",
    slug: "chrome-autograph-variations",
    desc: "AUTOGRAPHS",
  },
];

const SPECIAL_SLUGS = new Set(SPECIAL_SETS.map((s) => s.slug));

type SortKey = "checklist" | "checklistDesc" | "name";

/**
 * Rarity bands, answered from the real ladder index rather than invented:
 * every person in the checklist ships with their editions and print runs, so
 * "does this driver have a 1/1?" is a fact we can filter on today.
 */
type Rarity = "all" | "oneofone" | "short" | "long" | "unnumbered";

const RARITY_BANDS: Array<{ key: Rarity; label: string; hint: string }> = [
  { key: "all", label: "全部", hint: "不过滤" },
  { key: "oneofone", label: "1/1", hint: "有 1/1 版本" },
  { key: "short", label: "≤ /25", hint: "有 /5 · /25 短印量版本" },
  { key: "long", label: "≥ /50", hint: "有 /50 及以上印量版本" },
  { key: "unnumbered", label: "未编号", hint: "有未编号版本" },
];

type Query = {
  dataset: DatasetKey;
  sections: string[];
  player: string;
  kind: "all" | "person" | "object";
  name: string;
  rarity: Rarity;
  scans: boolean;
};

// Card numbers are strings on purpose ("196", "TT-1", "F1A-LH"): fall back to a
// numeric compare when both sides parse, otherwise keep a stable text order.
function compareCardNumber(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && a.trim() && b.trim()) return na - nb;
  return a.localeCompare(b, "en", { numeric: true });
}

function parseQuery(search: string): Query {
  const sp = new URLSearchParams(search);
  const raw = sp.get("dataset");
  const rarity = sp.get("rarity");
  return {
    dataset: DATASETS.some((d) => d.key === raw) ? (raw as DatasetKey) : "base",
    sections: sp.getAll("section").filter(Boolean),
    player: sp.get("player")?.trim() ?? "",
    kind:
      sp.get("kind") === "person" || sp.get("kind") === "object"
        ? (sp.get("kind") as "person" | "object")
        : "all",
    name: sp.get("name")?.trim() ?? "",
    rarity: RARITY_BANDS.some((b) => b.key === rarity)
      ? (rarity as Rarity)
      : "all",
    scans: sp.get("scans") === "1",
  };
}

function parseSort(search: string): SortKey {
  const raw = new URLSearchParams(search).get("sort");
  return raw === "checklistDesc" || raw === "name" ? raw : "checklist";
}

function toHref(q: Query): string {
  const sp = new URLSearchParams();
  if (q.dataset !== "base") sp.set("dataset", q.dataset);
  for (const s of q.sections) sp.append("section", s);
  if (q.player) sp.set("player", q.player);
  if (q.kind !== "all") sp.set("kind", q.kind);
  if (q.name) sp.set("name", q.name);
  if (q.rarity !== "all") sp.set("rarity", q.rarity);
  if (q.scans) sp.set("scans", "1");
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

function withSort(href: string, sort: SortKey): string {
  const url = new URL(href, "http://x");
  if (sort === "checklist") url.searchParams.delete("sort");
  else url.searchParams.set("sort", sort);
  const qs = url.searchParams.toString();
  return qs ? `/?${qs}` : "/";
}

export default function MarketBrowser({
  items,
  sections,
  ladders,
}: {
  items: CatalogItem[];
  sections: SectionInfo[];
  ladders: LadderIndex;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<SortKey>("checklist");
  const [q, setQ] = useState<Query>({
    dataset: "base",
    sections: [],
    player: "",
    kind: "all",
    name: "",
    rarity: "all",
    scans: false,
  });

  // Adopt the real query string once we are in the browser.
  useEffect(() => {
    const sync = () => {
      setQ(parseQuery(window.location.search));
      setSort(parseSort(window.location.search));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback((href: string) => {
    window.history.pushState({}, "", href);
    setQ(parseQuery(new URL(href, window.location.origin).search));
  }, []);

  // Modify clicks keep native behaviour (new tab); plain clicks are instant.
  const intercept = (href: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    navigate(href);
  };

  const datasetDef = DATASETS.find((d) => d.key === q.dataset)!;

  const sectionCounts = new Map<string, number>();
  const specialCounts = new Map<string, number>();
  for (const item of items) {
    const bucket = SPECIAL_SLUGS.has(item.sectionSlug)
      ? specialCounts
      : sectionCounts;
    bucket.set(item.sectionSlug, (bucket.get(item.sectionSlug) ?? 0) + 1);
  }

  const allowed = datasetDef.sectionSlugs;

  // Does this checklist record own a print run in the requested band? Objects
  // (team / collection records) carry no ladder, so a rarity filter narrows to
  // people by definition — the same rule the player pages follow.
  const inBand = (name: string, band: Rarity): boolean => {
    const rows = ladders[name]?.rows ?? [];
    if (band === "all") return true;
    return rows.some((r) => {
      const run = r.printRun;
      if (band === "oneofone") return run === 1;
      if (band === "short") return run !== null && run > 1 && run <= 25;
      if (band === "long") return run !== null && run >= 50;
      return run === null; // unnumbered
    });
  };

  const filtered = items.filter((item) => {
    if (q.kind === "person" && item.kind !== "person") return false;
    if (q.kind === "object" && item.kind === "person") return false;
    if (q.name && !item.name.toLowerCase().includes(q.name.toLowerCase()))
      return false;
    if (q.rarity !== "all") {
      if (item.kind !== "person") return false;
      if (!inBand(item.name, q.rarity)) return false;
    }
    if (q.scans && !(ladders[item.name]?.oneOfOneCount ?? 0)) return false;
    if (allowed) {
      if (!allowed.includes(item.sectionSlug)) return false;
    } else if (item.sectionCategory !== "base") {
      return false;
    }
    if (q.dataset === "base" && q.sections.length > 0) {
      if (!q.sections.includes(item.sectionSlug)) return false;
    }
    if (q.player && !item.name.toLowerCase().includes(q.player.toLowerCase())) {
      return false;
    }
    return true;
  });

  // The official PDF order is the default; the sort control only reorders what
  // is already on screen (it never changes which records match).
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "checklistDesc")
    filtered.sort((a, b) => compareCardNumber(b.cardNumber, a.cardNumber));
  else filtered.sort((a, b) => compareCardNumber(a.cardNumber, b.cardNumber));

  // Group records by section, preserving official order (V8 section heads).
  const groups: Array<{ section: string; items: CatalogItem[] }> = [];
  for (const item of filtered) {
    let g = groups.find((x) => x.section === item.sectionName);
    if (!g) {
      g = { section: item.sectionName, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }

  // Checklist records per person, for the inline expansion header.
  const recordsBy = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      if (item.kind !== "person") continue;
      map[item.name] = (map[item.name] ?? 0) + 1;
    }
    return map;
  }, [items]);

  // Keyed by card id, not by person name: the same driver appears in several
  // checklist sections, and expanding one record must not open all of them.
  const toggleCard = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Not memoized on purpose: `filtered` is rebuilt on every keystroke anyway,
  // and the 313-record pass is cheaper than the memo bookkeeping.
  const visiblePersonCards = filtered.filter(
    (c) => c.kind === "person" && Boolean(ladders[c.name]?.rows.length),
  );

  const allOpen =
    visiblePersonCards.length > 0 &&
    visiblePersonCards.every((c) => open.has(c.id));

  const baseSections = sections.filter((s) => s.category === "base");

  // How many people would match each rarity band — the rail states its own
  // effect before you click, and never offers a filter that yields nothing.
  const bandCounts = useMemo(() => {
    const people = Array.from(new Set(items.filter((i) => i.kind === "person").map((i) => i.name)));
    const counts: Record<Rarity, number> = {
      all: people.length,
      oneofone: 0,
      short: 0,
      long: 0,
      unnumbered: 0,
    };
    for (const name of people) {
      for (const band of ["oneofone", "short", "long", "unnumbered"] as Rarity[]) {
        if (inBand(name, band)) counts[band] += 1;
      }
    }
    return counts;
    // inBand reads only ladders, which is stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, ladders]);

  const scanCount = useMemo(
    () =>
      new Set(
        items
          .filter((i) => i.kind === "person" && (ladders[i.name]?.oneOfOneCount ?? 0) > 0)
          .map((i) => i.name),
      ).size,
    [items, ladders],
  );

  // What is currently narrowing the list, so the rail can show it and undo it.
  const activeFilters: Array<{ label: string; clear: () => void }> = [];
  if (q.kind !== "all")
    activeFilters.push({
      label: q.kind === "person" ? "人物" : "车队 / 物件",
      clear: () => navigate(toHref({ ...q, kind: "all" })),
    });
  if (q.name)
    activeFilters.push({
      label: `名称：${q.name}`,
      clear: () => setQ({ ...q, name: "" }),
    });
  if (q.rarity !== "all")
    activeFilters.push({
      label: `印量：${RARITY_BANDS.find((b) => b.key === q.rarity)?.label ?? q.rarity}`,
      clear: () => navigate(toHref({ ...q, rarity: "all" })),
    });
  if (q.scans)
    activeFilters.push({
      label: "有 1/1 实物照",
      clear: () => navigate(toHref({ ...q, scans: false })),
    });
  for (const slug of q.sections)
    activeFilters.push({
      label: baseSections.find((s) => s.slug === slug)?.name ?? slug,
      clear: () =>
        setQ((prev) => ({
          ...prev,
          sections: prev.sections.filter((x) => x !== slug),
        })),
    });
  if (q.dataset !== "base")
    activeFilters.push({
      label: DATASETS.find((d) => d.key === q.dataset)?.label ?? q.dataset,
      clear: () => navigate(toHref({ ...q, dataset: "base", sections: [] })),
    });

  const resetFilters = () => {
    setQ({
      dataset: "base",
      sections: [],
      player: "",
      kind: "all",
      name: "",
      rarity: "all",
      scans: false,
    });
    setSort("checklist");
    navigate("/");
  };

  return (
    <>
      {/* Dataset tabs */}
      <div className="marketTabs">
        {DATASETS.map((d) => {
          const next: Query = { ...q, dataset: d.key, sections: [] };
          const href = toHref(next);
          return (
            <a
              key={d.key}
              href={href}
              className={`chip ${q.dataset === d.key ? "active" : ""}`}
              onClick={intercept(href)}
            >
              {d.label}
            </a>
          );
        })}
      </div>

      <div className="marketShell">
        {/* Filter rail */}
        <aside className="filterRail">
          <h3>Filters</h3>
          <div className="filterStatic">
            <small>YEAR</small>
            <div className="filterStaticRow">
              <b>2020</b>
              <span className="count">CURRENT DATASET</span>
            </div>
            <p className="mut">
              已录入 2020 Topps Chrome F1 官方 checklist；2021–2025
              待官方卡谱发布后接入。
            </p>
          </div>
          <details className="filter" open>
            <summary>
              Card type <span>⌄</span>
            </summary>
            <div className="inner">
              <div className="typeFilter">
                {(
                  [
                    { key: "all", label: "全部" },
                    { key: "person", label: "人物" },
                    { key: "object", label: "车队 / 物件" },
                  ] as const
                ).map((k) => (
                  <button
                    key={k.key}
                    className={`chip ${q.kind === k.key ? "active" : ""}`}
                    type="button"
                    onClick={() =>
                      navigate(toHref({ ...q, kind: k.key }))
                    }
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <input
                className="nameFilter"
                type="text"
                value={q.name}
                placeholder="按人物名筛选，如 Hamilton"
                onChange={(e) => setQ({ ...q, name: e.target.value })}
                aria-label="Filter by name"
              />
            </div>
          </details>
          <details className="filter" open>
            <summary>
              Parallel 印量 <span>⌄</span>
            </summary>
            <div className="inner">
              <div className="mChips">
                {RARITY_BANDS.map((b) => {
                  const n = bandCounts[b.key];
                  const on = q.rarity === b.key;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      className={`mChip${on ? " on" : ""}`}
                      aria-pressed={on}
                      title={b.hint}
                      disabled={b.key !== "all" && n === 0}
                      onClick={() =>
                        navigate(
                          toHref({ ...q, rarity: on ? "all" : b.key, kind: "all" }),
                        )
                      }
                    >
                      {b.label}
                      <em className="chipCount">{n}</em>
                    </button>
                  );
                })}
              </div>
              <label className="check">
                <span>有 1/1 实物照</span>
                <input
                  type="checkbox"
                  checked={q.scans}
                  onChange={(e) =>
                    navigate(toHref({ ...q, scans: e.currentTarget.checked }))
                  }
                />
              </label>
              <p className="railNote">
                {scanCount} 位人物的 1/1 实物照已归档；印量按官方 checklist
                的 print run 判定，不是估算。
              </p>
            </div>
          </details>
          <details className="filter" open>
            <summary>
              Checklist section <span>⌄</span>
            </summary>
            <div className="inner">
              {q.dataset === "base" ? (
                baseSections.map((s) => (
                  <div className="check" key={s.slug}>
                    <label>
                      <input
                        type="checkbox"
                        name="section"
                        value={s.slug}
                        checked={q.sections.includes(s.slug)}
                        onChange={(e) => {
                          const on = e.currentTarget.checked;
                          setQ((prev) => ({
                            ...prev,
                            sections: on
                              ? [...prev.sections, s.slug]
                              : prev.sections.filter((x) => x !== s.slug),
                          }));
                        }}
                      />
                      {s.name}
                    </label>
                    <span className="count">
                      {sectionCounts.get(s.slug) ?? 0}
                    </span>
                  </div>
                ))
              ) : (
                <p className="mut" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
                  当前数据集为单一分类，无需按 section 细分。
                </p>
              )}
            </div>
          </details>

          <div className="railRoadmap">
            <small>ROADMAP · 随真实挂牌开放</small>
            <ul>
              <li>
                <b>Grade</b>
                <span>PSA 10 / PSA 9 / BGS / CGC / Raw</span>
              </li>
              <li>
                <b>Price range</b>
                <span>有真实挂牌后开放区间筛选</span>
              </li>
              <li>
                <b>Seller / ships to</b>
                <span>卖家上传管线（Phase 6）上线后启用</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Results */}
        <main>
          <div className="resultsTop">
            <strong>
              {filtered.length} checklist records · ordered by card #
            </strong>
            <span className="sourceFlag">PDF source</span>
            {visiblePersonCards.length > 0 && (
              <button
                className="pill"
                type="button"
                onClick={() =>
                  setOpen(
                    allOpen
                      ? new Set()
                      : new Set(visiblePersonCards.map((c) => c.id)),
                  )
                }
              >
                {allOpen
                  ? "收起全部"
                  : `展开全部 ${visiblePersonCards.length} 张人物卡`}
              </button>
            )}
            <select
              className="sort"
              value={sort}
              onChange={(e) => {
                const next = e.target.value as SortKey;
                setSort(next);
                navigate(withSort(toHref(q), next));
              }}
              aria-label="Sort checklist records"
            >
              <option value="checklist">Checklist # ↑</option>
              <option value="checklistDesc">Checklist # ↓</option>
              <option value="name">Name A → Z</option>
            </select>
          </div>

          {activeFilters.length > 0 && (
            <div className="railActive">
              {activeFilters.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  className="activeChip"
                  onClick={f.clear}
                  title="移除该条件"
                >
                  {f.label} ×
                </button>
              ))}
              <button className="pill" type="button" onClick={resetFilters}>
                清除全部
              </button>
            </div>
          )}
          {q.dataset === "base" && (
            <div className="catalogNotice">
              Base checklist states 200 cards. The source PDF contains two lines
              numbered <b>#196</b>; both are preserved and flagged below rather
              than silently corrected.
            </div>
          )}
          <div className="marketGrid catalogGrid">
            {groups.map((g, idx) => (
              <div key={g.section} style={{ display: "contents" }}>
                <div className="catalogSectionHead">
                  <div>
                    <span className="catalogIndex">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <b>{g.section}</b>
                      <span>
                        {g.items.length} checklist record
                        {g.items.length === 1 ? "" : "s"} · official order
                      </span>
                    </div>
                  </div>
                  <span>
                    {g.items[0]?.cardNumber ?? ""} →{" "}
                    {g.items[g.items.length - 1]?.cardNumber ?? ""}
                  </span>
                </div>
                {g.items.map((c) => (
                  <CatalogCard
                    key={c.id}
                    card={c}
                    ladder={ladders[c.name]}
                    records={recordsBy[c.name]}
                    expanded={open.has(c.id)}
                    onToggle={() => toggleCard(c.id)}
                  />
                ))}
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="mut" style={{ marginTop: 40, textAlign: "center" }}>
              No checklist records match the current filters.
            </p>
          )}

          {/* Special collection entries */}
          {q.dataset === "base" && (
            <>
              <div className="sectionTitle marketSpecialTitle">
                <div>
                  <div className="eyebrow">PDF COLLECTION GROUPS</div>
                  <h2>Checklist Collections</h2>
                  <p>
                    Base 之外，按源 PDF 出现顺序进入 Track Tags、1954 Topps World
                    on Wheels、Base Card Image Variations 与 Chrome Autograph
                    Variations。
                  </p>
                </div>
              </div>
              <div className="specialSetGrid">
                {SPECIAL_SETS.map((s) => {
                  const href = toHref({ ...q, dataset: s.key, sections: [] });
                  return (
                    <a
                      key={s.code}
                      href={href}
                      className="specialSet"
                      onClick={intercept(href)}
                    >
                      <div>
                        <div className="eyebrow">{s.desc}</div>
                        <div className="setCode">{s.code}</div>
                        <h3>{s.name}</h3>
                        <p>From the uploaded 2020 Topps Chrome F1 checklist.</p>
                      </div>
                      <div className="setFoot">
                        <span>
                          {specialCounts.get(s.slug) ?? 0} checklist entries
                        </span>
                        <span>Explore →</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
