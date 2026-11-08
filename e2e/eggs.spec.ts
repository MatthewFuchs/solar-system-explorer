import { expectOverview, expectPlanetView, openApp, test, expect } from "./fixtures";

const found = (page: import("@playwright/test").Page) =>
  page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("sse-journey-v1") ?? '{"found":{}}').found));

test.describe("easter eggs", () => {
  test("typing a name anywhere: KEPLER, then HUBBLE", async ({ page }) => {
    await openApp(page);
    await page.keyboard.type("kepler");
    // The reveal, then the note, while the line shows.
    await expect(page.getByRole("status")).toContainText("Johannes Kepler, 1619");
    await expect(page.getByRole("status")).toContainText("Noted in your logbook");
    await page.keyboard.type("hubbub hubble");
    await expect(page.getByRole("status")).toContainText("Edwin Hubble, 1929");
    expect(await found(page)).toEqual(["kepler", "hubble"]);
  });

  test("lingering over the Sun from among the stars: the Pale Blue Dot", async ({ page }) => {
    await openApp(page, "neighbourhood");
    expect(await found(page)).toEqual([]);
    await page.getByRole("button", { name: /^Sol,/ }).hover();
    await expect(page.getByRole("status")).toContainText("Earth less than a pixel across", { timeout: 8000 });
    expect(await found(page)).toEqual(["pale-blue-dot"]);
  });

  test("with sound on, the worlds sung in order, Mercury to Neptune: the Music of the Spheres", async ({ page }) => {
    test.slow();
    await openApp(page);
    await page.getByRole("button", { name: "Sound" }).click();
    const planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
    for (const name of planets) {
      await page.getByRole("button", { name: new RegExp(`^${name},`) }).click();
      await expectPlanetView(page, name);
      // Out of order, nothing: the spheres wait for all eight.
      if (name !== "Neptune") expect(await found(page)).not.toContain("music-of-the-spheres");
      await page.keyboard.press("Escape");
      await expectOverview(page);
    }
    await expect(page.getByRole("status")).toContainText("the harmony of the worlds", { timeout: 10_000 });
    expect(await found(page)).toContain("music-of-the-spheres");
  });

  test("out of order, or with sound off, the spheres stay silent", async ({ page }) => {
    await openApp(page);
    // Sound off: Mercury then Venus counts for nothing.
    for (const name of ["Mercury", "Venus"]) {
      await page.getByRole("button", { name: new RegExp(`^${name},`) }).click();
      await expectPlanetView(page, name);
      await page.keyboard.press("Escape");
      await expectOverview(page);
    }
    expect(await found(page)).not.toContain("music-of-the-spheres");
  });
});
