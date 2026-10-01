"use client";

// BlobRef → a usable <img src>. The bytes live in IndexedDB (or behind a signed
// URL on the cloud adapter), so every render needs an async resolve — and every
// resolved object URL must be revoked again or the blob is pinned forever.
//
// The hook returns null until the resolve lands, and falls straight back to
// null when the ref disappears, so nothing has to setState synchronously on
// mount (react-hooks/set-state-in-effect).

import { useEffect, useState } from "react";
import { getAdapter } from "@/lib/storage";
import type { BlobRef } from "@/lib/storage/types";

/** Stable identity of a ref — two equal refs must not re-resolve. */
function refKey(ref: BlobRef | null | undefined): string | null {
  if (!ref) return null;
  return ref.kind === "idb" ? `idb:${ref.key}` : `url:${ref.url}`;
}

export function useBlobUrl(ref: BlobRef | null | undefined): string | null {
  const key = refKey(ref);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ref || !key) return;
    let alive = true;
    let made: string | null = null;
    void getAdapter()
      .resolveUrl(ref)
      .then((u) => {
        if (!alive) {
          if (u) getAdapter().releaseUrl(u);
          return;
        }
        made = u;
        setUrl(u);
      });
    return () => {
      alive = false;
      if (made) getAdapter().releaseUrl(made);
    };
    // `ref` is an object literal rebuilt every render; `key` is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return key ? url : null;
}

/** Same for a list — one effect per item would blow the hook budget. */
export function useBlobUrls(refs: BlobRef[]): Array<string | null> {
  const key = refs.map(refKey).join("|");
  const [urls, setUrls] = useState<Array<string | null>>([]);

  useEffect(() => {
    if (refs.length === 0) return;
    let alive = true;
    const made: string[] = [];
    void Promise.all(refs.map((r) => getAdapter().resolveUrl(r))).then((list) => {
      if (!alive) {
        for (const u of list) if (u) getAdapter().releaseUrl(u);
        return;
      }
      for (const u of list) if (u) made.push(u);
      setUrls(list);
    });
    return () => {
      alive = false;
      for (const u of made) getAdapter().releaseUrl(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return refs.length ? urls : [];
}
