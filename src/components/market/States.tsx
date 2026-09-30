"use client";

// The three non-happy paths, in one place, so every surface looks identical:
// skeleton while loading, one empty state, one error state with retry.

export function SkeletonTiles({ count = 8 }: { count?: number }) {
  return (
    <div className="mGrid" aria-busy="true" aria-label="加载中">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mTile skeleton">
          <div className="mTileArt sk" />
          <div className="mTileBody">
            <div className="sk skLine w60" />
            <div className="sk skLine w40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="skRows" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skRow">
          <div className="sk skLine w30" />
          <div className="sk skLine w20" />
          <div className="sk skLine w15" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mEmpty">
      <div className="mEmptyMark" aria-hidden>
        <svg viewBox="0 0 48 48" width="40" height="40">
          <rect
            x="9"
            y="6"
            width="30"
            height="36"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            opacity=".55"
          />
          <path
            d="M15 18h18M15 25h12M15 32h8"
            stroke="currentColor"
            strokeWidth="1.6"
            opacity=".35"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <b>{title}</b>
      {hint ? <em>{hint}</em> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error | undefined;
  onRetry?: () => void;
}) {
  return (
    <div className="mError" role="alert">
      <div className="mErrorHead">
        <span className="mErrorDot" aria-hidden />
        数据加载失败
      </div>
      <p>{error?.message ?? "请求未能完成"}</p>
      {onRetry ? (
        <button type="button" className="mBtn" onClick={onRetry}>
          重新加载
        </button>
      ) : null}
    </div>
  );
}

/** Inline spinner used inside buttons while an action is in flight. */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="mSpinner" role="status">
      <i aria-hidden />
      {label ? <em>{label}</em> : null}
    </span>
  );
}
