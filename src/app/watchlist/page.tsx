import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import WatchlistBoard from "@/components/WatchlistBoard";

export const metadata: Metadata = pageMeta({
  title: "Watchlist — GRIDCARDS",
  description:
    "Your tracked cards, editions, drivers and 1/1s. Stored locally in the browser.",
  path: "/watchlist/",
});

export default function WatchlistPage() {
  return <WatchlistBoard />;
}
