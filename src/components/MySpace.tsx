"use client";

// My Space · the parts that are actually real today.
// There is no account server, so everything here reads the same local stores
// the watchlist and serial claims write to: what the visitor watches and which
// serials they say they hold. Upload-driven portfolio stays an honest empty
// state until the seller flow exists.

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readWatchlist,
  subscribeWatch,
  type WatchEntry,
} from "@/lib/watchlist";
import {
  readClaims,
  serialLabel,
  subscribeClaims,
  type Claim,
} from "@/lib/claims";

export function MyStats({ catalogSize }: { catalogSize: number }) {
  const [watched, setWatched] = useState(0);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    const sync = () => {
      setWatched(readWatchlist().length);
      setClaims(readClaims());
    };
    sync();
    const a = subscribeWatch(sync);
    const b = subscribeClaims(sync);
    return () => {
      a();
      b();
    };
  }, []);

  const held = claims.reduce((s, c) => s + c.serials.length, 0);

  return (
    <div className="profileStats">
      <div>
        <b>{watched}</b>
        <span>WATCHING</span>
      </div>
      <div>
        <b>{held}</b>
        <span>SERIALS HELD</span>
      </div>
      <div>
        <b>{claims.length}</b>
        <span>EDITIONS</span>
      </div>
      <div>
        <b>—</b>
        <span>PORTFOLIO · {catalogSize} RECORDS</span>
      </div>
    </div>
  );
}

export default function MySpaceBoard({
  catalogSize,
}: {
  catalogSize: number;
}) {
  const [watch, setWatch] = useState<WatchEntry[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setWatch(readWatchlist());
      setClaims(readClaims());
      setLoaded(true);
    };
    sync();
    const a = subscribeWatch(sync);
    const b = subscribeClaims(sync);
    return () => {
      a();
      b();
    };
  }, []);

  const held = claims.reduce((s, c) => s + c.serials.length, 0);

  return (
    <>
      <div className="profileTabs">
        <button className="active">Portfolio</button>
        <Link href="/watchlist/">Watchlist</Link>
        <Link href="/my-copies/">My copies</Link>
        <button type="button">
          For sale<i className="soonTag">SOON</i>
        </button>
        <button type="button">
          Sales<i className="soonTag">SOON</i>
        </button>
      </div>

      {claims.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>我持有的编号 · {held}</h3>
          <p style={{ margin: "4px 0 12px" }}>
            来自本机的认领记录，按版本汇总。
          </p>
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
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ textAlign: "center", padding: 48 }}>
        <div className="eyebrow">
          PORTFOLIO · {loaded ? watch.length + held : 0} LOCAL ITEMS /{" "}
          {catalogSize} CATALOG RECORDS
        </div>
        <h3 style={{ marginTop: 8 }}>
          {loaded && (watch.length > 0 || held > 0)
            ? "已有关注与认领，上传流程待接入"
            : "收藏册还是空的"}
        </h3>
        <p
          className="mut"
          style={{ maxWidth: 520, margin: "8px auto 0", lineHeight: 1.7 }}
        >
          卖家上传流程（Phase 6）上线后，你上传的每一张实体卡都会进入这里，并自动计算
          2020 Topps Chrome F1（{catalogSize} 条官方记录）的收藏完成度。当前能看到的是本机的关注清单与已认领编号。
        </p>
        <div
          className="row"
          style={{ justifyContent: "center", gap: 8, marginTop: 18 }}
        >
          <Link className="btn primary" href="/">
            Browse market →
          </Link>
          <Link className="btn" href="/watchlist/">
            My watchlist →
          </Link>
        </div>
      </div>
    </>
  );
}
