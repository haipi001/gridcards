// Community · collector social feed — V8 layout.
// Posts below are demo content carried over from the prototype (clearly
// labeled). Real posts arrive with the Social phase (Phase 12).

import Link from "next/link";
import CardVisual from "@/components/CardVisual";
import { slugify } from "@/lib/slug";
import { teamTheme } from "@/lib/teams";

const MERCEDES = teamTheme("Mercedes-AMG Petronas Formula One Team");

const POSTS = [
  {
    user: "@trackside",
    time: "12m",
    text: "Mail day. 终于把 2020 Chrome Hamilton Gold /50 收进来了。比我想象中更偏暖金色，实体在侧光下非常漂亮。",
    card: true,
    title: "Lewis Hamilton · Gold Refractor /50",
    price: "03/50 · PSA 10",
    liked: 128,
    comments: 26,
    player: "Lewis Hamilton",
    avatar: "",
  },
  {
    user: "@serialhunter",
    time: "34m",
    text: "目前在找 #10 Ocon Gold /50 的低编号，01–10/50 都可以。愿意 trade + cash，有线索可以直接 @ 我。",
    liked: 77,
    comments: 18,
    avatar: "linear-gradient(135deg,#ffbf58,#ff6477)",
  },
  {
    user: "@f1vault",
    time: "1h",
    text: "整理了一遍 2020 Topps Chrome 的 Hamilton 卡谱。真正难找的不一定是序号最小的版本，部分 Image Variation 和 Auto 的公开流通量反而更少。",
    card: true,
    title: "Hamilton 2020 Chrome collection",
    price: "18 cards · 7 parallels",
    liked: 241,
    comments: 43,
    player: "Lewis Hamilton",
    avatar: "linear-gradient(135deg,#67de84,#327cff)",
  },
  {
    user: "@boxbreak",
    time: "2h",
    text: "刚拆到一张 Leclerc Refractor。暂时不卖，先放收藏。RuiC viewer 做出来的反光居然和实卡挺接近。",
    liked: 96,
    comments: 12,
    avatar: "",
  },
];

export default function CommunityPage() {
  return (
    <div className="wrap">
      <div className="communityGrid">
        <main>
          <div className="communityHead">
            <div className="eyebrow">COLLECTOR SOCIAL · DEMO CONTENT</div>
            <h1>Community</h1>
            <p>
              这里是收藏者的帖子，不是市场 Activity。晒卡、开箱、收藏故事、求卡、成交心得都在这里。以下为原型演示内容，真实发帖在
              Phase 12 开放。
            </p>
          </div>

          <div className="composer">
            <div className="composerTop">
              <i className="miniAvatar"></i>
              <textarea
                placeholder="Share a card, a collection story, or what you're hunting for..."
                readOnly
              />
            </div>
            <div className="composerFoot">
              <div className="composerTools">
                <button className="tool">＋ Card</button>
                <button className="tool">▧ Photo</button>
                <button className="tool"># Topic</button>
              </div>
              <button className="btn primary" type="button" title="Phase 12">
                Post<i className="soonTag">SOON</i>
              </button>
            </div>
          </div>

          {POSTS.map((p, i) => (
            <article className="post" key={i}>
              <div className="postHead">
                <i
                  className="miniAvatar"
                  style={p.avatar ? { background: p.avatar } : undefined}
                ></i>
                <div className="who">
                  <b>{p.user}</b>
                  <span>{p.time} · demo</span>
                </div>
                <button className="followMini" type="button" title="Phase 12">
                  Follow<i className="soonTag">SOON</i>
                </button>
              </div>
              <div className="postText">{p.text}</div>
              {p.card && (
                <div className="postCard">
                  <div className="postCardVisual">
                    <div
                      className="cardObject"
                      style={
                        { "--c1": "#98702a", "--c2": "#27445e" } as React.CSSProperties
                      }
                    >
                      <span className="cardNo">#1</span>
                      <CardVisual
                        className="cardArt"
                        art="racer"
                        a={MERCEDES.a}
                        b={MERCEDES.b}
                      />
                      <span className="cardName">
                        {(p.player ?? "Lewis Hamilton").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="postCardBody">
                    <div className="eyebrow">SHARED CARD</div>
                    <h3>{p.title}</h3>
                    <div className="mut">2020 Topps Chrome Formula 1</div>
                    <div className="price">{p.price}</div>
                    <Link
                      className="btn"
                      style={{ marginTop: 15 }}
                      href={`/players/${slugify(p.player ?? "Lewis Hamilton")}`}
                    >
                      View player cards
                    </Link>
                  </div>
                </div>
              )}
              <div className="postActions">
                <button type="button">♡ {p.liked}</button>
                <button type="button">◌ {p.comments}</button>
                <button type="button">↗ Share</button>
              </div>
            </article>
          ))}
        </main>

        <aside>
          <div className="trendBox">
            <h3 className="sideTitle">Trending topics</h3>
            {[
              ["#2020Chrome", "328 posts"],
              ["#Hamilton", "251 posts"],
              ["#MailDay", "198 posts"],
              ["#GoldRefractor", "144 posts"],
            ].map((t) => (
              <div className="trend" key={t[0]}>
                <b>{t[0]}</b>
                <span>{t[1]} · demo</span>
              </div>
            ))}
          </div>
          <div className="collectorBox">
            <h3 className="sideTitle">Collectors to follow</h3>
            {[
              ["@trackside", ""],
              ["@f1vault", "linear-gradient(135deg,#ffbe55,#ff596b)"],
              ["@serialhunter", "linear-gradient(135deg,#60e07f,#297dff)"],
            ].map((c) => (
              <div className="collector" key={c[0]}>
                <i
                  className="miniAvatar"
                  style={c[1] ? { background: c[1] } : undefined}
                ></i>
                <b>{c[0]}</b>
                <button className="followMini" type="button" title="Phase 12">
                  Follow<i className="soonTag">SOON</i>
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Community — GRIDCARDS",
  description: "Collector feed for the 2020 Topps Chrome F1 set (demo content).",
  path: "/community/",
});

