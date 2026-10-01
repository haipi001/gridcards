import { describe, it, expect } from "vitest";
import {
  addComment,
  clearPosts,
  createPost,
  DEMO_POSTS,
  extractTopics,
  feedOrder,
  readPosts,
  removeComment,
  removePost,
  timeAgo,
  toggleLike,
} from "@/lib/social";
import { exportLocalData, importLocalData, clearLocalData } from "@/lib/localData";
import { saveProfile, readProfile, DEFAULT_PROFILE } from "@/lib/profile";

describe("social · composing", () => {
  it("pulls hashtags out of the text instead of asking for them", () => {
    expect(extractTopics("mail day #MailDay 收到 #2020Chrome 的 #Hamilton")).toEqual([
      "#MailDay",
      "#2020Chrome",
      "#Hamilton",
    ]);
  });

  it("de-duplicates repeated tags", () => {
    expect(extractTopics("#Hamilton #Hamilton")).toEqual(["#Hamilton"]);
  });

  it("stores a new post at the top of the feed", () => {
    clearPosts();
    const a = createPost({ author: "you", text: "first" });
    const b = createPost({ author: "you", text: "second" });
    expect(readPosts().map((p) => p.id)).toEqual([b.id, a.id]);
    expect(a.mine).toBe(true);
  });

  it("lets the caller pick the id so photo bytes can be filed first", () => {
    clearPosts();
    const p = createPost({ id: "P-test", author: "you", text: "hi" });
    expect(p.id).toBe("P-test");
  });
});

describe("social · interacting", () => {
  it("likes are a local toggle, never a counter that can go negative", () => {
    clearPosts();
    const p = createPost({ author: "you", text: "x" });
    expect(toggleLike(p.id)).toBe(true);
    expect(readPosts()[0].likes).toBe(1);
    expect(toggleLike(p.id)).toBe(false);
    expect(readPosts()[0].likes).toBe(0);
    expect(toggleLike(p.id)).toBe(true);
    expect(toggleLike("missing")).toBe(false);
  });

  it("adds and removes comments", () => {
    clearPosts();
    const p = createPost({ author: "you", text: "x" });
    const c = addComment(p.id, "you", "nice");
    expect(c).not.toBeNull();
    expect(readPosts()[0].comments).toHaveLength(1);
    removeComment(p.id, c!.id);
    expect(readPosts()[0].comments).toHaveLength(0);
  });

  it("deletes a post", () => {
    clearPosts();
    const p = createPost({ author: "you", text: "x" });
    removePost(p.id);
    expect(readPosts()).toEqual([]);
  });

  it("puts real posts above the demo seed", () => {
    clearPosts();
    const p = createPost({ author: "you", text: "mine" });
    const feed = feedOrder(readPosts());
    expect(feed[0].id).toBe(p.id);
    expect(feed[feed.length - 1].demo).toBe(true);
    expect(feed).toHaveLength(DEMO_POSTS.length + 1);
  });

  it("formats relative time", () => {
    const now = 1_700_000_000_000;
    expect(timeAgo(now - 5_000, now)).toBe("5s");
    expect(timeAgo(now - 120_000, now)).toBe("2m");
    expect(timeAgo(now - 7_200_000, now)).toBe("2h");
    expect(timeAgo(now - 172_800_000, now)).toBe("2d");
  });
});

describe("local data · backup and restore", () => {
  it("round-trips everything the visitor owns", () => {
    clearLocalData("all");
    saveProfile({ handle: "collector", bio: "Hamilton only" });
    createPost({ author: "collector", text: "#MailDay" });
    const json = exportLocalData();
    clearLocalData("all");
    expect(readPosts()).toEqual([]);
    expect(readProfile().handle).toBe(DEFAULT_PROFILE.handle);
    const res = importLocalData(json);
    expect(res.ok).toBe(true);
    expect(readPosts()).toHaveLength(1);
    expect(readProfile().handle).toBe("collector");
  });

  it("rejects a file that is not a GRIDCARDS backup", () => {
    expect(importLocalData("{}").ok).toBe(false);
    expect(importLocalData("not json").ok).toBe(false);
    expect(importLocalData(JSON.stringify({ app: "other", data: {} })).ok).toBe(false);
  });
});
