import { expectPlanetView, openApp, test, expect } from "./fixtures";

/** The viewports the project is checked at after layout changes (CLAUDE.md). */
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 375, height: 667 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

/**
 * Known label collisions among the crowded outer planets on some portrait screens,
 * kept as expected failures so they show up (and flip to passing) when the layout
 * is fixed. See src/scene/layout/solarPlate.ts.
 */
const KNOWN_LABEL_COLLISIONS = new Set(["768x1024", "360x740", "375x667"]);

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;

  test.describe(size, () => {
    test.use({ viewport });

    test("fits the overview without sideways scrolling", async ({ page }) => {
      await openApp(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      for (const name of await page.locator(".dest-label__name").all()) {
        const box = (await name.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    });

    test("keeps planet names from overlapping", async ({ page }) => {
      test.fail(KNOWN_LABEL_COLLISIONS.has(size), "known collision among the outer planets");
      await openApp(page);
      const overlaps = await page.evaluate(() => {
        const names = [...document.querySelectorAll<HTMLElement>(".dest-label")].map((label) => ({
          id: label.dataset.planet,
          // The text's own bounds, not its box, which may stretch wider than the word.
          r: (() => {
            const range = document.createRange();
            range.selectNodeContents(label.querySelector(".dest-label__name")!);
            return range.getBoundingClientRect();
          })(),
        }));
        const hits: string[] = [];
        for (let i = 0; i < names.length; i++)
          for (let j = i + 1; j < names.length; j++) {
            const a = names[i].r;
            const b = names[j].r;
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (x > 2 && y > 2) hits.push(`${names[i].id}/${names[j].id}`);
          }
        return hits;
      });
      expect(overlaps).toEqual([]);
    });

    test("lays out the planet view", async ({ page }) => {
      await openApp(page, "saturn");
      await expectPlanetView(page, "Saturn");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.getByRole("button", { name: "Back to the system" })).toBeInViewport();
      await page.getByRole("button", { name: "Open details", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeInViewport();
    });
  });
}

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("drop the Overview link", async ({ page }) => {
    await openApp(page, "mars");
    await expectPlanetView(page, "Mars");
    await expect(page.getByRole("link", { name: "Overview" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Back to the system" })).toBeVisible();
  });
});
