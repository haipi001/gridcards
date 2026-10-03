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
import AuthModal from "./AuthModal";
import { useMounted } from "@/lib/browserStore";
import { claimsSnapshot, NO_CLAIMS, subscribeClaims } from "@/lib/claims";
import { avatarCss, SERVER_PROFILE, profileSnapshot, subscribeProfile } from "@/lib/profile";
import { useSession } from "@/lib/auth";
import { openAuthModal } from "@/lib/authModal";
import { CLOUD, CLOUD_ORIGIN, STORAGE_NOTE } from "@/lib/backend";
import { DEMO_POSTS, feedOrder, NO_POSTS, type Post } from "@/lib/social";
import * as localStore from "@/lib/social";
import * as cloudStore from "@/lib/socialCloud";

/** Same shape, two backends. Local is the default, cloud is opt-in. */
const store = CLOUD ? cloudStore : localStore;

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
  const posts = useSyncExternalStore(
    store.subscribePosts,
    store.postsSnapshot,
    () => NO_POSTS,
  );
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const profile = useSyncExternalStore(
    subscribeProfile,
    profileSnapshot,
    () => SERVER_PROFILE,
  );
  const { user, loading } = useSession();
  const mounted = useMounted();
  const [filter, setFilter] = useState<Filter>("all");

  // Cloud auth is bound to an exact Origin, so it only works on the app's own
  // release domain. Say so instead of letting a login click fail silently.
  const onReleaseDomain =
    mounted && typeof window !== "undefined" && window.location.origin === CLOUD_ORIGIN;

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
          <div className="eyebrow">
            COLLECTOR SOCIAL · {CLOUD ? "云端共享" : "LOCAL FIRST"}
          </div>
          <h1>Community</h1>
          <p>
            晒卡、开箱、收藏故事、求卡、成交心得都在这里。{STORAGE_NOTE}
            带 <span className="soonTag">DEMO</span> 的条目是随原型附带的演示内容。
          </p>
        </div>

        {CLOUD && !onReleaseDomain ? (
          <div className="panel" style={{ padding: 20 }}>
            <b style={{ fontSize: 14 }}>当前地址不是正式域名，云端登录不可用</b>
            <p className="mut" style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.7 }}>
              云端账号按访问域名做校验，只有在{" "}
              <a href={`${CLOUD_ORIGIN}/community/`} style={{ textDecoration: "underline" }}>
                {CLOUD_ORIGIN}
              </a>{" "}
              打开时才能登录、发帖和上传图片（本地预览与 127.0.0.1 不可用）。下面的演示内容可以正常浏览。
            </p>
          </div>
        ) : null}

        {/* Local mode is always writable — a login gate here would make the
            whole page look broken to anyone who has not signed in. */}
        {!CLOUD ? (
          <Composer />
        ) : loading ? (
          <div className="panel" style={{ padding: 28, textAlign: "center" }}>
            <span className="mut">正在检查登录状态…</span>
          </div>
        ) : user ? (
          <Composer />
        ) : (
          <div className="panel" style={{ padding: 28, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px" }}>登录后即可发帖、上传实拍图</h3>
            <p className="mut" style={{ margin: "0 0 14px" }}>
              内容会保存到云端，所有人登录后都能看到。注册只需邮箱 + 验证码。
            </p>
            <button className="btn primary" onClick={openAuthModal}>
              登录 / 注册
            </button>
          </div>
        )}

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
          <h3 className="sideTitle">{CLOUD ? "你的账号" : "你在这台设备上"}</h3>
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
            {STORAGE_NOTE}
            这里的内容不会进入市场数据——成交历史只来自已完成的订单。
          </p>
        </div>
      </aside>

      {CLOUD ? <AuthModal /> : null}
    </div>
  );
}
