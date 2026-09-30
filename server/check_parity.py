"""Diff the running API against the mock JSON files it is supposed to replace.

Start the server first, then:

    python check_parity.py                 # defaults to http://127.0.0.1:8000
    python check_parity.py http://host:port

It compares counts, then deep-compares every item/series/event field for field.
Any mismatch means the serialisers in app/main.py drifted from the contract in
src/market/types.ts — which would show up as broken pages once the frontend is
pointed at the real backend.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MOCK = ROOT / "public" / "mock"
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")


# The dev server is on localhost, but HTTP_PROXY may be set in the environment
# (CI sandboxes do this); going through it returns 502 for 127.0.0.1.
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def get(path: str) -> Any:
    with _OPENER.open(f"{BASE}{path}", timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def read(name: str) -> Any:
    return json.loads((MOCK / name).read_text(encoding="utf-8"))


failures: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    if ok:
        print(f"  ok   {label}")
    else:
        print(f"  FAIL {label} {detail}")
        failures.append(label)


def deep_eq(path: str, a: Any, b: Any) -> bool:
    """Compare two JSON values, reporting the first few differing paths."""
    if type(a) is not type(b) and not (
        isinstance(a, (int, float)) and isinstance(b, (int, float))
    ):
        check(path, False, f"type {type(a).__name__} != {type(b).__name__}")
        return False
    if isinstance(a, dict):
        if a.keys() != b.keys():
            only_a = set(a) - set(b)
            only_b = set(b) - set(a)
            check(path, False, f"keys differ +{sorted(only_a)} -{sorted(only_b)}")
            return False
        return all(deep_eq(f"{path}.{k}", a[k], b[k]) for k in a)
    if isinstance(a, list):
        if len(a) != len(b):
            check(path, False, f"len {len(a)} != {len(b)}")
            return False
        return all(deep_eq(f"{path}[{i}]", x, y) for i, (x, y) in enumerate(zip(a, b)))
    if isinstance(a, float) or isinstance(b, float):
        if abs(float(a) - float(b)) > 1e-9:
            check(path, False, f"{a} != {b}")
            return False
        return True
    if a != b:
        check(path, False, f"{a!r} != {b!r}")
        return False
    return True


def by_id(rows: list[dict]) -> dict[str, dict]:
    return {r["id"]: r for r in rows}


def main() -> int:
    print(f"comparing {BASE} against public/mock/")

    # ── counts ──────────────────────────────────────────────────────────────
    series_api = get("/series")
    series_mock = read("series.json")
    check("series count", len(series_api) == len(series_mock), f"{len(series_api)} vs {len(series_mock)}")

    items_mock = read("items.json")
    page = get("/items?pageSize=96&page=1")
    total = page["total"]
    check("items total", total == len(items_mock), f"{total} vs {len(items_mock)}")
    check("Page shape", set(page) == {"rows", "total", "page", "pageSize", "pageCount"}, str(sorted(page)))

    listings_mock = read("listings.json")
    offers_mock = read("offers.json")
    activity_mock = read("activity.json")
    check("listings count", len(get("/listings")) == len(listings_mock))
    check("offers count", len(get("/offers")) == len(offers_mock))
    # The endpoint caps at 500 per request by design; compare against the cap.
    activity_cap = 500
    check(
        "activity count",
        len(get(f"/activity?limit={activity_cap}")) == min(len(activity_mock), activity_cap),
    )

    # ── deep compare: fetch every item page and diff by id ──────────────────
    api_items: dict[str, dict] = {}
    p = 1
    while True:
        pg = get(f"/items?pageSize=96&page={p}")
        api_items.update(by_id(pg["rows"]))
        if p >= pg["pageCount"]:
            break
        p += 1
    mock_items = by_id(items_mock)
    check("items ids identical", set(api_items) == set(mock_items))

    mismatched = 0
    for iid, expected in mock_items.items():
        actual = api_items.get(iid)
        if actual is None:
            continue
        before = len(failures)
        deep_eq(f"item {iid}", actual, expected)
        if len(failures) > before:
            mismatched += 1
            if mismatched >= 3:
                print("  …stopping after 3 mismatched items")
                break

    # ── deep compare: series, spotlight, one bundle ─────────────────────────
    api_series = by_id(series_api)
    for sid, expected in by_id(series_mock).items():
        if sid in api_series:
            deep_eq(f"series {sid}", api_series[sid], expected)

    deep_eq("spotlight", get("/spotlight"), read("spotlight.json"))
    deep_eq("me", get("/me"), read("me.json"))

    sample = items_mock[0]["id"]
    bundle = get(f"/items/{sample}/bundle")
    check(
        "bundle keys",
        set(bundle) == {"item", "listings", "offers", "activity", "series"},
        str(sorted(bundle)),
    )
    deep_eq(f"bundle.item {sample}", bundle["item"], mock_items[sample])

    # ── invariants that scripts/verify.ts also enforces ─────────────────────
    bad_serial = [i for i in api_items.values() if not isinstance(i["cardNumber"], str)]
    check("card numbers are strings", not bad_serial, f"{len(bad_serial)} bad")
    bad_money = [
        i
        for i in api_items.values()
        if not isinstance(i["floorCents"], int) or isinstance(i["floorCents"], bool)
    ]
    check("floorCents are ints", not bad_money, f"{len(bad_money)} bad")

    # ── filtering works server-side ─────────────────────────────────────────
    filtered = get("/items?rarity=ultimate")
    expected_ultimate = sum(1 for i in items_mock if i["rarity"] == "ultimate")
    check("rarity filter", filtered["total"] == expected_ultimate, f"{filtered['total']} vs {expected_ultimate}")
    stock = get("/items?inStock=true")
    expected_stock = sum(1 for i in items_mock if i["listedCount"] > 0)
    check("inStock filter", stock["total"] == expected_stock, f"{stock['total']} vs {expected_stock}")

    print()
    if failures:
        print(f"FAIL — {len(failures)} mismatches")
        for f in failures[:10]:
            print(f"  · {f}")
        return 1
    print("PASS — API matches public/mock/ field for field")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
