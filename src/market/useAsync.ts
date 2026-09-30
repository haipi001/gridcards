// One async hook for the whole market: loading / ok / error, plus reload.
//
// The request key is kept in a ref rather than state, so a dependency change
// flips straight to `loading` without a synchronous setState inside the effect
// (which React 19's lint rules reject). Previous data stays on screen while the
// new request is in flight — pagination no longer flashes an empty grid.

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureLedger, readLedger, subscribeLedger } from "./ledger";
import type { Account } from "./types";

export type AsyncState<T> = {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
  /** True while a *later* request overwrites data already on screen. */
  refreshing: boolean;
};

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  type Snap = {
    depsKey: string;
    status: "loading" | "ok" | "err";
    data?: T;
    error?: Error;
  };

  // The request is identified by its dependency key, computed during render and
  // stored with the snapshot — no ref reads, so a dependency change flips to
  // `loading` on the very next render.
  const depsKey = JSON.stringify(deps);
  const [snap, setSnap] = useState<Snap>({ depsKey, status: "loading" });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let alive = true;
    fnRef.current().then(
      (data) => {
        if (alive) setSnap({ depsKey, status: "ok", data });
      },
      (err: unknown) => {
        if (alive)
          setSnap({
            depsKey,
            status: "err",
            error: err instanceof Error ? err : new Error(String(err)),
          });
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const stale = snap.depsKey !== depsKey;
  return {
    data: snap.status === "ok" ? snap.data : undefined,
    error: snap.status === "err" ? snap.error : undefined,
    loading: snap.status === "loading" || stale,
    refreshing: stale && snap.status === "ok",
    reload,
  };
}

/** Live account snapshot: seeded from /mock/me.json, then driven by the ledger. */
export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let alive = true;
    void ensureLedger().then((l) => {
      if (alive) setAccount(l.user);
    });
    const off = subscribeLedger(() => {
      const l = readLedger();
      if (l) setAccount(l.user);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  return account;
}
