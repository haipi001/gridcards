"use client";

// My Space — one board over every local store.
//
// The old /profile only watched the watchlist and the serial claims. What the
// visitor actually owns is spread across four stores (claims, copies, posts,
// watchlist) plus the market ledger, and this board is where they meet:
//
//   claims     → what you say you hold, with photo evidence
//   copies     → physical cards photographed through /sell
//   posts      → what you published in Community
//   watchlist  → what you are tracking
//   ledger     → market assets / listings / offers (separate page, linked)
//
// All of it is device-local. The header says so instead of implying an account.

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import ClaimsPanel from "./ClaimsPanel";
import DataPanel from "./DataPanel";
import PostCard from "@/components/community/PostCard";
import MyCopiesBoard from "@/components/MyCopiesBoard";
import WatchlistBoard from "@/components/WatchlistBoard";
import { getAdapter } from "@/lib/storage";
import { useMounted } from "@/lib/browserStore";
import {
  claimsSnapshot,
  NO_CLAIMS,
  subscribeClaims,
  totalOwned,
} from "@/lib/claims";
import {
  avatarCss,
  SERVER_PROFILE,
  profileSnapshot,
  subscribeProfile,
} from "@/lib/profile";
import { feedOrder, NO_POSTS, postsSnapshot, subscribePosts } from "@/lib/social";
import { NO_ENTRIES, subscribeWatch, watchlistSnapshot } from "@/lib/watchlist";

type Tab = "overview" | "claims" | "copies" | "posts" | "watch" | "data";

export default function ProfileBoard({ catalogSize }: { catalogSize: number }) {
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const posts = useSyncExternalStore(subscribePosts, postsSnapshot, () => NO_POSTS);
  const watch = useSyncExternalStore(subscribeWatch, watchlistSnapshot, () => NO_ENTRIES);
  const profile = useSyncExternalStore(
    subscribeProfile,
    profileSnapshot,
    () => SERVER_PROFILE,
  );
  const mounted = useMounted();

  const [tab, setTab] = useState<Tab>("overview");
  const [copies, setCopies] = useState(0);

  useEffect(() => {
    const sync = () => setCopies(getAdapter().copies().length);
    sync();
    return getAdapter().subscribeCopies(sync);
  }, []);

  const serials = claims.reduce((n, c) => n + c.serials.length, 0);
  const photos = claims.reduce((n, c) => n + c.evidence.length, 0);
  const cardClaims = claims.filter((c) => c.scope === "card").length;
  const recent = claims.slice(0, 6);
  const myPosts = feedOrder(posts).filter((p) => p.mine);

  const stats: Array<[string, number | string, string]> = [
    ["SERIALS HELD", serials, "认领的编号"],
    ["CARDS CLAIMED", cardClaims, "整卡认领"],
    ["EVIDENCE PHOTOS", photos, "实拍证据"],
    ["PHYSICAL COPIES", copies, "/sell 上传的实体卡"],
    ["POSTS", posts.length, "社区发帖"],
    ["WATCHING", watch.length, "关注清单"],
  ];

  return (
    <>
      <div className="profileHero">
        <div className="profileMain">
          <i className="profileAvatar profileAvatarPic" style={{ background: avatarCss(profile.avatar) }} aria-hidden />
          <div>
            <h1>@{profile.handle}</h1>
            <p className="mut">
              {profile.bio ||
                "本地预览身份 · 认领、实拍证据、实体卡与帖子都存在这台设备上，不上传服务器。"}
            </p>
            <div className="playerTags">
              <button type="button" className="pill" onClick={() => setTab("data")}>
                编辑身份 →
              </button>
              <Link className="pill" href="/market/me/">
                市场资产 →
              </Link>
              <span className="pill">{catalogSize} records</span>
            </div>
          </div>
        </div>
        <div className="profileStats">
          {stats.map(([label, value]) => (
            <div key={label}>
              <b>{mounted ? value : "—"}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="profileTabs">
        {(
          [
            ["overview", "概览"],
            ["claims", `认领 ${mounted ? claims.length : ""}`],
            ["copies", `实体卡 ${mounted ? copies : ""}`],
            ["posts", `发帖 ${mounted ? posts.length : ""}`],
            ["watch", `关注 ${mounted ? watch.length : ""}`],
            ["data", "身份与数据"],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <h3>收藏进度</h3>
            <p className="mut">
              已认领 {totalOwned()} 个持有单位（编号 + 整卡），对应 {catalogSize} 条官方 checklist
              记录中的 {claims.length} 条；上传的实体卡 {copies} 张。
            </p>
            <div className="profileBar">
              <i
                style={{
                  width: `${Math.min(100, (claims.length / catalogSize) * 100)}%`,
                }}
              />
            </div>
            <p className="mut">
              进度只统计你在本机认领过的记录，不代表这套卡的真实稀缺度或市值。
            </p>
          </div>

          <div className="quickGrid">
            <Link className="quickCard" href="/">
              <b>认领一张卡</b>
              <span>在卡谱里点「认领」，可上传实拍照片作为凭证</span>
            </Link>
            <Link className="quickCard" href="/sell/">
              <b>上传实体卡</b>
              <span>正反面拍照 → 生成 Copy → 可选挂单</span>
            </Link>
            <Link className="quickCard" href="/community/">
              <b>发一条帖子</b>
              <span>晒卡、开箱、求卡，图文都会存在本机</span>
            </Link>
            <Link className="quickCard" href="/market/me/">
              <b>市场资产</b>
              <span>持有、挂单、报价与关注（DEMO 演练）</span>
            </Link>
          </div>

          {recent.length > 0 && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h3>最近的认领</h3>
              <div className="recentList">
                {recent.map((c) => (
                  <Link className="recentRow" href={c.href} key={c.id}>
                    <b>{c.title}</b>
                    <span className="mut">
                      {c.scope === "card" ? "整卡" : `${c.serials.length} 个编号`}
                      {c.evidence.length ? ` · ${c.evidence.length} 张实拍` : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "claims" && <ClaimsPanel />}
      {tab === "copies" && <MyCopiesBoard />}
      {tab === "watch" && <WatchlistBoard />}
      {tab === "data" && <DataPanel />}

      {tab === "posts" && (
        <div>
          {myPosts.length === 0 ? (
            <div className="panel" style={{ textAlign: "center", padding: 40 }}>
              <h3 style={{ margin: "0 0 8px" }}>还没有发帖</h3>
              <p className="mut" style={{ margin: "0 0 16px" }}>
                在 Community 发布的内容会出现在这里，可以删除或补充评论。
              </p>
              <Link className="btn primary" href="/community/">
                去发帖 →
              </Link>
            </div>
          ) : (
            myPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                myHandle={profile.handle}
                myAvatar={profile.avatar}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}
