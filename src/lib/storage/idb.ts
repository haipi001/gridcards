// IndexedDB for user-uploaded card photos.
//
// Photos never go anywhere near Git (see .gitignore: public/img/uploads/) and
// never leave the device. localStorage cannot hold them (≈5 MB, and it is a
// string store); IndexedDB holds blobs natively and gives us hundreds of MB.
//
// Safari private mode throws on open(), and quota can be exhausted at any
// time — both fall back to an in-memory Map so the session still works, with
// the UI warning that the photos are visible for this session only.

const DB_NAME = "gridcards";
const DB_VERSION = 1;
export const STORE_IMAGES = "images";
export const STORE_META = "meta";

/** True once IndexedDB has proven unusable in this browser. */
let degraded = false;
const memory = new Map<string, Blob>();

export function isDegraded(): boolean {
  return degraded;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      degraded = true;
      resolve(null);
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      degraded = true;
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      degraded = true;
      resolve(null);
    };
    req.onblocked = () => {
      degraded = true;
      resolve(null);
    };
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const t = db.transaction(store, mode);
          const req = run(t.objectStore(store));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

/** Stores bytes under `key`. Returns the same key on success, null if degraded. */
export async function idbPut(key: string, blob: Blob): Promise<string | null> {
  memory.set(key, blob); // always keep the session copy: it is the fallback
  const ok = await tx<IDBValidKey>(STORE_IMAGES, "readwrite", (s) => s.put(blob, key));
  if (ok === null) degraded = true;
  return ok === null ? null : key;
}

export async function idbGet(key: string): Promise<Blob | null> {
  const fromDb = await tx<Blob | undefined>(STORE_IMAGES, "readonly", (s) => s.get(key));
  if (fromDb) return fromDb;
  return memory.get(key) ?? null;
}

export async function idbDelete(key: string): Promise<void> {
  memory.delete(key);
  await tx<undefined>(STORE_IMAGES, "readwrite", (s) => s.delete(key));
}

export async function idbKeys(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>(STORE_IMAGES, "readonly", (s) => s.getAllKeys());
  if (keys) return keys.map(String);
  return [...memory.keys()];
}

/** Remaining quota headroom, or null when the browser will not say. */
export async function estimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}
