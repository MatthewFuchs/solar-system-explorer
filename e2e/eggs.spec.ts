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
    // A 3.5 s linger; software rendering under load can stretch it, so allow plenty.
    await expect.poll(() => found(page), { timeout: 20_000 }).toEqual(["pale-blue-dot"]);
    await expect(page.getByRole("status")).toContainText("Earth less than a pixel across");
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

  test("a golden disc at the foot of a Voyager's details: the Golden Record", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Voyager 1, launched/ }).click();
    const panel = page.getByRole("dialog");
    await panel.getByRole("button", { name: "A golden disc" }).click();
    await expect(page.getByRole("status")).toContainText("sent out with both Voyagers in 1977");
    await expect(panel.getByRole("img", { name: /Golden Record's cover/ })).toBeVisible();
    await expect(panel).toContainText("greetings in 55 languages");
    expect(await found(page)).toEqual(["golden-record"]);
  });

  test.describe("on a meteor shower's peak night", () => {
    test.use({ today: new Date(2026, 7, 12, 22, 0).getTime() });
    test("a line under the title, and it's noted", async ({ page }) => {
      await openApp(page);
      await expect(page.locator(".plate-sky")).toContainText("Perseids");
      await expect.poll(() => found(page)).toEqual(["sky-on-the-day"]);
    });
  });

  test("on an ordinary night (the suite's own day), no line", async ({ page }) => {
    await openApp(page);
    await expect(page.locator(".plate-title")).toBeVisible();
    await expect(page.locator(".plate-sky")).toHaveCount(0);
  });

  test("the development preview, ?sky=, does nothing in the built site", async ({ page }) => {
    await openApp(page, "?sky=leonids");
    await expect(page.locator(".plate-title")).toBeVisible();
    await expect(page.locator(".plate-sky")).toHaveCount(0);
  });
});
