// Backup and restore for everything the visitor owns on this device.
//
// This is the one module allowed to name the raw localStorage keys. Pages go
// through their own stores; an export has to read across all of them at once,
// and a central list of keys is the only way to keep that honest — a key added
// to a store and forgotten here would silently stop being backed up.
//
// ⚠️ Photo bytes are NOT included. They live in IndexedDB as blobs and cannot
// be packed into a JSON file; an imported backup restores the records and the
// pointers, and any photo whose bytes are missing simply shows as empty.

import { CLAIM_EVENT } from "./claims";
import { PROFILE_EVENT } from "./profile";
import { POST_EVENT } from "./social";
import { WATCH_EVENT } from "./watchlist";

export const LOCAL_KEYS = {
  profile: "gridcards:profile:v1",
  claims: "gridcards:claims:v1",
  posts: "gridcards:posts:v1",
  watchlist: "gridcards:watchlist:v1",
} as const;

/** Poked after a bulk write so every cached snapshot re-reads. */
const NOTIFY = [CLAIM_EVENT, POST_EVENT, WATCH_EVENT, PROFILE_EVENT];

function notifyAll() {
  if (typeof window === "undefined") return;
  for (const e of NOTIFY) window.dispatchEvent(new Event(e));
}

export type LocalBackup = {
  app: "gridcards";
  version: 1;
  exportedAt: number;
  data: Partial<Record<keyof typeof LOCAL_KEYS, unknown>>;
};

export function exportLocalData(): string {
  const data: LocalBackup["data"] = {};
  if (typeof window === "undefined") return JSON.stringify(emptyBackup(), null, 2);
  for (const [name, key] of Object.entries(LOCAL_KEYS) as Array<
    [keyof typeof LOCAL_KEYS, string]
  >) {
    const raw = window.localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[name] = JSON.parse(raw);
    } catch {
      // A corrupted entry is skipped rather than poisoning the whole file.
    }
  }
  return JSON.stringify(
    { app: "gridcards", version: 1, exportedAt: Date.now(), data } satisfies LocalBackup,
    null,
    2,
  );
}

function emptyBackup(): LocalBackup {
  return { app: "gridcards", version: 1, exportedAt: Date.now(), data: {} };
}

export type ImportResult = { ok: boolean; message: string; counts: Record<string, number> };

export function importLocalData(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "不是合法的 JSON 文件", counts: {} };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "文件内容不是对象", counts: {} };
  }
  const p = parsed as Partial<LocalBackup>;
  if (p.app !== "gridcards") {
    return { ok: false, message: "这不是 GRIDCARDS 的备份文件", counts: {} };
  }
  if (!p.data || typeof p.data !== "object") {
    return { ok: false, message: "备份文件里没有 data 字段", counts: {} };
  }
  if (typeof window === "undefined") {
    return { ok: false, message: "只能在浏览器中导入", counts: {} };
  }

  const counts: Record<string, number> = {};
  for (const [name, key] of Object.entries(LOCAL_KEYS) as Array<
    [keyof typeof LOCAL_KEYS, string]
  >) {
    const value = (p.data as Record<string, unknown>)[name];
    if (value === undefined) continue;
    if (!Array.isArray(value) && typeof value !== "object") continue;
    window.localStorage.setItem(key, JSON.stringify(value));
    counts[name] = Array.isArray(value) ? value.length : 1;
  }
  notifyAll();
  return {
    ok: true,
    message: `已导入 ${Object.values(counts).reduce((a, b) => a + b, 0)} 条记录，刷新后生效`,
    counts,
  };
}

/** Wipes one store, or all of them. Never touches the market ledger. */
export function clearLocalData(which: keyof typeof LOCAL_KEYS | "all") {
  if (typeof window === "undefined") return;
  for (const [name, key] of Object.entries(LOCAL_KEYS) as Array<
    [keyof typeof LOCAL_KEYS, string]
  >) {
    if (which !== "all" && which !== name) continue;
    window.localStorage.setItem(key, name === "profile" ? "null" : "[]");
  }
  notifyAll();
}
