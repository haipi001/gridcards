// Turning an ingested photo into two stored blobs and a pointer to them.
//
// Order matters: the bytes are written FIRST, the metadata pointer SECOND.
// A failed encode then leaves an orphan blob (invisible, harmless) instead of
// a dangling BlobRef (a permanently empty frame in the UI). The market
// `mutate()` rule — "write image bytes after the commit" — is about the
// synchronous market transaction and is unaffected: these stores are not part
// of it.

import { getAdapter } from "@/lib/storage";
import { idbDelete } from "@/lib/storage/idb";
import type { BlobRef } from "@/lib/storage/types";
import type { IngestResult } from "./ingest";

export type StoredPhoto = { full: BlobRef; thumb: BlobRef };

export async function storeIngested(
  result: IngestResult,
  namespace: string,
): Promise<StoredPhoto> {
  const adapter = getAdapter();
  const [full, thumb] = await Promise.all([
    adapter.putImage(result.full, namespace, "full"),
    adapter.putImage(result.thumb, namespace, "thumb"),
  ]);
  return { full, thumb };
}

/** Best-effort cleanup: the local adapter keeps bytes in IndexedDB. */
export async function dropStored(namespace: string): Promise<void> {
  const adapter = getAdapter();
  if (adapter.id !== "local") return;
  await Promise.all([
    idbDelete(`${namespace}:full`),
    idbDelete(`${namespace}:thumb`),
  ]);
}
