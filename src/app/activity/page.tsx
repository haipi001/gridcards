// Activity · market tape.
//
// The tape is fed by market_events. With no server there is no real write path,
// so the sandbox transaction flow (Listing → Order → Ownership → Sale) writes
// into a local event log and those events render here, clearly labeled. No
// fabricated activity is ever shown as real.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import ActivityFeed, { ActivityStats } from "@/components/ActivityFeed";

export const metadata: Metadata = pageMeta({
  title: "Activity — GRIDCARDS",
  description:
    "Market tape: sales, listings, offers, order milestones and ownership transfers.",
  path: "/activity/",
});

export default function ActivityPage() {
  return (
    <div className="wrap">
      <div className="activityHero">
        <div>
          <div className="eyebrow">MARKET TAPE</div>
          <h1>Activity</h1>
          <p>
            市场事实流：Sales、Listings、Offers、Order 里程碑与 Ownership
            transfer。这里不是 Community 帖子，而是可筛选、可审计的交易事件。
          </p>
        </div>
        <ActivityStats />
      </div>

      <ActivityFeed />
    </div>
  );
}
