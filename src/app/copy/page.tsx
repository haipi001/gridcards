"use client";

// One physical copy: /copy/?id=<copyId>
//
// A query parameter, not /copies/[id] — a dynamic segment would need
// generateStaticParams, and copies are created in the browser at runtime, so
// there is nothing to prerender.

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdapter, type UserCardCopy } from "@/lib/storage";
import {
  activeListing,
  cancelListing,
  money,
  readMarket,
  subscribeMarket,
  type Listing,
} from "@/lib/marketEngine";
import { useLocationSearch, useMounted } from "@/lib/browserStore";
import { CardEffectsViewer } from "@/components/card-effects/CardEffectsViewer";
import { serialLabel } from "@/lib/claims";

export default function CopyPage() {
  const mounted = useMounted();
  const search = useLocationSearch();
  const id = new URLSearchParams(search).get("id") ?? "";
  const [copy, setCopy] = useState<UserCardCopy | null | undefined>(undefined);
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const adapter = getAdapter();
    const urls: string[] = [];

    const sync = async () => {
      const found = adapter.copyById(id);
      if (!found) {
        if (!cancelled) setCopy(null);
        return;
      }
      const frontUrl = await adapter.resolveUrl(found.frontImage);
      const backUrl = found.backImage ? await adapter.resolveUrl(found.backImage) : null;
      if (frontUrl) urls.push(frontUrl);
      if (backUrl) urls.push(backUrl);
      if (cancelled) return;
      setCopy(found);
      setFront(frontUrl);
      setBack(backUrl);
      const market = readMarket();
      setListing(
        (found.serialIndex
          ? activeListing(market, found.variantId, found.serialIndex, found.id)
          : undefined) ?? null,
      );
    };

    void sync();
    const offCopies = adapter.subscribeCopies(() => void sync());
    const offMarket = subscribeMarket(() => void sync());
    return () => {
      cancelled = true;
      offCopies();
      offMarket();
      for (const u of urls) adapter.releaseUrl(u);
    };
  }, [id]);

  if (!mounted || copy === undefined) return <div className="wrap panel">Loading copy…</div>;

  if (copy === null) {
    return (
      <div className="wrap">
        <div className="panel emptyWatch">
          <h3>{id ? "找不到这张卡" : "缺少卡 id"}</h3>
          <p className="mut">
            实体卡只存在创建它的那台设备上。换浏览器或清过站点数据后，需要用 /sell 重新创建。
          </p>
          <div className="actionRow" style={{ marginTop: 14, maxWidth: 340 }}>
            <Link className="btn primary" href="/sell/">
              创建实体卡 →
            </Link>
            <Link className="btn" href="/my-copies/">
              我的实体卡
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const delist = () => {
    if (!listing) return;
    const res = cancelListing(listing.id);
    setError(res.ok ? null : res.error);
  };

  return (
    <div className="wrap">
      <div className="breadcrumb">
        <Link href="/my-copies/">My copies</Link>
        {" / "}
        <span>{copy.variantId.split(":").slice(1).join(" · ")}</span>
      </div>

      <div className="serialHero" style={{ marginTop: 12 }}>
        <div className="serialVisual">
          {front ? (
            <CardEffectsViewer
              frontUrl={front}
              backUrl={back}
              effect={copy.effectProfile}
              autoRotate
            />
          ) : (
            <div className="cardFx cardFxLoading" />
          )}
        </div>

        <div className="serialInfo">
          <div className="eyebrow">USER CARD COPY</div>
          <h1>
            {copy.variantId.split(":").slice(1).join(" · ")}
          </h1>
          <p className="mut">
            {copy.serialIndex && copy.serialTotal
              ? `编号 ${serialLabel(copy.serialIndex, copy.serialTotal)}`
              : `卡号 ${copy.serialNumber}`}
            {copy.gradingCompany ? ` · ${copy.gradingCompany} ${copy.grade ?? ""}` : " · 未评级"}
            {copy.certNumber ? ` · cert ${copy.certNumber}` : ""}
          </p>

          <div className="marketMetrics">
            <div className="marketMetric">
              <small>STATUS</small>
              <b>{listing ? listing.status : "HELD"}</b>
            </div>
            <div className="marketMetric">
              <small>ASK</small>
              <b>{listing ? money(listing.priceCents) : "—"}</b>
            </div>
            <div className="marketMetric">
              <small>EFFECT</small>
              <b>{copy.effectProfile}</b>
            </div>
            <div className="marketMetric">
              <small>VERIFIED</small>
              <b>{copy.verificationStatus}</b>
            </div>
          </div>

          {listing ? (
            <div className="actionRow">
              <button className="btn" type="button" onClick={delist}>
                取消挂单
              </button>
            </div>
          ) : (
            <p className="mut" style={{ fontSize: 12 }}>
              这张卡目前在你手里、未挂单。挂单请在 /sell 创建时选择 List for sale，
              或在版本页的编号市场里挂出。
            </p>
          )}
          {error && <div className="uploadError">{error}</div>}

          <p className="mut" style={{ fontSize: 11, marginTop: 14 }}>
            照片仅存于本设备（IndexedDB），EXIF/GPS 已在重编码时剥离；本页所有价格均由你自己填写，
            站点不生成市场报价。
          </p>
        </div>
      </div>
    </div>
  );
}
