// Community · collector social feed.
//
// The page shell is static (metadata + copy); the feed itself is a client tree
// because posts live in the browser. Demo posts ship with the build so the page
// is never a blank slate, and every one of them is tagged DEMO.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import CommunityFeed from "@/components/community/CommunityFeed";

export const metadata: Metadata = pageMeta({
  title: "Community — GRIDCARDS",
  description:
    "Collector feed for the 2020 Topps Chrome F1 set: posts, photos of real cards and what collectors are hunting for.",
  path: "/community/",
});

export default function CommunityPage() {
  return (
    <div className="wrap">
      <CommunityFeed />
    </div>
  );
}
