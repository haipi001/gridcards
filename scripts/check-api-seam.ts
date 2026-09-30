// End-to-end check of the frontend's data seam against a running backend.
//
// The point: src/market/api.ts is the only place that knows where data comes
// from. This script drives that same module with NEXT_PUBLIC_MARKET_API set, so
// it proves the real-API branch works without opening a browser — every
// component would call these exact functions.
//
//   python -m app.seed            # once
//   uvicorn app.main:app          # in server/
//   NEXT_PUBLIC_MARKET_API=http://127.0.0.1:8000 npx tsx scripts/check-api-seam.ts

import { API_BASE, MOCK_MODE } from "../src/market/config";
import {
  getItemBundle,
  getSpotlight,
  listActivity,
  listItems,
  listSeries,
} from "../src/market/api";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  console.log(`API_BASE=${API_BASE}`);
  if (MOCK_MODE) {
    console.error(
      "MOCK_MODE is true — set NEXT_PUBLIC_MARKET_API to a running backend first.",
    );
    process.exit(2);
  }

  const series = await listSeries();
  check("listSeries", series.length > 0, `${series.length} series`);

  const page = await listItems({ page: 1, pageSize: 24 });
  check("listItems paging", page.rows.length === 24 && page.total > 24, `total=${page.total}`);
  check(
    "Page shape",
    ["rows", "total", "page", "pageSize", "pageCount"].every((k) => k in page),
  );

  const filtered = await listItems({ rarity: ["ultimate"] });
  check(
    "server-side rarity filter",
    filtered.rows.every((r) => r.rarity === "ultimate"),
    `${filtered.total} ultimate`,
  );

  const inStock = await listItems({ inStock: true });
  check(
    "server-side inStock filter",
    inStock.rows.every((r) => r.listedCount > 0),
    `${inStock.total} listed`,
  );

  const first = page.rows[0];
  const bundle = await getItemBundle(first.id);
  check("getItemBundle item", bundle.item?.id === first.id);
  check(
    "bundle only returns this item's rows",
    bundle.listings.every((l) => l.itemId === first.id) &&
      bundle.offers.every((o) => o.itemId === first.id),
    `${bundle.listings.length} listings / ${bundle.offers.length} offers`,
  );
  check("bundle series", bundle.series?.id === first.seriesId);

  const activity = await listActivity();
  check("listActivity", activity.length > 0, `${activity.length} events`);

  const spotlight = await getSpotlight();
  check("getSpotlight", Array.isArray(spotlight.hero));

  // Invariants the whole app depends on.
  check(
    "card numbers are strings",
    page.rows.every((r) => typeof r.cardNumber === "string"),
  );
  check(
    "money is integer cents",
    page.rows.every((r) => Number.isInteger(r.floorCents)),
  );

  console.log();
  if (failures) {
    console.log(`FAIL — ${failures} checks failed`);
    process.exit(1);
  }
  console.log("PASS — frontend seam works against the real backend");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
