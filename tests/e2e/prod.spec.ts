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
  await page.waitForSelector(".marketCard");
  const before = Number(
    (await page.locator(".mFilterNote b").first().textContent()) ?? "0",
  );
  expect(before).toBeGreaterThan(0);

  // Click the first rarity chip.
  const chip = page.locator(".mChips .mChip").first();
  await chip.click();
  await page.waitForTimeout(250);
  const after = Number(
    (await page.locator(".mFilterNote b").first().textContent()) ?? "0",
  );
  expect(after).toBeLessThan(before);
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
  await expect(page.locator(".notFound, .eyebrow")).toBeVisible();
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
