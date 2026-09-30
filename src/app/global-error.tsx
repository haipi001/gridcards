"use client";

// Last-resort boundary: it replaces the whole document, so it must render its
// own <html> / <body> and cannot rely on globals.css having loaded.

import { useEffect } from "react";
import { reportError } from "@/lib/error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, {
      digest: error.digest,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#07090b",
          color: "#e9edf1",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2,
              color: "#8b949e",
              marginBottom: 12,
            }}
          >
            GRIDCARDS
          </div>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>站点加载失败</h1>
          <p style={{ color: "#98a2ad", lineHeight: 1.7, margin: "0 0 20px" }}>
            页面脚本抛出了未捕获的错误{error.digest ? `（${error.digest}）` : ""}。
            重新加载通常可以恢复。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #fff",
              background: "#fff",
              color: "#07090b",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
