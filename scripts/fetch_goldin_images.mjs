// fetch_goldin.mjs v5 — 每页 newPage；goto 后 waitForSelector 等卡片图渲染，再滚动懒加载抽取+下载。
// 结果耗尽（整页无图）自动停止。
import pkg from "/Users/lizekai/WorkBuddy/2026-09-21-01-30-49/gridcards/node_modules/playwright/index.js";
const { chromium } = pkg;
import fs from "fs";
import path from "path";

const PROJECT = "/Users/lizekai/WorkBuddy/2026-09-21-01-30-49/gridcards";
const OUT = path.join(PROJECT, "public/img/goldin");
const MAXPAGES = parseInt(process.argv[2] || "10", 10);
const BASE = "https://goldin.co/buy/auction?search=f1&sort=Featured&number_of_lots=24&lot_view=grid";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isImage(buf) {
  if (!buf || buf.length < 12) return false;
  const h = buf.slice(0, 12);
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return "jpg";
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47) return "png";
  if (h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50) return "webp";
  return false;
}

async function scrapePage(browser, pageNum) {
  const url = `${BASE}&page=${pageNum}`;
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  });
  let found = [];
  try {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
        ok = true;
      } catch (e) {
        console.error(`page ${pageNum} goto attempt ${attempt + 1}: ${e.message}`);
        await sleep(8000);
      }
    }
    if (!ok) { await page.close(); return found; }
    // 等待至少一张卡片图渲染
    try {
      await page.waitForSelector('img[src*="cloudfront.net"]', { timeout: 60000 });
    } catch (e) { console.error(`page ${pageNum}: no card img selector`); }
    for (let i = 0; i < 14; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(600);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(800);

    found = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      const imgs = Array.from(document.querySelectorAll('img[src*="cloudfront.net"]'));
      for (const img of imgs) {
        let src = img.getAttribute("src") || img.src || "";
        if (!src.includes("cloudfront.net") && img.getAttribute("srcset"))
          src = img.getAttribute("srcset").split(",")[0].trim().split(" ")[0];
        if (!src.includes("cloudfront.net")) continue;
        let node = img, href = "";
        for (let d = 0; d < 6 && node; d++) {
          const a = node.closest && node.closest('a[href*="/item/"]');
          if (a) { href = a.getAttribute("href"); break; }
          node = node.parentElement;
        }
        const full = href ? (href.startsWith("http") ? href : "https://goldin.co" + href) : "https://goldin.co/";
        const key = full + "|" + src;
        if (seen.has(key)) continue;
        seen.add(key);
        const title = ((href && img.closest('a[href*="/item/"]')?.textContent) || img.alt || "").replace(/\s+/g, " ").trim().slice(0, 220);
        out.push({ href: full, src, title });
      }
      return out;
    });

    for (const c of found) {
      const slug = (c.href.split("/item/")[1] || "lot-" + Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi, "_");
      if (c.src && !fs.existsSync(path.join(OUT, `${slug}.jpg`)) && !fs.existsSync(path.join(OUT, `${slug}.png`)) && !fs.existsSync(path.join(OUT, `${slug}.webp`))) {
        try {
          const resp = await page.request.get(c.src, { timeout: 30000 });
          const buf = await resp.body();
          const kind = isImage(buf);
          if (kind && buf.length >= 1000) fs.writeFileSync(path.join(OUT, `${slug}.${kind}`), buf);
        } catch (e) { /* ignore */ }
      }
    }
  } catch (e) {
    console.error(`page ${pageNum} error:`, e.message);
  } finally {
    await page.close();
  }
  return found;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const all = [];
  const seen = new Set();
  console.log("initial cooldown 20s to ease rate-limit...");
  await sleep(20000);
  for (let p = 1; p <= MAXPAGES; p++) {
    const found = await scrapePage(browser, p);
    let added = 0;
    for (const c of found) { const k = c.href + c.src; if (!seen.has(k)) { seen.add(k); all.push(c); added++; } }
    console.log(`page ${p}: imgs=${found.length} new=${added} totalUnique=${all.length}`);
    if (found.length === 0) { console.log("no images this page, stopping."); break; }
    await sleep(6000);
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(all.map(c => ({
    slug: c.href.split("/item/")[1], title: c.title, href: c.href, image: c.src,
  })), null, 2));
  await browser.close();
  const files = fs.readdirSync(OUT).filter((f) => /\.(jpg|png|webp)$/i.test(f));
  console.log(`\nDONE. uniqueCards=${all.length} imageFilesOnDisk=${files.length} -> ${OUT}`);
})();
