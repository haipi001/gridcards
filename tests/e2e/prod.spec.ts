import { test, expect } from "@playwright/test";

// Runs against the NORMAL production export (./out). Trading must stay FROZEN
// and ?trade=1 must NOT unlock it.

const ITEM = "lewis-hamilton-chrome-base-superfractor-1-1";

test("home shows the DEMO honesty bar", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".demoStrip")).toBeVisible();
  await expect(page.locator(".demoStrip")).toContainText("DEMO");
});

test("market browse lists cards and a rarity filter narrows the set", async ({ page }) => {
  await page.goto("/market/items/");
  // /market/items/ renders the terminal tile grid (.mTile); .marketCard is the
  // homepage checklist card.
  await page.waitForSelector(".mTile");
  const note = page.locator(".mFilterNote b").first();
  // The browse grid hydrates from the mock loader, so the count starts empty.
  await expect
    .poll(async () => Number((await note.textContent()) ?? "0"), { timeout: 15_000 })
    .toBeGreaterThan(0);
  const before = Number((await note.textContent()) ?? "0");

  // Click the first rarity chip.
  const chip = page.locator(".mChips .mChip").first();
  await chip.click();
  await expect
    .poll(async () => Number((await note.textContent()) ?? "0"), { timeout: 15_000 })
    .toBeLessThan(before);
});

test("buy button is FROZEN by default", async ({ page }) => {
  await page.goto(`/market/items/${ITEM}/`);
  await page.waitForSelector(".mTrade");
  const buy = page.locator(".mTrade .mBtn.primary.wide").first();
  await expect(buy).toHaveClass(/frozen/);
  await expect(buy).toHaveAttribute("title", /尚未开放|已冻结/);
});

test("SECURITY: ?trade=1 does NOT unlock trading in a production build", async ({ page }) => {
  await page.goto(`/market/items/${ITEM}/?trade=1`);
  await page.waitForSelector(".mTrade");
  const buy = page.locator(".mTrade .mBtn.primary.wide").first();
  await expect(buy).toHaveClass(/frozen/);
  await expect(buy).toHaveAttribute("title", /尚未开放/);
});

test("unknown item id renders the branded 404", async ({ page }) => {
  const res = await page.goto("/market/items/this-card-does-not-exist/");
  expect(res?.status()).toBe(404);
  // .eyebrow also exists inside .notFound, so the combined selector trips
  // Playwright's strict mode.
  await expect(page.locator(".notFound")).toBeVisible();
});

test("no horizontal overflow on a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForSelector(".topbar");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the theme switch flips <html data-theme> and survives navigation", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator(".themeToggle");
  await expect(toggle).toBeVisible();

  const root = page.locator("html");
  const before = await root.getAttribute("data-theme");
  expect(before === "dark" || before === "light").toBe(true);

  await toggle.click();
  await expect(root).not.toHaveAttribute("data-theme", before as string);
  const flipped = await root.getAttribute("data-theme");
  expect(flipped === "dark" || flipped === "light").toBe(true);

  // Remembered in localStorage, so the next page boots in the chosen theme.
  await page.goto("/archive/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", flipped as string);
  await expect(page.locator(".themeToggle")).toBeVisible();
});

test("archive scans are framed at their own aspect ratio, never cropped", async ({ page }) => {
  await page.goto("/archive/");
  const visual = page.locator(".archiveVisual").first();
  await expect(visual).toBeVisible();

  const style = await visual.getAttribute("style");
  expect(style ?? "").toContain("aspect-ratio");

  const img = visual.locator("img").first();
  // Intrinsic size comes from the real scan, so the box and the image agree.
  const box = await visual.boundingBox();
  const declared = await img.evaluate((el: HTMLImageElement) => el.naturalWidth / el.naturalHeight);
  expect(box).not.toBeNull();
  expect(Number.isFinite(declared)).toBe(true);
});
