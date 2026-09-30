// Lightweight, dependency-free error reporter.
//
// The site ships static with zero analytics. By default this is a no-op (it only
// logs in dev). When a backend / Sentry is wired in, flip
// NEXT_PUBLIC_ERROR_REPORTING=1 and add the SDK call at the marked hook point —
// every call site stays the same, so no component changes.
//
// Call sites: src/app/error.tsx and src/app/global-error.tsx.

type ReportContext = { digest?: string; route?: string };

const ENABLED = process.env.NEXT_PUBLIC_ERROR_REPORTING === "1";

export function reportError(
  err: unknown,
  ctx: ReportContext = {},
): void {
  const info = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    digest: ctx.digest,
    route: ctx.route,
  };

  if (!ENABLED) {
    if (process.env.NODE_ENV !== "production") {
      // Dev only: keep it visible without any network call.
    console.error("[reportError]", info);
    }
    return;
  }

  // ── hook point ────────────────────────────────────────────────────────────
  // e.g. Sentry.captureException(err, { extra: ctx });
  try {
    console.error("[reportError]", info);
  } catch {
    /* never let reporting break the app */
  }
}
