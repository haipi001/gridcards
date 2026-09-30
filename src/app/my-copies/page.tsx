// My physical copies.
//
// Static export: the shell is prerendered and the board fills in from the
// storage adapter after hydration, which is why the empty state is part of the
// HTML rather than a spinner that never resolves.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import MyCopiesBoard from "@/components/MyCopiesBoard";

export const metadata: Metadata = pageMeta({
  title: "My copies — GRIDCARDS",
  description: "Physical card copies created on this device: serials, grades and listing status.",
  path: "/my-copies/",
});

export default function MyCopiesPage() {
  return (
    <div className="wrap">
      <div className="sectionTitle">
        <div>
          <div className="eyebrow">MY COPIES</div>
          <h1>我创建的实体卡</h1>
          <p className="mut">
            每张 UserCardCopy 对应一张真实的实体卡：编号、评级、证书号与正反面照片。
            照片存在这台设备的 IndexedDB 中，EXIF/GPS 已剥离，不出设备、不进 Git。
          </p>
        </div>
        <Link className="btn primary" href="/sell/">
          + 创建实体卡
        </Link>
      </div>
      <MyCopiesBoard />
    </div>
  );
}
