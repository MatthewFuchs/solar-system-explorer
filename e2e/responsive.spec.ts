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

/** Each plate's overview, and the screens where its labels are known to collide. */
const PLATES = [
  { path: "", name: "solar system", known: KNOWN_LABEL_COLLISIONS },
  { path: "neighbourhood", name: "neighbourhood", known: new Set<string>() },
  { path: "milky-way", name: "Milky Way", known: new Set<string>() },
];

/** The text's own bounds of each label's name (not its box, which may stretch wider than the word). */
const nameRects = () =>
  [...document.querySelectorAll<HTMLElement>(".dest-label")].map((label) => {
    const range = document.createRange();
    range.selectNodeContents(label.querySelector(".dest-label__name")!);
    const r = range.getBoundingClientRect();
    return { id: label.dataset.planet, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;

  test.describe(size, () => {
    test.use({ viewport });

    for (const plate of PLATES) {
      test(`fits the ${plate.name} without sideways scrolling`, async ({ page }) => {
        await openApp(page, plate.path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        for (const name of await page.locator(".dest-label__name").all()) {
          const box = (await name.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        }
      });

      test(`keeps the ${plate.name}'s names from overlapping`, async ({ page }) => {
        test.fail(plate.known.has(size), "known collision among the outer planets");
        await openApp(page, plate.path);
        const names = await page.evaluate(nameRects);
        const hits: string[] = [];
        for (let i = 0; i < names.length; i++)
          for (let j = i + 1; j < names.length; j++) {
            const [a, b] = [names[i], names[j]];
            const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (x > 2 && y > 2) hits.push(`${a.id}/${b.id}`);
          }
        expect(hits).toEqual([]);
      });
    }

    test("keeps the neighbourhood's star names clear of the title, credit line, and dial numerals", async ({ page }) => {
      await openApp(page, "neighbourhood");
      const names = await page.evaluate(nameRects);
      const numerals = await page.locator(".hud-chart__label").all();
      expect(numerals).toHaveLength(4);
      for (const target of [page.locator(".plate-title h1"), page.locator(".plate-credit"), ...numerals]) {
        const r = (await target.boundingBox())!;
        const selector = (await target.textContent())?.slice(0, 20);
        for (const n of names) {
          const x = Math.min(n.right, r.x + r.width) - Math.max(n.left, r.x);
          const y = Math.min(n.bottom, r.y + r.height) - Math.max(n.top, r.y);
          expect(x > 2 && y > 2, `${n.id} overlaps ${selector}`).toBe(false);
        }
      }
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
