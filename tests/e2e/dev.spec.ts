import { test, expect } from "@playwright/test";

// Runs against ./out-dev — the export built with NEXT_PUBLIC_DEV_SWITCHES=1,
// where ?trade=1 legitimately unlocks the演练 (mock) trading path. This is the
// only environment where the buy flow is allowed to run, so the security test
// lives in prod.spec.ts, not here.

const ITEM = "lewis-hamilton-chrome-base-superfractor-1-1";

test("default state is still FROZEN without ?trade=1", async ({ page }) => {
  await page.goto(`/market/items/${ITEM}/`);
  await page.waitForSelector(".mTrade");
  await expect(page.locator(".mTrade .mBtn.primary.wide").first()).toHaveClass(/frozen/);
});

test("?trade=1 unlocks the buy control and the演练 resolves with a toast", async ({ page }) => {
  await page.goto(`/market/items/${ITEM}/?trade=1`);
  await page.waitForSelector(".mTrade");
  const buy = page.locator(".mTrade .mBtn.primary.wide").first();
  // Enabled: the frozen class is gone and the hint switches to LIVE DEMO.
  await expect(buy).not.toHaveClass(/frozen/);
  await expect(page.locator(".mLive")).toBeVisible();

  // Clicking may hit the simulated 1-in-8 failure; retry until a toast resolves.
  let resolved = false;
  for (let i = 0; i < 12 && !resolved; i++) {
    await buy.click();
    try {
      await page.waitForSelector(".mToast", { timeout: 4_000 });
      resolved = true;
    } catch {
      // network-failure path: a toast still shows, just try again
    }
  }
  expect(resolved).toBe(true);
  // The toast host exists and mirrors success or error — trading ran end to end.
  await expect(page.locator(".mToastHost")).toBeVisible();
});
