import { defineConfig, devices } from "@playwright/test";

// Two projects, both driven against the real static export (no next dev server,
// which is flaky in this sandbox):
//   · prod — ./out built normally. Trading stays FROZEN; ?trade=1 must NOT unlock.
//   · dev  — ./out-dev built with NEXT_PUBLIC_DEV_SWITCHES=1, so ?trade=1 unlocks
//            the演练 path and we can assert the full round trip.
//
// Chrome is the system binary (no browser download); --no-sandbox keeps it alive
// under the sandbox.

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  expect: { timeout: 10_000 },
  // webServer is a top-level option; Playwright starts both so each project can
  // point at its own origin (prod = frozen, dev = ?trade=1 enabled).
  webServer: [
    {
      command: "node scripts/serve-out.mjs 3100",
      url: "http://127.0.0.1:3100/",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      // The dev project must hit ./out-dev (built with NEXT_PUBLIC_DEV_SWITCHES=1);
      // serving ./out here would make every ?trade=1 assertion fail by design.
      command: "DIR=out-dev node scripts/serve-out.mjs 3101",
      url: "http://127.0.0.1:3101/",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "prod",
      testMatch: "**/prod.spec.ts",
      use: {
        baseURL: "http://127.0.0.1:3100",
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: CHROME, args: ["--no-sandbox"] },
      },
    },
    {
      name: "dev",
      testMatch: "**/dev.spec.ts",
      use: {
        baseURL: "http://127.0.0.1:3101",
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: CHROME, args: ["--no-sandbox"] },
      },
    },
  ],
});
