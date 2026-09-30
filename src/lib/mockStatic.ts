// Build-time reader for the mock dataset.
//
// Only server components (generateMetadata / generateStaticParams) may import
// this — it touches `fs`, which does not exist in the browser bundle. The
// market UI reads the very same files over HTTP at runtime (src/market/api.ts),
// so the HTML metadata and the hydrated page always describe the same record.

import fs from "node:fs";
import path from "node:path";

const MOCK_DIR = path.join(process.cwd(), "public", "mock");

// One file, parsed once: generateMetadata runs per pre-rendered route (300+),
// and re-reading items.json that many times is the difference between a build
// that takes seconds and one that takes minutes.
const cache = new Map<string, unknown>();

export function readMock<T>(name: string): T | null {
  if (cache.has(name)) return (cache.get(name) as T) ?? null;
  let parsed: T | null = null;
  try {
    const raw = fs.readFileSync(path.join(MOCK_DIR, name), "utf8");
    parsed = JSON.parse(raw) as T;
  } catch {
    parsed = null;
  }
  cache.set(name, parsed);
  return parsed;
}
