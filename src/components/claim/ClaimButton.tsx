"use client";

// The claim affordance that sits on every card.
//
// Deliberately dumb: it reads the same store as the profile page, so "claimed"
// lights up everywhere at once, and it opens the dialog that does the real
// work (serial choice + photo evidence). It never writes ownership — the store
// is a personal note, not a transfer.

import { useSyncExternalStore, useState } from "react";
import {
  claimsSnapshot,
  NO_CLAIMS,
  subscribeClaims,
  type ClaimEntry,
} from "@/lib/claims";
import ClaimDialog from "./ClaimDialog";

export default function ClaimButton({
  entry,
  compact,
}: {
  entry: ClaimEntry;
  compact?: boolean;
}) {
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const claim = claims.find((c) => c.id === entry.id);
  const [open, setOpen] = useState(false);

  const scope = entry.scope ?? "edition";
  const held = scope === "card" ? Boolean(claim) : (claim?.serials.length ?? 0) > 0;
  const photos = claim?.evidence.length ?? 0;

  const label = held
    ? compact
      ? `已认领${photos ? ` · ${photos}图` : ""}`
      : `已认领 ✓${photos ? ` · ${photos} 张实拍` : ""}`
    : compact
      ? "认领"
      : entry.run > 1
        ? "认领编号"
        : "认领";

  return (
    <>
      <button
        type="button"
        className={`claimBtn${held ? " on" : ""}${compact ? " compact" : ""}`}
        aria-pressed={held}
        title={
          held
            ? "已在这台设备上认领 · 点击管理编号 / 实拍证据"
            : "标记为“我持有”，可上传实拍照片作为凭证"
        }
        onClick={(e) => {
          // The button often lives next to (or under) a card link.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {label}
      </button>
      {/* Mounted only while open: the checklist renders 300+ of these buttons
          and a dialog behind each would be 300 modals in the DOM. */}
      {open ? <ClaimDialog entry={entry} open onClose={() => setOpen(false)} /> : null}
    </>
  );
}
