// My Space · Profile — V8 layout.
// Auth (Phase 0 remainder) and Collection (Phase 11) are not live yet, so the
// portfolio honestly shows an empty state. Everything that IS real — the local
// watchlist and the serials the visitor claimed — is rendered from the browser
// stores instead of prototype demo numbers.
//
// Statically exported: catalog size comes from the checklist data.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { getCatalogSize } from "@/lib/catalog";
import MySpaceBoard, { MyStats } from "@/components/MySpace";

export const metadata: Metadata = pageMeta({
  title: "My Space — GRIDCARDS",
  description:
    "Your local watchlist, claimed serials and portfolio progress for the 2020 Topps Chrome F1 checklist.",
  path: "/profile/",
});

export default function ProfilePage() {
  // Only real number available server-side: catalog size for completion math.
  const catalogSize = getCatalogSize();

  return (
    <div className="wrap">
      <div className="profileHero">
        <div className="profileMain">
          <div className="profileAvatar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
          </div>
          <div>
            <h1>My Space</h1>
            <p className="mut">
              登录体系（Auth）将在 Phase 0 收尾接入，当前为本地预览身份：关注清单与编号认领都存在这台设备上。
            </p>
            <div className="playerTags">
              <Link className="pill" href="/watchlist/">
                Watchlist →
              </Link>
              <span className="pill">2020 Chrome</span>
              <span className="pill">{catalogSize} records</span>
            </div>
          </div>
        </div>
        <MyStats catalogSize={catalogSize} />
      </div>

      <MySpaceBoard catalogSize={catalogSize} />
    </div>
  );
}
