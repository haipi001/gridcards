"use client";

// Everything the visitor has photographed and kept, read straight from the
// storage adapter. Images resolve from IndexedDB (or signed URLs later) — the
// board never assumes a public path.

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdapter, type UserCardCopy } from "@/lib/storage";
import { activeListing, money, readMarket, subscribeMarket } from "@/lib/marketEngine";
import { serialLabel } from "@/lib/claims";
import { useMounted } from "@/lib/browserStore";

type Row = { copy: UserCardCopy; thumb: string | null; status: string; price: number | null };

export default function MyCopiesBoard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const mounted = useMounted();

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    const sync = async () => {
      const adapter = getAdapter();
      const market = readMarket();
      const next: Row[] = [];
      for (const copy of adapter.copies()) {
        const url = await adapter.resolveUrl(copy.thumbImage ?? copy.frontImage);
        if (url) urls.push(url);
        const listing = copy.serialIndex
          ? activeListing(market, copy.variantId, copy.serialIndex, copy.id)
          : undefined;
        next.push({
          copy,
          thumb: url,
          status: listing ? listing.status : "HELD",
          price: listing ? listing.priceCents : null,
        });
      }
      if (!cancelled) setRows(next);
    };

    void sync();
    const offCopies = getAdapter().subscribeCopies(() => void sync());
    const offMarket = subscribeMarket(() => void sync());
    return () => {
      cancelled = true;
      offCopies();
      offMarket();
      for (const u of urls) getAdapter().releaseUrl(u);
    };
  }, []);

  if (!mounted || rows === null) {
    return <div className="panel">Loading your copies…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="panel emptyWatch">
        <h3>还没有实体卡</h3>
        <p style={{ lineHeight: 1.7, maxWidth: 620 }}>
          在 /sell 上传一张卡的正面（可加反面），填编号、评级与证书号，就能创建一个属于这台设备的
          UserCardCopy。照片存在浏览器 IndexedDB 里，不上传服务器。
        </p>
        <div className="actionRow" style={{ marginTop: 14, maxWidth: 320 }}>
          <Link className="btn primary" href="/sell/">
            创建实体卡 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="copyGrid">
      {rows.map(({ copy, thumb, status, price }) => (
        <article className="copyCard" key={copy.id}>
          <Link href={`/copy/?id=${copy.id}`} className="copyThumb">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={copy.variantId} loading="lazy" />
            ) : (
              <span className="mut">no photo</span>
            )}
          </Link>
          <div className="copyBody">
            <div className="eyebrow">{copy.effectProfile.toUpperCase()}</div>
            <b>{copy.variantId.split(":").slice(1).join(" · ")}</b>
            <span className="mut">
              {copy.serialIndex && copy.serialTotal
                ? serialLabel(copy.serialIndex, copy.serialTotal)
                : `卡号 ${copy.serialNumber}`}
              {copy.gradingCompany ? ` · ${copy.gradingCompany} ${copy.grade ?? ""}` : ""}
            </span>
            <span className={status === "HELD" ? "mut" : "ask"}>
              {status === "HELD" ? "持有中" : `${status}${price ? " · " + money(price) : ""}`}
            </span>
            <Link className="link" href={`/copy/?id=${copy.id}`}>
              Open →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
