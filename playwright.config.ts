import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// BASE_URL points the suite at an already running build instead of the dev server:
// the local Cloudflare preview (http://localhost:8787) or a deployed preview.
const external = process.env.BASE_URL;
const baseURL = external ?? `http://localhost:${PORT}`;

// Nearly every Klaev visitor is on a phone, so both projects are phones:
// Safari's engine for iPhones, Chromium for Android.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Wrangler's local database now and then fails a query with "internal error" when five browsers
  // hit the dev server at once (D1_ERROR: Failed to get session commit token). One retry absorbs that
  // locally; Playwright still lists the test as flaky. The real database doesn't do this.
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? "github" : "list",
  // The dev server compiles each page and server action the first time it's used, which with five
  // workers at once can outlast the default 5 seconds.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
  // The test server always starts fresh on a reset local database: checkout tests place orders and
  // take stock, so a reused server would run out of the sizes they buy.
  webServer: external
    ? undefined
    : {
        command: `pnpm db:setup && pnpm dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
