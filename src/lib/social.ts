// Collector social feed — posts, likes and comments, all local to this device.
//
// There is no server, so a post is visible only on the browser that wrote it.
// The page says so out loud; pretending otherwise would be a lie about what
// the static export can do.
//
// ⚠️ MARKET BOUNDARY (DEV_AGENTS.md): nothing here feeds the market. A post
// never creates a listing, a price, a sale or an ownership record. Sale history
// comes from `market_events` / completed orders only.

import type { BlobRef } from "@/lib/storage/types";

export type PostImage = { thumb: BlobRef; full: BlobRef };

export type PostCardRef = {
  title: string;
  subtitle: string;
  href: string;
};

export type PostComment = {
  id: string;
  author: string;
  text: string;
  at: number;
};

export type Post = {
  id: string;
  /** Handle without "@". */
  author: string;
  text: string;
  at: number;
  images: PostImage[];
  card: PostCardRef | null;
  topics: string[];
  likes: number;
  liked: boolean;
  comments: PostComment[];
  /** Written in this browser — deletable, editable note. */
  mine: boolean;
  /** Seeded demo content carried from the prototype. */
  demo?: boolean;
  /** Demo posts keep their baked relative label; real posts compute one. */
  timeLabel?: string;
  /** CSS gradient for demo avatars; own posts use the current profile avatar. */
  avatar?: string;
};

const KEY = "gridcards:posts:v1";
export const POST_EVENT = "gridcards:post";
const EVENT = POST_EVENT;

/**
 * Demo posts sit below every real post. Their `at` is a small constant, and
 * real posts use `Date.now()` — so the ordering is stable and needs no clock
 * maths during prerender.
 */
const DEMO_BASE = 1000;

export const DEMO_POSTS: Post[] = [
  {
    id: "demo-1",
    author: "trackside",
    text: "Mail day. 终于把 2020 Chrome Hamilton Gold /50 收进来了。比我想象中更偏暖金色，实体在侧光下非常漂亮。",
    at: DEMO_BASE - 1,
    images: [],
    card: {
      title: "Lewis Hamilton · Gold Refractor /50",
      subtitle: "2020 Topps Chrome Formula 1 · 03/50 · PSA 10",
      href: "/players/lewis-hamilton/",
    },
    topics: ["#MailDay", "#Hamilton"],
    likes: 128,
    liked: false,
    comments: [],
    mine: false,
    demo: true,
    timeLabel: "12m",
  },
  {
    id: "demo-2",
    author: "serialhunter",
    text: "目前在找 #10 Ocon Gold /50 的低编号，01–10/50 都可以。愿意 trade + cash，有线索可以直接 @ 我。",
    at: DEMO_BASE - 2,
    images: [],
    card: null,
    topics: ["#GoldRefractor"],
    likes: 77,
    liked: false,
    comments: [],
    mine: false,
    demo: true,
    timeLabel: "34m",
    avatar: "linear-gradient(135deg,#ffbf58,#ff6477)",
  },
  {
    id: "demo-3",
    author: "f1vault",
    text: "整理了一遍 2020 Topps Chrome 的 Hamilton 卡谱。真正难找的不一定是序号最小的版本，部分 Image Variation 和 Auto 的公开流通量反而更少。",
    at: DEMO_BASE - 3,
    images: [],
    card: {
      title: "Hamilton 2020 Chrome collection",
      subtitle: "18 cards · 7 parallels",
      href: "/players/lewis-hamilton/",
    },
    topics: ["#2020Chrome", "#Hamilton"],
    likes: 241,
    liked: false,
    comments: [],
    mine: false,
    demo: true,
    timeLabel: "1h",
    avatar: "linear-gradient(135deg,#67de84,#327cff)",
  },
  {
    id: "demo-4",
    author: "boxbreak",
    text: "刚拆到一张 Leclerc Refractor。暂时不卖，先放收藏。RuiC viewer 做出来的反光居然和实卡挺接近。",
    at: DEMO_BASE - 4,
    images: [],
    card: null,
    topics: ["#2020Chrome"],
    likes: 96,
    liked: false,
    comments: [],
    mine: false,
    demo: true,
    timeLabel: "2h",
  },
];

function safeParse(raw: string | null): Post[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Post[]) : [];
  } catch {
    return [];
  }
}

/** Real posts only — never the demo seed. */
export function readPosts(): Post[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export const NO_POSTS: Post[] = [];

let cachedRaw: string | null | undefined;
let cachedList: Post[] = NO_POSTS;

export function postsSnapshot(): Post[] {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = safeParse(raw);
  }
  return cachedList;
}

function writePosts(list: Post[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

/** "#MailDay" and "#2020Chrome" — hashtags are extracted, not hand-typed. */
export function extractTopics(text: string): string[] {
  const found = text.match(/#[\p{L}\p{N}_]{2,24}/gu) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of found) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    if (out.length >= 6) break;
  }
  return out;
}

export type NewPost = {
  /** Generated up front so the photo bytes can be filed under the post id. */
  id?: string;
  author: string;
  text: string;
  images?: PostImage[];
  card?: PostCardRef | null;
};

export function newPostId(): string {
  return `P-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createPost(input: NewPost): Post {
  const post: Post = {
    id: input.id ?? newPostId(),
    author: input.author,
    text: input.text.trim(),
    at: Date.now(),
    images: input.images ?? [],
    card: input.card ?? null,
    topics: extractTopics(input.text),
    likes: 0,
    liked: false,
    comments: [],
    mine: true,
  };
  writePosts([post, ...readPosts()]);
  return post;
}

export function toggleLike(id: string): boolean {
  const list = readPosts();
  const at = list.findIndex((p) => p.id === id);
  if (at < 0) return false;
  const p = list[at];
  const liked = !p.liked;
  list[at] = { ...p, liked, likes: Math.max(0, p.likes + (liked ? 1 : -1)) };
  writePosts(list);
  return liked;
}

export function addComment(id: string, author: string, text: string): PostComment | null {
  const list = readPosts();
  const at = list.findIndex((p) => p.id === id);
  if (at < 0) return null;
  const comment: PostComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author,
    text: text.trim(),
    at: Date.now(),
  };
  list[at] = { ...list[at], comments: [...list[at].comments, comment] };
  writePosts(list);
  return comment;
}

export function removeComment(id: string, commentId: string) {
  const list = readPosts();
  const at = list.findIndex((p) => p.id === id);
  if (at < 0) return;
  list[at] = {
    ...list[at],
    comments: list[at].comments.filter((c) => c.id !== commentId),
  };
  writePosts(list);
}

export function removePost(id: string) {
  writePosts(readPosts().filter((p) => p.id !== id));
}

export function clearPosts() {
  window.localStorage.setItem(KEY, "[]");
  window.dispatchEvent(new Event(EVENT));
}

export function subscribePosts(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

/** Newest real post first; the demo seed always trails behind. */
export function feedOrder(posts: Post[]): Post[] {
  return [...posts, ...DEMO_POSTS].sort((a, b) => b.at - a.at);
}

export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(at).toISOString().slice(0, 10);
}
