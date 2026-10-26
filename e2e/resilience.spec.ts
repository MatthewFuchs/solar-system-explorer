import { expectPlanetView, openApp, test, expect } from "./fixtures";

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
  await openApp(page, "#earth");
  await expectPlanetView(page, "Earth");
  await expect(page.locator(".plate-canvas canvas")).toBeVisible();
  await expect(page.getByTestId("scene-notice")).toHaveCount(0);
});

test("still draws moons when their maps fail", async ({ page }) => {
  await page.route(/\/textures\/moons\//, (route) => route.abort());
  const unhandled: string[] = [];
  page.on("pageerror", (e) => unhandled.push(e.message));
  await openApp(page, "#jupiter");
  await expectPlanetView(page, "Jupiter");
  await expect(page.getByTestId("scene-notice")).toHaveCount(0);
  expect(unhandled).toEqual([]);
});
