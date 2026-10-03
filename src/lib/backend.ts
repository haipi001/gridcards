// One switch decides whether the social layer talks to WorkBuddy Cloud or to
// this browser.
//
// Why both conditions:
//   `cloudEnabled`   — credentials exist (NEXT_PUBLIC_CLOUD_ENDPOINT / _KEY).
//   NEXT_PUBLIC_BACKEND=cloud — the operator actually switched the module over.
//
// Checking only the first was the bug that made /community a dead page: with
// credentials present but the module not switched (or the visitor simply not
// signed in), every write path led to a login gate and every read path returned
// an empty feed. LOCAL IS THE FALLBACK, NOT AN ERROR STATE — a visitor who has
// not signed in must still be able to post, like and comment on their device.
//
// `process.env.NEXT_PUBLIC_*` is inlined at build time, so this is a constant:
// identical during prerender and after hydration. Never read a non-NEXT_PUBLIC
// var here — it would be undefined in the browser and cause a hydration mismatch.

import { cloudEnabled } from "./cloud";

export const CLOUD = cloudEnabled && process.env.NEXT_PUBLIC_BACKEND === "cloud";

/**
 * The app's own release domain, i.e. the origin the cloud gateway will accept.
 *
 * Web auth is bound to an exact Origin, so sign-in only works when the page is
 * served from this host. Opening the same export from a file server, a preview
 * iframe or `localhost` reaches the gateway and is rejected — which reads to a
 * visitor as "everything is broken". The community page compares against this
 * to say so out loud instead of failing silently.
 */
export const CLOUD_ORIGIN = process.env.NEXT_PUBLIC_CLOUD_ENDPOINT ?? "";

/** Copy helper: the two backends make different promises to the visitor. */
export const STORAGE_NOTE = CLOUD
  ? "帖子、图片与评论保存在云端，登录用户都能看到。"
  : "帖子、图片与评论保存在这台设备的浏览器里（静态站点没有服务器），换设备或清缓存就看不到了。";
