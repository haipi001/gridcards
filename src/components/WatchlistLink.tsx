"use client";

// Topbar watchlist link with a live count badge.

import { useEffect, useState } from "react";
import { readWatchlist, subscribeWatch } from "@/lib/watchlist";

export default function WatchlistLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readWatchlist().length);
    sync();
    return subscribeWatch(sync);
  }, []);

  return (
    <a
      className="iconBtn watchLink"
      href="/watchlist/"
      title="My watchlist"
      aria-label={`My watchlist (${count})`}
    >
      ♡
      {count > 0 && <span className="watchCount">{count}</span>}
    </a>
  );
}
