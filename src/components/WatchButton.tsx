"use client";

// Watch toggle. Receives a ready-made display snapshot (see lib/watchlist.ts)
// so server components can attach it to any card, edition, player or 1/1.

import { useSyncExternalStore } from "react";
import {
  isWatched,
  subscribeWatch,
  toggleWatch,
  type WatchEntry,
} from "@/lib/watchlist";

export default function WatchButton({
  entry,
  variant = "icon",
  label,
}: {
  entry: WatchEntry;
  variant?: "icon" | "btn";
  label?: string;
}) {
  // The watchlist *is* an external store (localStorage + a custom event), so
  // it is subscribed to directly instead of being mirrored into useState.
  const on = useSyncExternalStore(
    subscribeWatch,
    () => isWatched(entry.id),
    () => false,
  );

  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatch(entry);
  };

  if (variant === "btn") {
    return (
      <button className={`btn watchBtn ${on ? "on" : ""}`} type="button" onClick={click}>
        <span>{on ? "♥" : "♡"}</span>
        {label ?? (on ? "Watching" : "Watch")}
      </button>
    );
  }

  return (
    <button
      className={`heart watchIcon ${on ? "on" : ""}`}
      type="button"
      aria-pressed={on}
      aria-label={`${on ? "Unwatch" : "Watch"} ${entry.title}`}
      title={on ? "Remove from watchlist" : "Add to watchlist"}
      onClick={click}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
