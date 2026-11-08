import { expectOverview, expectPlanetView, openApp, test, expect } from "./fixtures";

test.describe("overview", () => {
  test("shows the title, the Sun, every world, and the 3D scene", async ({ page }) => {
    await openApp(page);
    await expect(page).toHaveTitle(/^Solar System Explorer · /);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const name of ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${name},`) })).toBeAttached();
    }
    await expect(page.locator(".plate-canvas canvas")).toBeVisible();
  });

  test("plays the entrance once per session", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".plate")).toHaveAttribute("data-entrance", /playing|fade/);
    await expect(page.locator(".plate")).toHaveAttribute("data-entrance", "done", { timeout: 10_000 });
    await page.reload();
    await expect(page.locator(".plate")).toHaveAttribute("data-entrance", "done");
  });
});

test.describe("private browsing", () => {
  test("plays the entrance and works when session storage is blocked", async ({ page }) => {
    await page.addInitScript(() =>
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      }),
    );
    await page.goto("/");
    await expect(page.locator(".plate")).toHaveAttribute("data-entrance", "done", { timeout: 10_000 });
    await page.getByRole("button", { name: /^Mars,/ }).click();
    await expectPlanetView(page, "Mars");
  });
});

test.describe("cursor", () => {
  test("is a point of light that follows the mouse and brightens over a world", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "Touch screens keep no cursor");
    await openApp(page);
    const cursor = page.locator(".plate-cursor");
    await expect(cursor).toHaveAttribute("data-visible", "false");
    await page.mouse.move(400, 300);
    await expect(cursor).toHaveAttribute("data-visible", "true");
    await expect
      .poll(() => cursor.evaluate((el) => (new DOMMatrix(getComputedStyle(el).transform).m41 + new DOMMatrix(getComputedStyle(el).transform).m42)))
      .toBeCloseTo(700, 0);
    await page.getByRole("button", { name: /^Mars,/ }).hover();
    await expect(cursor).toHaveAttribute("data-active", "true");
  });

  test("hides when the pointer leaves the window or the window loses focus", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "Touch screens keep no cursor");
    await openApp(page);
    const cursor = page.locator(".plate-cursor");
    await page.mouse.move(400, 300);
    await expect(cursor).toHaveAttribute("data-visible", "true");

    // An element vanishing under a still pointer is not leaving: the cursor stays.
    await page.evaluate(() => document.dispatchEvent(new MouseEvent("mouseout", { clientX: 400, clientY: 300 })));
    await expect(cursor).toHaveAttribute("data-visible", "true");
    await page.evaluate(() => document.dispatchEvent(new MouseEvent("mouseout", { clientX: 0, clientY: 200 })));
    await expect(cursor).toHaveAttribute("data-visible", "false");

    await page.mouse.move(420, 320);
    await expect(cursor).toHaveAttribute("data-visible", "true");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(cursor).toHaveAttribute("data-visible", "false");
  });

  test("is left to the system on touch screens", async ({ page, isMobile }) => {
    test.skip(isMobile !== true, "Checked on the phone project");
    await openApp(page);
    await expect(page.locator(".plate-cursor")).toBeHidden();
  });
});

test.describe("hover", () => {
  test("lights the hovered world, unfolds its tagline, and dims the rest", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "Touch screens have no hover");
    await openApp(page);
    const label = (id: string) => page.locator(`.dest-label[data-planet="${id}"]`);
    await expect(label("mars")).toHaveAttribute("data-state", "rest");
    const tagline = label("mars").locator(".dest-label__more");
    const folded = (await tagline.boundingBox())?.height ?? 0;

    await page.getByRole("button", { name: /^Mars,/ }).hover();
    await expect(label("mars")).toHaveAttribute("data-state", "active");
    for (const id of ["sun", "earth", "jupiter", "pluto"]) await expect(label(id)).toHaveAttribute("data-state", "dimmed");
    await expect.poll(async () => (await tagline.boundingBox())?.height ?? 0).toBeGreaterThan(folded);

    await page.mouse.move(5, 450);
    await expect(label("mars")).toHaveAttribute("data-state", "rest");
    await expect(label("earth")).toHaveAttribute("data-state", "rest");
  });
});

test.describe("planet view", () => {
  test("opens from the keyboard", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Earth,/ }).focus();
    await page.keyboard.press("Enter");
    await expectPlanetView(page, "Earth");
    await expect(page).toHaveURL(/\/earth$/);
  });

  test("turns back cleanly when interrupted mid-zoom", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Mars,/ }).click();
    await expect(page.locator(".feature")).toHaveAttribute("data-phase", "entering");
    await page.keyboard.press("Escape");
    await expectOverview(page);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    await expect(page).toHaveTitle(/^Solar System Explorer · /);
    // And the next trip still works.
    await page.getByRole("button", { name: /^Mars,/ }).click();
    await expectPlanetView(page, "Mars");
  });

  test("opens a planet on click and records it in the URL", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Mars,/ }).click();
    await expect(page).toHaveURL(/\/mars$/);
    await expect(page).toHaveTitle("Mars · Solar System Explorer");
    await expectPlanetView(page, "Mars");
    await expect(page.getByText("from the Sun")).toBeVisible();
  });

  test("opens directly from a link", async ({ page }) => {
    await openApp(page, "saturn");
    await expectPlanetView(page, "Saturn");
  });

  test("opens the Sun and Pluto", async ({ page }) => {
    await openApp(page, "sun");
    await expectPlanetView(page, "Sun");
    await page.goto("/pluto");
    await expectPlanetView(page, "Pluto");
    await expect(page.locator(".feature__numeral")).toHaveText("Dwarf planet");
  });

  test("returns with Back to the system", async ({ page }) => {
    await openApp(page, "earth");
    await expectPlanetView(page, "Earth");
    await page.getByRole("button", { name: "Back to the system" }).click();
    await expectOverview(page);
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    await expect(page).toHaveTitle(/^Solar System Explorer/);
  });

  test("returns with Escape", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Jupiter,/ }).click();
    await expectPlanetView(page, "Jupiter");
    await page.keyboard.press("Escape");
    await expectOverview(page);
  });

  test("follows the browser's back and forward buttons", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Venus,/ }).click();
    await expectPlanetView(page, "Venus");
    await page.goBack();
    await expectOverview(page);
    await page.goForward();
    await expectPlanetView(page, "Venus");
  });

  test("steps through points of interest", async ({ page }) => {
    await openApp(page, "mars");
    await expectPlanetView(page, "Mars");
    const count = page.locator(".feature__count");
    const first = await page.locator(".feature__poi-name").textContent();
    await expect(count).toHaveText(/^1 of \d+$/);
    await page.getByRole("button", { name: "Next point of interest" }).click();
    await expect(count).toHaveText(/^2 of /);
    await expect(page.locator(".feature__poi-name")).not.toHaveText(first!);
    await page.getByRole("button", { name: "Previous point of interest" }).click();
    await page.getByRole("button", { name: "Previous point of interest" }).click();
    await expect(count).not.toHaveText(/^1 of /); // wraps around to the last
  });

  test("turns old #links into page URLs", async ({ page }) => {
    await openApp(page, "#mars");
    await expectPlanetView(page, "Mars");
    await expect(page).toHaveURL(/\/mars$/);
  });

  test("ignores unknown and malformed hashes", async ({ page }) => {
    await openApp(page, "#atlantis");
    await expectOverview(page);
    await page.goto("/#%");
    await expectOverview(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("dissolves between views instead of zooming", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /^Neptune,/ }).click();
    await expectPlanetView(page, "Neptune");
    await page.getByRole("button", { name: "Back to the system" }).click();
    await expectOverview(page);
  });
});

test.describe("masthead", () => {
  test("toggles sound and spacecraft", async ({ page, isMobile }) => {
    await openApp(page);
    const sound = page.getByRole("button", { name: "Sound" });
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "false");

    test.skip(isMobile === true, "Spacecraft toggle is checked on desktop");
    const craft = page.getByRole("button", { name: "Spacecraft", exact: true });
    await expect(craft).toHaveAttribute("aria-pressed", "true");
    await craft.click();
    await expect(craft).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".craft-layer")).toHaveAttribute("data-shown", "false");
  });

  test("brand link returns to the overview", async ({ page, isMobile }) => {
    test.skip(isMobile === true, "Phones hide the brand link; Back covers it");
    await openApp(page, "uranus");
    await expectPlanetView(page, "Uranus");
    await page.getByRole("link", { name: "Solar System Explorer" }).click();
    await expectOverview(page);
  });
});
