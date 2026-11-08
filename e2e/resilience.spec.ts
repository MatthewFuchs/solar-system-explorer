import { expectOverview, expectPlanetView, openApp, test, expect } from "./fixtures";

// These tests break things on purpose, so console errors are expected.
test.use({ allowErrors: true });

test("keeps the page usable when the 3D code fails to load", async ({ page }) => {
  await page.route(/\/assets\/PlateScene-.*\.js$/, (route) => route.abort());
  await openApp(page);
  const notice = page.getByTestId("scene-notice");
  await expect(notice).toContainText("The planets couldn’t be drawn.");
  await expect(notice.getByRole("button", { name: "Reload" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Labels still open their views.
  await page.getByRole("button", { name: /^Mars,/ }).click();
  await expectPlanetView(page, "Mars");
});

test("recovers with Reload once the network is back", async ({ page }) => {
  let fail = true;
  await page.route(/\/assets\/PlateScene-.*\.js$/, (route) => (fail ? route.abort() : route.continue()));
  await openApp(page);
  await expect(page.getByTestId("scene-notice")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.locator(".plate-canvas canvas")).toBeVisible();
  await expect(page.getByTestId("scene-notice")).toHaveCount(0);
});

test("explains when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (/webgl/i.test(type)) return null;
      return (original as (...a: unknown[]) => RenderingContext | null).call(this, type, ...args);
    } as typeof original;
  });
  await openApp(page);
  await expect(page.getByTestId("scene-notice")).toContainText("WebGL is unavailable");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("shows the notice when a planet texture fails", async ({ page }) => {
  await page.route(/\/textures\/mars\.webp$/, (route) => route.abort());
  await openApp(page);
  await expect(page.getByTestId("scene-notice")).toBeVisible();
});

test("keeps the overview map when the full-size map fails", async ({ page }) => {
  await page.route(/\/textures\/2k\//, (route) => route.abort());
  await openApp(page, "earth");
  await expectPlanetView(page, "Earth");
  await expect(page.locator(".plate-canvas canvas")).toBeVisible();
  await expect(page.getByTestId("scene-notice")).toHaveCount(0);
});

test("still draws moons when their maps fail", async ({ page }) => {
  await page.route(/\/textures\/moons\//, (route) => route.abort());
  const unhandled: string[] = [];
  page.on("pageerror", (e) => unhandled.push(e.message));
  await openApp(page, "jupiter");
  await expectPlanetView(page, "Jupiter");
  await expect(page.getByTestId("scene-notice")).toHaveCount(0);
  expect(unhandled).toEqual([]);
});

/** Leave the planet view and come back to it by clicking its planet. */
async function revisit(page: import("@playwright/test").Page, name: string) {
  await page.keyboard.press("Escape");
  await expectOverview(page);
  await page.getByRole("button", { name: new RegExp(`^${name},`) }).click();
  await expectPlanetView(page, name);
}

test("tries a failed full-size map again on a later visit, and keeps one that loaded", async ({ page }) => {
  let requests = 0;
  await page.route(/\/textures\/2k\/mars\.webp$/, (route) => (++requests === 1 ? route.abort() : route.continue()));
  await openApp(page, "mars");
  await expectPlanetView(page, "Mars");
  await expect.poll(() => requests).toBe(1);
  await revisit(page, "Mars");
  await expect.poll(() => requests).toBe(2);
  await revisit(page, "Mars");
  await page.waitForTimeout(500);
  expect(requests).toBe(2);
});

test("tries a failed moon map again on a later visit, and keeps one that loaded", async ({ page }) => {
  let requests = 0;
  await page.route(/\/textures\/moons\/europa\.webp$/, (route) => (++requests === 1 ? route.abort() : route.continue()));
  await openApp(page, "jupiter");
  await expectPlanetView(page, "Jupiter");
  await expect.poll(() => requests).toBe(1);
  await revisit(page, "Jupiter");
  await expect.poll(() => requests).toBe(2);
  await revisit(page, "Jupiter");
  await page.waitForTimeout(500);
  expect(requests).toBe(2);
});

test("starts the entrance after 2.5s when the 3D scene is slow to arrive", async ({ page }) => {
  await page.route(/\/assets\/PlateScene-[\w-]+\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 8000));
    await route.continue().catch(() => {}); // the test may be over by then
  });
  await page.goto("/");
  const plate = page.locator(".plate");
  await expect(plate).toHaveAttribute("data-entrance", "waiting");
  const waited = Date.now();
  await expect(plate).toHaveAttribute("data-entrance", /playing|done/, { timeout: 6000 });
  expect(Date.now() - waited).toBeLessThan(5000);
  await expect(page.locator(".plate-canvas canvas")).toHaveCount(0); // the scene is still on its way
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
