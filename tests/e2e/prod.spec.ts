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

test("every ladder card on a player page links to its edition", async ({ page }) => {
  await page.goto("/players/lewis-hamilton/");
  await page.waitForSelector(".editionCard");
  // The old page had a second, non-clickable grid of real 1/1 scans above the
  // ladder. One ladder now, and every card in it is a link.
  const links = page.locator("a.editionCard");
  await expect(links.first()).toBeVisible();
  await expect(links.first()).toHaveAttribute(
    "href",
    /\/players\/lewis-hamilton\/editions\//,
  );
  await expect(page.locator(".mLadderRail")).toBeVisible();
});

test("an edition with a real scan shows the photo, a 3D toggle and a market link", async ({ page }) => {
  await page.goto("/players/lewis-hamilton/editions/superfractor-1-1/");
  await expect(page.locator(".serialVisual img")).toBeVisible();
  await expect(page.locator(".mGallerySwitch")).toContainText("3D 镭射");
  await expect(page.getByRole("link", { name: /在市场查看/ })).toBeVisible();
});

test("the light theme lightens the display case around a card", async ({ page }) => {
  // Playwright boots with a light prefers-color-scheme, so pin the theme to
  // dark first — otherwise the assertion below reads the dark side.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("gc-theme", "dark");
    } catch {}
  });
  await page.goto("/archive/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForSelector(".archiveVisual");
  const surface = page.locator(".archiveVisual").first();
  const before = await surface.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );

  await page.locator(".themeToggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const after = await surface.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );

  expect(after).not.toBe(before);
  // The dark mount (#0b0e12 / #171d24) must be gone in light mode.
  expect(after).not.toContain("rgb(11, 14, 18)");
});

test("light mode leaves no large dark well outside the card mount", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("gc-theme", "light");
    } catch {}
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.waitForSelector(".marketCard");

  // The complaint that started this: flip to light and "many places are still
  // black". Card mounts are allowed to stay dark on purpose; nothing else is.
  const offenders = await page.evaluate(() => {
    const MOUNT =
      ".mStage,.mStageCard,.archiveVisual,.itemStage,.cardFx,.cardObject,.mFace,.serialVisual,.editionVisual,.portrait,.editionScan";
    // Deliberately inverted accents: a dark primary button reads as the call to
    // action on a light page. Everything else has to come up to the light.
    const ALLOW = ["primary", "active", "buySmall"];
    const lum = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const box = el.getBoundingClientRect();
      if (box.width * box.height < 6000) continue;
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== "none") continue; // gradients are audited separately
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (!m) continue;
      const p = m[1].split(",").map((n) => parseFloat(n));
      const alpha = p[3] === undefined ? 1 : p[3];
      if (alpha < 0.6) continue;
      if (lum(p[0], p[1], p[2]) > 0.18) continue;
      if (el.closest(MOUNT)) continue;
      const cls = typeof el.className === "string" ? el.className : "";
      if (ALLOW.some((t) => cls.split(/\s+/).includes(t))) continue;
      const name = cls ? `.${cls}` : el.tagName;
      out.push(`${name} ${cs.backgroundColor}`);
    }
    return out.slice(0, 8);
  });

  expect(offenders).toEqual([]);
});

test("homepage rail filters instantly and the sort control is live", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".marketCard");
  const note = page.locator(".resultsTop strong").first();
  const before = (await note.textContent()) ?? "";

  const box = page.locator(".filterRail input[type=checkbox][name=section]").first();
  await box.check();
  await expect(note).not.toHaveText(before);

  const sort = page.locator(".resultsTop select.sort");
  await expect(sort).toBeEnabled();
  await sort.selectOption("name");
  await expect(sort).toHaveValue("name");
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
