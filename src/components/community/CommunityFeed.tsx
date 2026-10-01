"use client";

// The community feed: composer + posts + a side rail that summarises *this*
// device instead of inventing other collectors.
//
// Everything real here is local. The demo seed stays, clearly tagged, because
// an empty social page on a static export teaches nobody anything — but the
// moment a visitor posts, their own content is what sits on top.

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import Composer from "./Composer";
import PostCard from "./PostCard";
import { useMounted } from "@/lib/browserStore";
import { claimsSnapshot, NO_CLAIMS, subscribeClaims } from "@/lib/claims";
import { avatarCss, SERVER_PROFILE, profileSnapshot, subscribeProfile } from "@/lib/profile";
import {
  DEMO_POSTS,
  feedOrder,
  NO_POSTS,
  postsSnapshot,
  subscribePosts,
  type Post,
} from "@/lib/social";

type Filter = "all" | "mine" | "photos";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "mine", label: "我发布的" },
  { id: "photos", label: "带实拍图" },
];

function topicCounts(posts: Post[]): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.topics) m.set(t, (m.get(t) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

export default function CommunityFeed() {
  const posts = useSyncExternalStore(subscribePosts, postsSnapshot, () => NO_POSTS);
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const profile = useSyncExternalStore(
    subscribeProfile,
    profileSnapshot,
    () => SERVER_PROFILE,
  );
  const mounted = useMounted();
  const [filter, setFilter] = useState<Filter>("all");

  const feed = useMemo(() => feedOrder(posts), [posts]);
  const shown = useMemo(
    () =>
      feed.filter((p) =>
        filter === "mine" ? p.mine : filter === "photos" ? p.images.length > 0 : true,
      ),
    [feed, filter],
  );
  const topics = useMemo(() => topicCounts([...posts, ...DEMO_POSTS]), [posts]);
  const photoCount = posts.reduce((n, p) => n + p.images.length, 0);

  return (
    <div className="communityGrid">
      <main>
        <div className="communityHead">
          <div className="eyebrow">COLLECTOR SOCIAL · LOCAL FIRST</div>
          <h1>Community</h1>
          <p>
            晒卡、开箱、收藏故事、求卡、成交心得都在这里。你发布的内容保存在这台设备的浏览器里（静态站点没有服务器），
            带 <span className="soonTag">DEMO</span> 的条目是随原型附带的演示内容。
          </p>
        </div>

        <Composer />

        <div className="marketTabs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip${filter === f.id ? " active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <em>
                {f.id === "all"
                  ? feed.length
                  : f.id === "mine"
                    ? posts.length
                    : photoCount}
              </em>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: 40 }}>
            <h3 style={{ margin: "0 0 8px" }}>这个筛选下还没有内容</h3>
            <p className="mut" style={{ margin: 0 }}>
              {filter === "mine"
                ? "写下第一条帖子，它会立刻出现在这里。"
                : "还没有带实拍图的帖子。"}
            </p>
          </div>
        ) : (
          shown.map((p) => (
            <PostCard key={p.id} post={p} myHandle={profile.handle} myAvatar={profile.avatar} />
          ))
        )}
      </main>

      <aside>
        <div className="trendBox">
          <h3 className="sideTitle">你在这台设备上</h3>
          <div className="meCard">
            <i className="miniAvatar" style={{ background: avatarCss(profile.avatar) }} aria-hidden />
            <div>
              <b>@{profile.handle}</b>
              <span className="mut">
                {mounted ? `${posts.length} 条帖子 · ${claims.length} 条认领` : "本地身份"}
              </span>
            </div>
          </div>
          <div className="sideActions">
            <Link className="btn" href="/profile/">
              个人中心 →
            </Link>
            <Link className="btn" href="/">
              去认领卡 →
            </Link>
          </div>
        </div>

        <div className="trendBox">
          <h3 className="sideTitle">Trending topics</h3>
          {topics.length === 0 ? (
            <p className="mut">还没有话题 · 在正文里写 #2020Chrome 试试</p>
          ) : (
            topics.map(([t, n]) => (
              <div className="trend" key={t}>
                <b>{t}</b>
                <span>{n} posts</span>
              </div>
            ))
          )}
        </div>

        <div className="collectorBox">
          <h3 className="sideTitle">关于这个功能</h3>
          <p className="mut" style={{ fontSize: 12, lineHeight: 1.7, margin: 0 }}>
            没有账号体系，也没有服务器：帖子、图片、点赞与评论都写进本机浏览器存储。
            这里的内容不会进入市场数据——成交历史只来自已完成的订单。
          </p>
        </div>
      </aside>
    </div>
  );
}
