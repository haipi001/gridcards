// Minimal static file server for the `next export` output, used by the E2E
// suite (Playwright webServer). Serves a directory (default ./out, overridable
// with the DIR env var or the first CLI arg) on a port (PORT / second arg).
//
// Trailing-slash routing is already baked into out/ (every route is a directory
// with index.html), so this only needs to: serve files, fall back to 404.html
// for unknown paths, and refuse path traversal.

import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(process.cwd(), process.env.DIR || "out");
const PORT = Number(process.env.PORT || process.argv[2] || 3100);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const full = join(ROOT, clean);
  if (!full.startsWith(ROOT)) return null; // path traversal
  return full;
}

const server = http.createServer(async (req, res) => {
  try {
    let pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/") pathname = "/index.html";
    let filePath = safePath(pathname);
    if (!filePath) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, "index.html");
    }
    if (!existsSync(filePath)) {
      const htmlVariant = safePath(pathname + ".html");
      if (htmlVariant && existsSync(htmlVariant)) filePath = htmlVariant;
      else {
        res.writeHead(404, { "content-type": MIME[".html"] });
        const f404 = join(ROOT, "404.html");
        return res.end(existsSync(f404) ? await readFile(f404) : "404");
      }
    }
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`serve-out: ${ROOT} → http://127.0.0.1:${PORT}`);
});
