import type { MetadataRoute } from "next";
import { getPlayerNames, getPlayerVariants, playerSlug } from "@/lib/catalog";
import { ITEM_IDS, SERIES_SLUGS } from "@/market/generated/ids";
import { absoluteUrl } from "@/lib/seo";

// Static export: the sitemap is generated at build time, so it enumerates
// exactly the routes Next pre-renders into out/. App-like routes
// (/market/me, /market/search) are intentionally absent — they are user or
// query specific and are marked noindex in their layouts.

const STATIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/market/", priority: 0.95 },
  { path: "/market/collections/", priority: 0.9 },
  { path: "/market/items/", priority: 0.9 },
  { path: "/archive/", priority: 0.8 },
  { path: "/collections/", priority: 0.8 },
  { path: "/activity/", priority: 0.6 },
  { path: "/community/", priority: 0.6 },
  { path: "/legal/", priority: 0.2 },
  { path: "/notices/", priority: 0.2 },
  { path: "/takedown/", priority: 0.2 },
];

// `output: "export"` needs every route pinned to static generation.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = STATIC_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified,
    changeFrequency: "daily" as const,
    priority: r.priority,
  }));

  const seriesEntries = SERIES_SLUGS.map((slug) => ({
    url: absoluteUrl(`/market/collections/${slug}/`),
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  const itemEntries = ITEM_IDS.map((id) => ({
    url: absoluteUrl(`/market/items/${id}/`),
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const playerEntries = getPlayerNames().flatMap((name) => {
    const slug = playerSlug(name);
    return [
      {
        url: absoluteUrl(`/players/${slug}/`),
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      },
      ...getPlayerVariants(name).map((variant) => ({
        url: absoluteUrl(`/players/${slug}/editions/${variant}/`),
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  });

  return [
    ...staticEntries,
    ...seriesEntries,
    ...itemEntries,
    ...playerEntries,
  ];
}
