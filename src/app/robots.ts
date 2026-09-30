import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// `output: "export"` needs every route pinned to static generation.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Debug / simulation query switches — never worth indexing.
        disallow: ["/*?fail=1", "/*?trade=1", "/market/search/", "/market/me/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
