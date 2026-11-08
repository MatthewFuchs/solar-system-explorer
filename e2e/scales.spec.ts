import { expectOverview, expectPlanetView, openApp, test, expect } from "./fixtures";

const STARS = ["Alpha Centauri", "Barnard's Star", "Wolf 359", "Sirius", "Epsilon Eridani", "Procyon", "Tau Ceti"];

/** Wait until the given plate's overview is on screen and at rest. */
async function expectPlate(page: import("@playwright/test").Page, plate: string, heading: RegExp) {
  await expect(page.locator(".plate")).toHaveAttribute("data-plate", plate);
  await expectOverview(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  await expect(page.locator(".view-veil")).toHaveAttribute("data-on", "false");
}

/** Wait until the voyage has drawn its first frame (its listeners are attached by then). */
async function underWay(page: import("@playwright/test").Page) {
  await expect(page.locator(".voyage__span-value")).not.toBeEmpty();
}

/** Hurry the voyage between scales to its end with a click, and wait until it's gone. */
async function arrive(page: import("@playwright/test").Page) {
  await underWay(page);
  await page.mouse.click(10, 300);
  await expect(page.locator(".voyage")).toHaveAttribute("data-skipped", "true");
  await expect(page.locator(".voyage")).toHaveCount(0, { timeout: 15_000 });
}

test.describe("between scales", () => {
  test("goes out to the stellar neighbourhood from the solar system", async ({ page }) => {
    await openApp(page);
    await page.getByRole("link", { name: "And beyond: The Stellar Neighbourhood" }).click();
    await expect(page).toHaveURL(/\/neighbourhood$/);
    await arrive(page);
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await expect(page).toHaveTitle("Solar System Explorer · The Sun's nearest stars");
    for (const name of STARS) await expect(page.getByRole("button", { name: new RegExp(`^${name},`) })).toBeAttached();
    // Spacecraft and belts belong to the solar system.
    await expect(page.locator(".craft")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Spacecraft" })).toHaveCount(0);
  });

  test("returns to the solar system through Sol", async ({ page }) => {
    await openApp(page, "neighbourhood");
    await page.getByRole("button", { name: /^Sol,/ }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    await arrive(page);
    await expectPlate(page, "solar", /Solar\s*System/i);
    await expect(page.getByRole("button", { name: /^Mars,/ })).toBeAttached();
  });

  test("opens a star, and goes back to the neighbourhood", async ({ page }) => {
    await openApp(page, "neighbourhood");
    await page.getByRole("button", { name: /^Sirius,/ }).click();
    await expect(page).toHaveURL(/\/sirius$/);
    await expectPlanetView(page, "Sirius");
    await expect(page.locator(".feature__numeral")).toHaveText("A1V");
    await expect(page.getByText("8.6 light-years from the Sun")).toBeVisible();
    await page.getByRole("button", { name: "Back to the neighbourhood" }).click();
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await expect(page).toHaveURL(/\/neighbourhood$/);
  });

  test("opens a star directly from a link", async ({ page }) => {
    await openApp(page, "tau-ceti");
    await expectPlanetView(page, "Tau Ceti");
    await expect(page).toHaveTitle("Tau Ceti · Solar System Explorer");
  });

  test("follows the browser's back and forward buttons across scales", async ({ page }) => {
    await openApp(page);
    await page.getByRole("link", { name: /^And beyond/ }).click();
    await arrive(page);
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await page.goBack();
    await arrive(page);
    await expectPlate(page, "solar", /Solar\s*System/i);
    await page.goForward();
    await arrive(page);
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
  });

  test("the masthead's Overview link stays on the plate, and the site's name goes home", async ({ page }) => {
    await openApp(page, "wolf-359");
    await expectPlanetView(page, "Wolf 359");
    await page.getByRole("link", { name: "Overview" }).click();
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await page.getByRole("link", { name: "Solar System Explorer" }).click();
    await arrive(page);
    await expectPlate(page, "solar", /Solar\s*System/i);
  });

  test("Escape leaves a star for its own plate", async ({ page }) => {
    await openApp(page, "procyon");
    await expectPlanetView(page, "Procyon");
    await page.keyboard.press("Escape");
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
  });
});

test.describe("the voyage between scales", () => {
  test("pulls back through the emptiness past true-scale milestones, then arrives on its own", async ({ page }) => {
    test.slow();
    await openApp(page);
    await page.getByRole("link", { name: /^And beyond/ }).click();
    await expect(page.locator(".plate")).toHaveAttribute("data-voyage", "out");
    // The milestones it passes, and the running span of the view. (Which frames a slow,
    // software-rendered test browser catches varies; the rings' true-scale radii and timing
    // are unit-tested in test/voyage.test.ts.)
    await underWay(page);
    await expect(page.locator(".voyage__ring-name")).toHaveText(["Voyager 1", "The Oort Cloud", "One light-year", "The Oort Cloud's outer edge"]);
    await expect(page.locator(".voyage")).toHaveCount(0, { timeout: 30_000 });
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await expect(page.locator(".plate")).not.toHaveAttribute("data-voyage", /./);
  });

  test("hurries to the end on a click, a key, or the wheel", async ({ page }) => {
    await openApp(page);
    await page.getByRole("link", { name: /^And beyond/ }).click();
    await underWay(page);
    await page.keyboard.press("Space");
    await expect(page.locator(".voyage")).toHaveAttribute("data-skipped", "true");
    await expect(page.locator(".voyage")).toHaveCount(0, { timeout: 15_000 });
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await page.getByRole("button", { name: /^Sol,/ }).click();
    await underWay(page);
    await page.mouse.wheel(0, 200);
    await expect(page.locator(".voyage")).toHaveAttribute("data-skipped", "true");
    await expect(page.locator(".voyage")).toHaveCount(0, { timeout: 15_000 });
    await expectPlate(page, "solar", /Solar\s*System/i);
  });

  test("finishes its trip, then follows the back button if it was pressed on the way", async ({ page }) => {
    await openApp(page);
    await page.getByRole("link", { name: /^And beyond/ }).click();
    await underWay(page);
    await page.evaluate(() => window.history.back());
    await page.mouse.click(10, 300);
    // It arrives, then, as the address bar says the solar system, turns around and goes home.
    await expect(page.locator('.voyage[data-direction="in"]')).toBeAttached({ timeout: 15_000 });
    await arrive(page);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    await expectPlate(page, "solar", /Solar\s*System/i);
  });
});

test.describe("between scales, with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("dissolves to the neighbourhood and back, with no voyage", async ({ page }) => {
    await openApp(page);
    await page.getByRole("link", { name: /^And beyond/ }).click();
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await page.getByRole("button", { name: /^Sol,/ }).click();
    await expectPlate(page, "solar", /Solar\s*System/i);
    await expect(page.locator(".voyage")).toHaveCount(0);
  });
});
