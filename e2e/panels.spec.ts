import { expectPlanetView, openApp, test, expect } from "./fixtures";

test.describe("point-of-interest panel", () => {
  test("opens from Open details, takes focus, and closes with Escape", async ({ page }) => {
    await openApp(page, "mars");
    await expectPlanetView(page, "Mars");
    const poiName = (await page.locator(".feature__poi-name").textContent())!;
    await page.getByRole("button", { name: "Open details", exact: true }).click();

    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { level: 2 })).toHaveText(poiName);
    await expect(panel.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(panel.locator(".poi-panel__facts li").first()).toBeVisible();

    const source = panel.getByRole("link", { name: /Learn more/ });
    await expect(source).toHaveAttribute("href", /^https:\/\//);
    await expect(source).toHaveAttribute("target", "_blank");
    await expect(source).toHaveAttribute("rel", "noreferrer");

    // Escape closes the panel, not the planet view.
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expectPlanetView(page, "Mars");
  });

  test("follows Next while open and closes with its X", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "On phones the bottom sheet covers Previous / Next");
    await openApp(page, "jupiter");
    await expectPlanetView(page, "Jupiter");
    await page.getByRole("button", { name: "Open details", exact: true }).click();
    const title = page.getByRole("dialog").getByRole("heading", { level: 2 });
    const first = (await title.textContent())!;
    await page.getByRole("button", { name: "Next point of interest" }).click();
    await expect(title).not.toHaveText(first);
    await page.getByRole("button", { name: "Close details" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("opens from a surface marker", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "Markers are small targets; covered on desktop");
    await openApp(page, "earth");
    await expectPlanetView(page, "Earth");
    const marker = page.locator(".poi-marker").filter({ visible: true }).first();
    await marker.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("overview details", () => {
  test("opens a spacecraft", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "Spacecraft are checked on desktop");
    await openApp(page);
    await page.getByRole("button", { name: /^Voyager 1, launched/ }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toHaveText("Voyager 1");
  });

  test("opens a belt", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Asteroid Belt\./ }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toHaveText("Asteroid Belt");
  });
});

test.describe("credits", () => {
  test("lists textures, fonts, and sources, with safe outbound links", async ({ page }) => {
    await openApp(page);
    const toggle = page.getByRole("button", { name: "Credits", exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = page.getByRole("dialog");
    await expect(panel).toContainText("Solar System Scope");
    await expect(panel).toContainText("CC BY 4.0");
    await expect(panel).toContainText("Cormorant Garamond");
    for (const link of await panel.getByRole("link").all()) {
      await expect(link).toHaveAttribute("href", /^https:\/\//);
      await expect(link).toHaveAttribute("rel", "noreferrer");
    }
    await page.getByRole("button", { name: "Close credits" }).click();
    await expect(panel).toHaveCount(0);
  });
});
