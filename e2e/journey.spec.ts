import { expectPlanetView, openApp, test, expect } from "./fixtures";

const logbook = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Logbook" });
const stored = (page: import("@playwright/test").Page) => page.evaluate(() => JSON.parse(localStorage.getItem("sse-journey-v1") ?? "null"));

test.describe("the logbook", () => {
  test("stays hidden on a first visit, with nothing found", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Mars,/ }).click();
    await expectPlanetView(page, "Mars");
    await expect(logbook(page)).toHaveCount(0);
    await expect(page.locator(".discovery__line")).toHaveCount(0);
  });

  test("appears with the first discovery, which is noted quietly and inked into it", async ({ page }) => {
    await openApp(page, "neighbourhood");
    await page.getByRole("button", { name: /^Sirius,/ }).click();
    // The line is brief by design: catch it while it shows, before waiting out the zoom.
    await expect(page.getByRole("status")).toContainText("Beyond the Sun");
    await expectPlanetView(page, "Sirius");
    await logbook(page).click();
    const panel = page.getByRole("dialog", { name: "Logbook" });
    await expect(panel.locator('.logbook__entry[data-found="true"]')).toContainText("Alpha Centauri");
    // What isn't found yet shows only its clue.
    await expect(panel.locator('.logbook__entry[data-found="false"]').first()).toContainText("Not yet found");
    await expect(panel).not.toContainText("The Grand Tour");
  });

  test("keeps its entries through a reload, without announcing them again", async ({ page }) => {
    await openApp(page, "milky-way");
    await expect(page.getByRole("status")).toContainText("The Edge of the Map");
    await page.reload();
    await expect(page.locator(".plate")).toHaveAttribute("data-entrance", "done");
    await expect(logbook(page)).toBeVisible();
    await expect(page.locator(".discovery__line")).toHaveCount(0);
  });

  test("forgets the journey when asked, after a second thought", async ({ page }) => {
    await openApp(page, "sagittarius-a");
    await logbook(page).click();
    await page.getByRole("button", { name: "Forget my journey" }).click();
    await page.getByRole("button", { name: "Keep it" }).click();
    await page.getByRole("button", { name: "Forget my journey" }).click();
    await page.getByRole("button", { name: "Forget", exact: true }).click();
    await expect(logbook(page)).toHaveCount(0);
    expect(await stored(page)).toBeNull();
  });

  test("notes each point of interest read, once", async ({ page }) => {
    await openApp(page, "jupiter");
    await expectPlanetView(page, "Jupiter");
    await page.getByRole("button", { name: "Open details", exact: true }).click();
    await page.getByRole("button", { name: "Next point of interest" }).click();
    await page.getByRole("button", { name: "Previous point of interest" }).click();
    await expect.poll(async () => (await stored(page))?.read.length).toBe(2);
    expect((await stored(page)).visited).toEqual(expect.arrayContaining(["plate:solar", "jupiter"]));
  });
});
