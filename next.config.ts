import type { NextConfig } from "next";

// Security and caching policy lives per host, not here: `headers()` is ignored
// by `output: "export"` (and would warn on every build). See:
//   public/_headers   Cloudflare Pages
//   vercel.json       Vercel
//   netlify.toml      Netlify
// Keep the three in sync — docs/DEPLOY.md lists what each covers.

const nextConfig: NextConfig = {
  // Static export: every route is pre-rendered at build time into out/.
  // The Postgres-backed write paths (listings / offers / orders) are not part
  // of this build — see src/lib/catalog.ts.
  output: "export",
  // Directory-style URLs so a plain static host serves nested routes.
  trailingSlash: true,
  // Static export cannot run the image optimizer.
  images: { unoptimized: true },
  // The publish build redirects the heavy-churn cache dir off the sandbox-
  // restricted project directory (the runtime blocks file deletes there).
  // NEXT_DIST_DIR is consumed only by the build step; the default ".next" keeps
  // ordinary local `next dev` / `next build` behaviour untouched.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep error/warn: this build has no error reporting backend, and the
  // browser console is the only diagnostic a visitor can send us.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
