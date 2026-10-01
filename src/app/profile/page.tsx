// My Space · Profile.
//
// Statically exported: the only server-known number is the checklist size.
// Everything personal is read from the browser stores, so the board itself is
// a client tree and the prerendered shell shows "—" until hydration.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getCatalogSize } from "@/lib/catalog";
import ProfileBoard from "@/components/profile/ProfileBoard";

export const metadata: Metadata = pageMeta({
  title: "My Space — GRIDCARDS",
  description:
    "Your local claims, photo evidence, physical copies, posts and watchlist for the 2020 Topps Chrome F1 checklist.",
  path: "/profile/",
  noindex: true,
});

export default function ProfilePage() {
  const catalogSize = getCatalogSize();
  return (
    <div className="wrap">
      <ProfileBoard catalogSize={catalogSize} />
    </div>
  );
}
