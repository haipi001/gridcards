"use client";

// Route-level error boundary. With `output: "export"` there is no server to
// retry against, so the only honest recovery actions are "try this component
// again" and "go somewhere that works".

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/error";

export default function Error({
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
    <div className="wrap">
      <div className="notFound">
        <div className="eyebrow">ERROR</div>
        <h1>
          这个页面
          <br />
          没有跑完
        </h1>
        <p>
          页面渲染时出错。所有卡谱数据都随构建一起导出，重试通常即可恢复；若反复失败，
          {error.digest ? ` 请把错误编号 ${error.digest} ` : " 请把当前地址 "}
          反馈给我们。
        </p>
        <div className="actionRow" style={{ maxWidth: 460 }}>
          <button className="btn primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="btn" href="/">
            Back to market
          </Link>
        </div>
      </div>
    </div>
  );
}
