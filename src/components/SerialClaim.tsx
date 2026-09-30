"use client";

// Serial claiming UI. Three pieces that all read the same localStorage store:
//   OwnedMeter  — "you own 2 / 5" progress bar for one edition
//   SerialToggle — the per-row claim button in the serial table
//   SerialMap    — the /run dot grid; tap a dot to claim or release it
//
// Nothing here is a market claim: it never invents a grade, owner or price.
// It only records what the visitor says they physically hold.

import { useEffect, useState } from "react";
import {
  ownedSerials,
  serialLabel,
  subscribeClaims,
  toggleSerial,
  type ClaimEntry,
} from "@/lib/claims";

function useOwned(entry: ClaimEntry) {
  const [owned, setOwned] = useState<number[]>([]);
  useEffect(() => {
    const sync = () => setOwned(ownedSerials(entry.id));
    sync();
    return subscribeClaims(sync);
  }, [entry.id]);
  return [owned, setOwned] as const;
}

export function OwnedMeter({ entry }: { entry: ClaimEntry }) {
  const [owned, setOwned] = useOwned(entry);
  const pct = Math.round((owned.length / entry.run) * 100);

  return (
    <div className="ownedMeter">
      <div className="ownedHead">
        <small>YOU OWN</small>
        <b>
          {owned.length} / {entry.run}
        </b>
        <span className="mut">{pct}% of the print run</span>
      </div>
      <div className="ownedBar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="mut">
        {owned.length === 0
          ? "点下方 Serial map 里任意编号即可标记为“我持有”——只存在这台设备，不上传。"
          : owned.length === entry.run
            ? "整版已认领：你持有这一版的全部编号。"
            : `已认领 ${owned.map((n) => serialLabel(n, entry.run)).join(" · ")}`}
      </p>
      <button
        className="claimBtn"
        type="button"
        onClick={() => {
          for (const n of owned) toggleSerial(entry, n);
          setOwned([]);
        }}
        disabled={owned.length === 0}
      >
        Release all
      </button>
    </div>
  );
}

export function SerialToggle({ entry, n }: { entry: ClaimEntry; n: number }) {
  const [owned, setOwned] = useOwned(entry);
  const on = owned.includes(n);

  return (
    <button
      className={`claimBtn ${on ? "on" : ""}`}
      type="button"
      aria-pressed={on}
      onClick={() => setOwned(toggleSerial(entry, n))}
    >
      {on ? "Mine ✓" : "Claim"}
    </button>
  );
}

export function SerialMap({ entry }: { entry: ClaimEntry }) {
  const [owned, setOwned] = useOwned(entry);

  return (
    <div className="serialMap">
      {Array.from({ length: entry.run }, (_, i) => i + 1).map((n) => {
        const on = owned.includes(n);
        return (
          <button
            className={`serialDot ${on ? "owned" : ""}`}
            key={n}
            type="button"
            title={`${serialLabel(n, entry.run)} · ${on ? "you hold this copy" : "tap to claim"}`}
            onClick={() => setOwned(toggleSerial(entry, n))}
          >
            {serialLabel(n, entry.run).split("/")[0]}
          </button>
        );
      })}
    </div>
  );
}
