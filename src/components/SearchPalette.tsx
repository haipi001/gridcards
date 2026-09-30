"use client";

// Global ⌘K / Ctrl+K command palette.
// Searches the full checklist index (57 drivers, 313 cards, 15 sections) in
// the browser — the app is statically exported, so there is no search server;
// everything ships with the page and matches instantly.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_ITEMS, getPlayerNames, getSections } from "@/lib/catalog";
import { slugify } from "@/lib/slug";

type Entry = {
  kind: "driver" | "card" | "section" | "nav";
  label: string;
  sub: string;
  href: string;
  keys: string;
};

const KIND_LABEL = {
  driver: "DRIVER",
  card: "CARD",
  section: "SECTION",
  nav: "PAGE",
};

const PAGES: Entry[] = [
  { kind: "nav", label: "My Watchlist", sub: "Locally tracked cards", href: "/watchlist/", keys: "watchlist watchlist saved heart ♡" },
  { kind: "nav", label: "Market", sub: "Full 2020 checklist", href: "/", keys: "market checklist browse home" },
  { kind: "nav", label: "1/1 Digital Archive", sub: "515 one-of-one cards", href: "/archive/", keys: "archive 1/1 digital one of one" },
  { kind: "nav", label: "Collections", sub: "Catalog coverage & indices", href: "/collections/", keys: "collections index analytics" },
  { kind: "nav", label: "Orders", sub: "Listings, orders, offers", href: "/orders/", keys: "orders listings offers buy sell" },
  { kind: "nav", label: "Activity", sub: "Recent market events", href: "/activity/", keys: "activity sales events" },
  { kind: "nav", label: "Community", sub: "Collector feed", href: "/community/", keys: "community feed posts" },
];

function buildIndex(): Entry[] {
  const entries: Entry[] = [...PAGES];

  for (const name of getPlayerNames()) {
    entries.push({
      kind: "driver",
      label: name,
      sub: "Player market",
      href: `/players/${slugify(name)}/`,
      keys: name.toLowerCase(),
    });
  }

  for (const item of ALL_ITEMS) {
    const isPerson = item.kind === "person";
    entries.push({
      kind: "card",
      label: `#${item.cardNumber} · ${item.name}`,
      sub: item.sectionName,
      href: isPerson
        ? `/players/${slugify(item.name)}/`
        : "/collections/",
      keys: `${item.cardNumber} ${item.name}`.toLowerCase(),
    });
  }

  for (const section of getSections()) {
    const dataset =
      section.slug === "track-tags"
        ? "tt"
        : section.slug === "world-on-wheels"
          ? "54w"
          : section.slug === "base-card-image-variations"
            ? "variations"
            : section.slug === "chrome-autograph-variations"
              ? "autographs"
              : null;
    entries.push({
      kind: "section",
      label: section.name,
      sub: "Checklist section",
      href: dataset ? `/?dataset=${dataset}` : `/?section=${section.slug}`,
      keys: section.name.toLowerCase(),
    });
  }

  return entries;
}

function score(entry: Entry, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return -1;
  const { keys, label } = entry;
  if (label.toLowerCase().startsWith(q)) return 100;
  if (keys.startsWith(q)) return 90;
  // Token match: every word of the query must appear somewhere.
  const words = q.split(/\s+/);
  if (words.every((w) => keys.includes(w))) return 70 - keys.indexOf(words[0]) / 100;
  return -1;
}

export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const index = useMemo(() => buildIndex(), []);

  const results = useMemo(() => {
    if (!query.trim()) return index.filter((e) => e.kind === "nav");
    return index
      .map((e) => ({ e, s: score(e, query) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .map((x) => x.e);
  }, [index, query]);

  // Cursor is reset wherever the result set changes (typing, opening), never
  // from an effect — an effect would render twice per keystroke.
  const resetCursor = () => setCursor(0);

  const go = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    setCursor(0);
    window.location.href = href;
  }, []);

  const openPalette = useCallback(() => {
    setQuery("");
    setCursor(0);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setCursor(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
        return;
      }
      if (!typing && e.key === "/") {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.key === "Escape") closePalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPalette, closePalette]);

  // Focus is a DOM side effect, not state — safe (and correct) in an effect.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const onPaletteKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[cursor]) go(results[cursor].href);
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <>
      <button
        className="search paletteTrigger"
        type="button"
        onClick={openPalette}
        aria-label="Search (⌘K)"
      >
        <span className="searchIcon">⌕</span>
        <span className="paletteHint">Search player, card, set or collector…</span>
        <span className="kbd">⌘ K</span>
      </button>

      {open && (
        <div className="paletteOverlay" onClick={closePalette}>
          <div
            className="palette"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onPaletteKey}
          >
            <div className="paletteInputRow">
              <span className="searchIcon">⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetCursor();
                }}
                placeholder="Search drivers, card numbers, sections…"
                aria-label="Search"
              />
              <span className="kbd">ESC</span>
            </div>
            <div className="paletteResults" ref={listRef}>
              {results.map((r, i) => (
                <button
                  key={`${r.kind}-${r.href}-${r.label}`}
                  className={`paletteRow ${i === cursor ? "active" : ""}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(r.href)}
                >
                  <span className={`paletteKind k-${r.kind}`}>
                    {KIND_LABEL[r.kind]}
                  </span>
                  <span className="paletteLabel">{r.label}</span>
                  <span className="paletteSub">{r.sub}</span>
                </button>
              ))}
              {query.trim() && results.length === 0 && (
                <div className="paletteEmpty">
                  No matches for “{query}”. Try a driver name, card number (#10,
                  TT-1, F1A-LH) or section.
                </div>
              )}
              {!query.trim() && (
                <div className="paletteEmpty">
                  快捷入口已列出。输入车手名、卡号或分区名开始搜索：↑↓ 选择，Enter 进入，ESC 关闭。
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
