// The one place that decides where data lives.
//
// Every page and every engine imports `getAdapter()`. Today it always returns
// the local (device-only) adapter. When the hosted backend is activated,
// `NEXT_PUBLIC_BACKEND=cloud` swaps in the cloud adapter behind the same
// interface and nothing above this line changes.

import { localAdapter } from "./localAdapter";
import type { StorageAdapter } from "./types";

export type { StorageAdapter };

let adapter: StorageAdapter = localAdapter;

export function getAdapter(): StorageAdapter {
  return adapter;
}

/** Used by the cloud adapter once it exists, and by tests. */
export function setAdapter(next: StorageAdapter) {
  adapter = next;
}

export * from "./types";
