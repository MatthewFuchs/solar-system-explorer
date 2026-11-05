import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

/**
 * End-to-end tests run against the production build served by `vite preview`, which
 * sends the same security headers as Vercel (see vite.config.ts), so CSP problems
 * show up here as console errors.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // WebGL runs in software in headless Chromium and is heavy. Two workers on a CI runner
  // starved the main thread (zooms stuck mid-flight, contexts timing out), so CI runs one
  // worker per runner and splits the suite across runners instead (`--shard`, ci.yml).
  workers: process.env.CI ? 1 : 3,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["blob"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Headless Chromium draws WebGL in software.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /(navigation|panels)\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
