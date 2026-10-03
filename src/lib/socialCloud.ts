"use client";

// Cloud-backed community feed. Active when NEXT_PUBLIC_BACKEND=cloud. Posts live
// in Postgres (posts / post_likes / post_comments), images in object storage.
// Every signed-in user can read the feed; only the owner can edit/delete their
// own post, like, or comment (enforced by RLS server-side).
//
// Components keep the same `Post` shape; images are carried as `BlobRef` of
// kind "url" so the existing `useBlobUrl` hook renders them unchanged.

import { requireCloud } from "@/lib/cloud";
import {
  DEMO_POSTS,
  NO_POSTS,
  extractTopics,
  feedOrder,
  newPostId,
  timeAgo,
  type Post,
  type PostCardRef,
  type PostComment,
  type PostImage,
} from "@/lib/social";

export type { Post, PostCardRef, PostComment, PostImage } from "@/lib/social";
export { DEMO_POSTS, NO_POSTS, extractTopics, feedOrder, newPostId, timeAgo };

type DbPostRow = {
  id: string;
  owner_id: string;
  author: string;
  text: string;
  images: Array<{ thumbPath: string; fullPath: string }> | null;
  card: PostCardRef | null;
  topics: string[] | null;
  created_at: string;
};

let cache: Post[] = [];
const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let started = false;

function emit() {
  for (const fn of subscribers) fn();
}

async function loadFeed(): Promise<Post[]> {
  const c = requireCloud();
  const { data: sess } = await c.auth.getSession();
  if (!sess) return [];
  const uid = sess.user.id;

  const { data: rows, error } = await c.database
    .from("posts")
    .select("id, owner_id, author, text, images, card, topics, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const postsRows = (rows ?? []) as DbPostRow[];
  const ids = postsRows.map((r) => r.id);

  const { data: myLikes } = await c.database.from("post_likes").select("post_id").eq("user_id", uid);
  const likedSet = new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id));

  const likeCount = new Map<string, number>();
  if (ids.length) {
    const { data: allLikes } = await c.database.from("post_likes").select("post_id").in("post_id", ids);
    for (const l of allLikes ?? []) {
      const id = (l as { post_id: string }).post_id;
      likeCount.set(id, (likeCount.get(id) ?? 0) + 1);
    }
  }

  const comments = new Map<string, PostComment[]>();
  if (ids.length) {
    const { data: cRows } = await c.database
      .from("post_comments")
      .select("id, post_id, owner_id, author, text, created_at")
      .in("post_id", ids)
      .order("created_at", { ascending: true });
    for (const r of cRows ?? []) {
      const row = r as { id: string; post_id: string; author: string; text: string; created_at: string };
      const arr = comments.get(row.post_id) ?? [];
      arr.push({ id: row.id, author: row.author, text: row.text, at: Date.parse(row.created_at) });
      comments.set(row.post_id, arr);
    }
  }

  // Resolve every image path to a short-lived signed URL in one batch.
  const paths: string[] = [];
  postsRows.forEach((r) => {
    for (const im of r.images ?? []) paths.push(im.thumbPath, im.fullPath);
  });
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: sErr } = await c.storage.createSignedUrls(paths, 600);
    if (!sErr && signed) {
      signed.forEach((s, i) => {
        const item = s as { path?: string | null; signedUrl?: string | null; signedURL?: string | null };
        const path = item?.path ?? paths[i];
        const url = item?.signedUrl || item?.signedURL;
        if (path && url) urlByPath.set(path, url);
      });
    }
  }

  return postsRows.map((r) => {
    const images: PostImage[] = (r.images ?? []).map((im) => ({
      thumb: { kind: "url", url: urlByPath.get(im.thumbPath) ?? "" },
      full: { kind: "url", url: urlByPath.get(im.fullPath) ?? "" },
    }));
    return {
      id: r.id,
      author: r.author,
      text: r.text,
      at: Date.parse(r.created_at),
      images,
      card: r.card,
      topics: r.topics ?? [],
      likes: likeCount.get(r.id) ?? 0,
      liked: likedSet.has(r.id),
      comments: comments.get(r.id) ?? [],
      mine: r.owner_id === uid,
    };
  });
}

export async function refresh() {
  try {
    const posts = await loadFeed();
    cache = posts;
    emit();
  } catch (e) {
    // Keep the last good snapshot; only the console sees the failure.
    console.error("[community] feed refresh failed", e);
  }
}

export function postsSnapshot(): Post[] {
  return cache;
}

export function subscribePosts(fn: () => void): () => void {
  subscribers.add(fn);
  if (!started) {
    started = true;
    void refresh();
    timer = setInterval(() => void refresh(), 20000);
  }
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      started = false;
    }
  };
}

export type NewPostInput = {
  id?: string;
  author: string;
  text: string;
  images?: Array<{ thumbPath: string; fullPath: string }>;
  card?: PostCardRef | null;
};

export async function createPost(input: NewPostInput): Promise<Post> {
  const c = requireCloud();
  const { data: sess } = await c.auth.getSession();
  if (!sess) throw new Error("请先登录后再发帖");
  const id = input.id ?? newPostId();
  const { error } = await c.database.from("posts").insert({
    id,
    author: input.author,
    text: input.text.trim(),
    images: input.images ?? [],
    card: input.card ?? null,
    topics: extractTopics(input.text),
    // The SDK's table generics are not inferred from a string table name, so
    // the row is asserted to the shape it expects.
  } as unknown as never[]);
  if (error) throw error;
  await refresh();
  return {
    id,
    author: input.author,
    text: input.text.trim(),
    at: Date.now(),
    // Paths are signed when the feed is read back (see loadFeed), and callers
    // use the refreshed list — handing out unsigned paths here would render
    // broken images.
    images: [],
    card: input.card ?? null,
    topics: extractTopics(input.text),
    likes: 0,
    liked: false,
    comments: [],
    mine: true,
  };
}

export async function toggleLike(postId: string): Promise<void> {
  const c = requireCloud();
  const { data: sess } = await c.auth.getSession();
  if (!sess) throw new Error("请先登录");
  const uid = sess.user.id;
  const liked = cache.find((p) => p.id === postId)?.liked ?? false;
  if (liked) {
    const { error } = await c.database
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", uid);
    if (error) throw error;
  } else {
    const { error } = await c.database.from("post_likes").insert({ post_id: postId, user_id: uid } as unknown as never[]);
    if (error) throw error;
  }
  await refresh();
}

export async function addComment(postId: string, author: string, text: string): Promise<void> {
  const c = requireCloud();
  const { data: sess } = await c.auth.getSession();
  if (!sess) throw new Error("请先登录");
  const { error } = await c.database
    .from("post_comments")
    .insert({ post_id: postId, author, text: text.trim() } as unknown as never[]);
  if (error) throw error;
  await refresh();
}

export async function removeComment(postId: string, commentId: string): Promise<void> {
  const c = requireCloud();
  const { error } = await c.database.from("post_comments").delete().eq("id", commentId);
  if (error) throw error;
  await refresh();
}

export async function removePost(postId: string): Promise<void> {
  const c = requireCloud();
  const { data: row } = await c.database
    .from("posts")
    .select("images")
    .eq("id", postId)
    .maybeSingle();
  const imgs = (row as { images?: Array<{ thumbPath: string; fullPath: string }> } | null)?.images ?? [];
  const paths = imgs.flatMap((im) => [im.thumbPath, im.fullPath]);
  if (paths.length) {
    const { error } = await c.storage.remove(paths);
    if (error) console.error("[community] image cleanup failed", error);
  }
  const { error } = await c.database.from("posts").delete().eq("id", postId);
  if (error) throw error;
  await refresh();
}
