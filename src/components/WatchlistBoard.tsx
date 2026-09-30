"use client";

// The watchlist board. All state is local to the browser, so it is read
// through useSyncExternalStore — the prerendered shell stays empty and
// deterministic, and the real list appears immediately after hydration.

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import CardVisual from "@/components/CardVisual";
import { useMounted } from "@/lib/browserStore";
import {
  clearWatchlist,
  NO_ENTRIES,
  removeWatch,
  subscribeWatch,
  watchlistSnapshot,
  type WatchKind,
} from "@/lib/watchlist";
import {
  clearClaims,
  claimsSnapshot,
  NO_CLAIMS,
  serialLabel,
  subscribeClaims,
  toggleSerial,
} from "@/lib/claims";

const KIND_LABEL: Record<WatchKind, string> = {
  card: "CHECKLIST CARD",
  edition: "EDITION",
  player: "PLAYER",
  archive: "1/1 ARCHIVE",
};

const ORDER: WatchKind[] = ["archive", "edition", "card", "player"];

export default function WatchlistBoard() {
  const items = useSyncExternalStore(subscribeWatch, watchlistSnapshot, () => NO_ENTRIES);
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const loaded = useMounted();

  const ownedTotal = claims.reduce((sum, c) => sum + c.serials.length, 0);

  const grouped = useMemo(() => {
    return ORDER.map((kind) => ({
      kind,
      rows: items.filter((x) => x.kind === kind),
    })).filter((g) => g.rows.length > 0);
  }, [items]);

  const driverCount = useMemo(
    () => new Set(items.map((x) => x.subtitle)).size,
    [items],
  );

  return (
    <div className="wrap">
      <div className="collectionsHero">
        <div>
          <div className="eyebrow">MY WATCHLIST</div>
          <h1>Watching {loaded ? items.length : 0}</h1>
          <p>
            关注的卡、版本、车手与 1/1 都会存在这台设备的浏览器里（localStorage），
            不上传服务器；清空浏览器数据会一并清空清单。
          </p>
        </div>
        <div
          className="indexStats"
          style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}
        >
          <div className="statTile">
            <small>ITEMS</small>
            <b>{loaded ? items.length : 0}</b>
            <span className="mut">tracked</span>
          </div>
          <div className="statTile">
            <small>DRIVERS</small>
            <b>{loaded ? driverCount : 0}</b>
            <span className="mut">distinct names</span>
          </div>
          <div className="statTile">
            <small>SERIALS HELD</small>
            <b>{ownedTotal}</b>
            <span className="mut">{claims.length} editions</span>
          </div>
          <div className="statTile">
            <small>STORAGE</small>
            <b>LOCAL</b>
            <span className="mut">this browser only</span>
          </div>
        </div>
      </div>

      {loaded && items.length > 0 && (
        <div className="dataToolbar">
          <Link className="btn" href="/">
            Browse market →
          </Link>
          <Link className="btn" href="/archive/">
            1/1 Archive →
          </Link>
          <button
            className="btn"
            type="button"
            onClick={() => {
              if (window.confirm("清空整个关注清单？此操作不可撤销。")) clearWatchlist();
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {claims.length > 0 && (
        <section>
          <div className="sectionTitle" style={{ margin: "26px 0 12px" }}>
            <div>
              <div className="eyebrow">MY SERIALS</div>
              <h2>我持有的编号 · {ownedTotal}</h2>
              <p>在版本页点 Serial map 上的编号即可认领；这里汇总全部已认领的实体编号。</p>
            </div>
            <button className="btn" type="button" onClick={() => clearClaims()}>
              Release all
            </button>
          </div>
          <div className="claimGrid">
            {claims.map((c) => (
              <article className="claimItem" key={c.id}>
                <b>{c.title}</b>
                <span className="mut">
                  {c.player} · {c.serials.length}/{c.run} held
                </span>
                <div className="serialChips">
                  {c.serials.map((n) => (
                    <span className="serialChip" key={n}>
                      {serialLabel(n, c.run)}
                    </span>
                  ))}
                </div>
                <div className="watchFoot">
                  <Link className="link" href={c.href}>
                    Open edition →
                  </Link>
                  <button
                    type="button"
                    onClick={() => c.serials.forEach((n) => toggleSerial(c, n))}
                  >
                    Release
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loaded ? (
        <div className="panel">
          <h3>Loading watchlist…</h3>
        </div>
      ) : items.length === 0 ? (
        <div className="panel emptyWatch">
          <h3>清单还是空的</h3>
          <p style={{ lineHeight: 1.7, maxWidth: 620 }}>
            在市场页、车手页、版本页或 1/1 Archive 上点右上角的 ♡
            即可加入关注；顶栏 ♡
            上的数字会实时更新。清单只在当前浏览器保存，不需要登录。
          </p>
          <div className="actionRow" style={{ marginTop: 14, maxWidth: 420 }}>
            <Link className="btn primary" href="/">
              Go to market
            </Link>
            <Link className="btn" href="/archive/">
              Browse 1/1s
            </Link>
          </div>
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.kind} style={{ marginBottom: 30 }}>
            <div className="sectionTitle" style={{ margin: "26px 0 12px" }}>
              <div>
                <div className="eyebrow">{KIND_LABEL[group.kind]}</div>
                <h2>
                  {group.rows.length} item{group.rows.length === 1 ? "" : "s"}
                </h2>
              </div>
            </div>
            <div className="watchGrid">
              {group.rows.map((item) => (
                <article className="watchItem" key={item.id}>
                  <Link href={item.href} className="watchVisual">
                    {item.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.img} alt={item.title} loading="lazy" />
                    ) : (
                      <CardVisual className="cardArtFlat" art={item.art} a={item.a} b={item.b} />
                    )}
                  </Link>
                  <div className="watchBody">
                    <div className="eyebrow">{KIND_LABEL[item.kind]}</div>
                    <b>{item.title}</b>
                    <span className="mut">{item.subtitle}</span>
                    <span className="watchMeta">{item.meta}</span>
                    <div className="watchFoot">
                      <Link className="link" href={item.href}>
                        Open →
                      </Link>
                      <button type="button" onClick={() => removeWatch(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
