import { expectOverview, expectPlanetView, openApp, test, expect } from "./fixtures";

const STARS = ["Alpha Centauri", "Barnard's Star", "Wolf 359", "Sirius", "Epsilon Eridani", "Procyon", "Tau Ceti"];

/** Wait until the given plate's overview is on screen and at rest. */
async function expectPlate(page: import("@playwright/test").Page, plate: string, heading: RegExp) {
  await expect(page.locator(".plate")).toHaveAttribute("data-plate", plate);
  await expectOverview(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  await expect(page.locator(".view-veil")).toHaveAttribute("data-on", "false");
}

test.describe("between scales", () => {
  test("goes out to the stellar neighbourhood from the solar system", async ({ page }) => {
    await openApp(page);
    await page.getByRole("link", { name: "And beyond: The Stellar Neighbourhood" }).click();
    await expect(page).toHaveURL(/\/neighbourhood$/);
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
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await page.goBack();
    await expectPlate(page, "solar", /Solar\s*System/i);
    await page.goForward();
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
  });

  test("the masthead's Overview link stays on the plate, and the site's name goes home", async ({ page }) => {
    await openApp(page, "wolf-359");
    await expectPlanetView(page, "Wolf 359");
    await page.getByRole("link", { name: "Overview" }).click();
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await page.getByRole("link", { name: "Solar System Explorer" }).click();
    await expectPlate(page, "solar", /Solar\s*System/i);
  });

  test("Escape leaves a star for its own plate", async ({ page }) => {
    await openApp(page, "procyon");
    await expectPlanetView(page, "Procyon");
    await page.keyboard.press("Escape");
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
  });
});

test.describe("between scales, with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("dissolves to the neighbourhood and back", async ({ page }) => {
    await openApp(page);
    await page.getByRole("link", { name: /^And beyond/ }).click();
    await expectPlate(page, "neighbourhood", /Stellar\s*Neighbourhood/i);
    await page.getByRole("button", { name: /^Sol,/ }).click();
    await expectPlate(page, "solar", /Solar\s*System/i);
  });
});
