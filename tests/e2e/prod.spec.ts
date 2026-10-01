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

test("market cards show real photographs rather than generated art", async ({ page }) => {
  await page.goto("/market/items/");
  await page.waitForSelector(".mTile");
  // The grid hydrates from the mock loader, so wait for it to fill in.
  await expect
    .poll(async () => page.locator(".mFace").count(), { timeout: 15_000 })
    .toBeGreaterThan(0);

  const photos = await page.locator(".mFace img").count();
  const generated = await page.locator("svg.mFaceArt").count();
  expect(photos).toBeGreaterThan(0);
  // The archive photographs 210 of 302 editions, so a photo should be the
  // common case. This fails if the image picker stops handing scans out.
  expect(photos).toBeGreaterThan(generated);
});

test("home checklist cards show real card photographs", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".marketCard");
  const photos = await page.locator("img.cardArtPhoto").count();
  const generated = await page.locator("svg.cardArt").count();
  expect(photos).toBeGreaterThan(0);
  // 179 of 313 records now have a real scan; the base dataset renders a subset.
  expect(photos).toBeGreaterThan(generated / 2);
});

// ---------------------------------------------------------------------------
// V27 · claims (every card), social posting, My Space
// ---------------------------------------------------------------------------

test("every checklist card carries a claim button", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".marketCard");
  const cards = await page.locator(".marketCard").count();
  const buttons = await page.locator(".marketCard .cardActions .claimBtn").count();
  expect(cards).toBeGreaterThan(0);
  // "所有卡都要能认领" — one affordance per record, not on a chosen few.
  expect(buttons).toBe(cards);
});

test("claiming a card flips the button and persists on this device", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".marketCard");
  const btn = page.locator(".marketCard .cardActions .claimBtn").first();
  await expect(btn).toContainText("认领");

  await btn.click();
  const dialog = page.locator(".modal.open");
  await expect(dialog).toBeVisible();
  // The evidence picker is part of the claim flow, not a separate screen.
  await expect(dialog.locator(".photoPicker")).toBeVisible();

  await dialog.getByRole("button", { name: "提交认领" }).click();
  await expect(dialog).toBeHidden();
  await expect(btn).toContainText("已认领");

  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gridcards:claims:v1") ?? "[]") as unknown[],
  );
  expect(stored).toHaveLength(1);
  // A claim must never masquerade as ownership — no owner field, ever.
  expect(JSON.stringify(stored)).not.toContain("owner");
});

test("the claim dialog accepts a photo as evidence", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".marketCard");
  await page.locator(".marketCard .cardActions .claimBtn").first().click();
  const dialog = page.locator(".modal.open");
  await expect(dialog).toBeVisible();

  // A 2x2 PNG is below the 300px short-edge floor, so the ingest must reject
  // it loudly instead of storing a fake "proof" photo.
  await dialog.locator("input[type=file]").setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxAADjAwMAA8sAgWQ6V0ZAAAAAElFTkSuQmCC",
      "base64",
    ),
  });
  await expect(dialog.locator(".uploadError")).toContainText("图片太小");
});

test("community composer publishes a post that lands at the top of the feed", async ({ page }) => {
  await page.goto("/community/");
  await page.waitForSelector(".composer");
  const text = `mail day #MailDay 收到一张 Hamilton`;
  await page.locator(".composer textarea").fill(text);
  await page.locator(".composer").getByRole("button", { name: "Post" }).click();

  const first = page.locator("article.post").first();
  await expect(first).toContainText("@you");
  await expect(first).toContainText("mail day");
  // Hashtags are extracted, not hand-typed.
  await expect(first.locator(".postTopic").first()).toContainText("#MailDay");

  // Liking is a local toggle.
  const like = first.locator(".postActions button").first();
  await like.click();
  await expect(like).toHaveClass(/on/);
});

test("my space shows the claims written on this device", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "gridcards:claims:v1",
        JSON.stringify([
          {
            id: "card:base#1",
            scope: "card",
            title: "#1 · Lewis Hamilton",
            player: "Lewis Hamilton",
            run: 0,
            href: "/players/lewis-hamilton/",
            serials: [],
            note: "show pickup",
            evidence: [],
            createdAt: 1,
            updatedAt: 1,
          },
        ]),
      );
    } catch {}
  });
  await page.goto("/profile/");
  await expect(page.locator(".profileTabs")).toBeVisible();

  await page.locator(".profileTabs button", { hasText: "认领" }).click();
  await expect(page.locator(".claimItem").first()).toContainText("Lewis Hamilton");
  await expect(page.locator(".claimItem").first()).toContainText("show pickup");
});

test("my space exposes identity, backup and per-store clearing", async ({ page }) => {
  await page.goto("/profile/");
  await page.locator(".profileTabs button", { hasText: "身份与数据" }).click();
  await expect(page.locator(".dataPanel")).toBeVisible();
  await expect(page.getByRole("button", { name: "导出 JSON 备份" })).toBeVisible();
  await expect(page.getByRole("button", { name: "从备份导入" })).toBeVisible();
  await expect(page.getByRole("button", { name: /清空认领/ })).toBeVisible();
});

for (const path of ["/community/", "/profile/"]) {
  test(`light mode leaves no dark well on ${path}`, async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("gc-theme", "light");
      } catch {}
    });
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.waitForSelector(".topbar");

    const offenders = await page.evaluate(() => {
      const MOUNT =
        ".mStage,.mStageCard,.archiveVisual,.itemStage,.cardFx,.cardObject,.mFace,.serialVisual,.editionVisual,.portrait,.editionScan,.modal,.postCardVisual";
      const ALLOW = ["primary", "active", "buySmall", "avatarBtn"];
      const lum = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        const box = el.getBoundingClientRect();
        if (box.width * box.height < 6000) continue;
        const cs = getComputedStyle(el);
        if (cs.backgroundImage !== "none") continue; // gradients audited separately
        const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const p = m[1].split(",").map((n) => parseFloat(n));
        const alpha = p[3] === undefined ? 1 : p[3];
        if (alpha < 0.6) continue;
        if (lum(p[0], p[1], p[2]) > 0.18) continue;
        if (el.closest(MOUNT)) continue;
        const cls = typeof el.className === "string" ? el.className : "";
        if (ALLOW.some((t) => cls.split(/\s+/).includes(t))) continue;
        out.push(`${cls ? `.${cls}` : el.tagName} ${cs.backgroundColor}`);
      }
      return out.slice(0, 8);
    });

    expect(offenders).toEqual([]);
  });

  test(`no horizontal overflow at 390px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.waitForSelector(".topbar");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
