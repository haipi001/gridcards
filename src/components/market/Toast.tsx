"use client";

// Toast host for action feedback. One provider per market page; actions push
// loading → success / failure and the toast mirrors the same state machine.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastKind = "loading" | "success" | "error" | "info";
export type ToastItem = { id: string; kind: ToastKind; text: string };

type Api = {
  push: (kind: ToastKind, text: string) => string;
  update: (id: string, kind: ToastKind, text: string) => void;
  dismiss: (id: string) => void;
};

const ToastCtx = createContext<Api | null>(null);

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, text: string) => {
      const id = `t${++seq}`;
      setItems((prev) => [...prev.slice(-3), { id, kind, text }]);
      if (kind !== "loading") {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), kind === "error" ? 5200 : 3200),
        );
      }
      return id;
    },
    [dismiss],
  );

  const update = useCallback(
    (id: string, kind: ToastKind, text: string) => {
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, kind, text } : t)),
      );
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), kind === "error" ? 5200 : 3200),
      );
    },
    [dismiss],
  );

  const api = useMemo(() => ({ push, update, dismiss }), [push, update, dismiss]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="mToastHost" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`mToast ${t.kind}`}>
            {t.kind === "loading" ? <i className="mToastSpin" aria-hidden /> : null}
            {t.kind === "success" ? <b aria-hidden>✓</b> : null}
            {t.kind === "error" ? <b aria-hidden>!</b> : null}
            <span>{t.text}</span>
            <button
              type="button"
              className="mToastX"
              onClick={() => dismiss(t.id)}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Api {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast 必须在 ToastProvider 内使用");
  return ctx;
}
