// Cloud upload for community photos. Replaces the local IndexedDB path in
// storeIngested() when NEXT_PUBLIC_BACKEND=cloud. Returns storage *paths* (not
// URLs) — the feed resolves them to short-lived signed URLs at read time.

import { getCloud } from "@/lib/cloud";
import type { IngestResult } from "./ingest";

export type StoredPaths = { fullPath: string; thumbPath: string };

export async function storeIngestedCloud(
  result: IngestResult,
  namespace: string,
): Promise<StoredPaths> {
  const c = getCloud();
  if (!c) throw new Error("云服务未启用");
  const { data: sess } = await c.auth.getSession();
  if (!sess) throw new Error("请先登录后再上传图片");

  const ext = result.type.includes("png") ? "png" : "webp";
  const fullPath = c.storage.sharedPath(sess.user.id, `posts/${namespace}/full.${ext}`);
  const thumbPath = c.storage.sharedPath(sess.user.id, `posts/${namespace}/thumb.${ext}`);

  const [full, thumb] = await Promise.all([
    c.storage.upload(fullPath, result.full, { contentType: result.type }),
    c.storage.upload(thumbPath, result.thumb, { contentType: result.type }),
  ]);

  if (full.error || thumb.error) throw new Error("图片上传失败，请重试");
  return { fullPath, thumbPath };
}
