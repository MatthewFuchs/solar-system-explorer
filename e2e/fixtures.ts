import { test as base, expect, type Page } from "@playwright/test";
import { withCoverage } from "./coverage";

/** Console output that is expected and harmless: driver chatter and a deprecation inside R3F. */
const IGNORED = [/GL Driver Message/, /THREE\.Clock: This module has been deprecated/, /GPU stall due to ReadPixels/];

/**
 * Every test fails if the page logs an error or throws, which also catches Content
 * Security Policy violations. Tests that break things on purpose opt out with
 * `test.use({ allowErrors: true })`.
 */
export const test = base.extend<{ allowErrors: boolean; errors: string[] }>({
  allowErrors: [false, { option: true }],
  errors: [
    async ({ page, allowErrors, javaScriptEnabled }, use) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && !IGNORED.some((re) => re.test(m.text()))) errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await withCoverage(page, javaScriptEnabled !== false, () => use(errors));
      if (!allowErrors) expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Open a page of the app (e.g. "mars") with the entrance already seen, so tests start still. */
export async function openApp(page: Page, path = "") {
  await page.addInitScript(() => sessionStorage.setItem("sse-entrance-played", "1"));
  await page.goto(`/${path}`);
  await expect(page.locator(".plate")).toHaveAttribute("data-entrance", "done");
}

/** Wait until the planet view has finished its zoom. */
export async function expectPlanetView(page: Page, name: string) {
  await expect(page.locator(".feature")).toHaveAttribute("data-phase", "planet");
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}

/** Wait until the overview is back and the planet view is gone. */
export async function expectOverview(page: Page) {
  await expect(page.locator(".feature")).toHaveCount(0);
  await expect(page.locator(".plate")).toHaveAttribute("data-overview", "shown");
}
