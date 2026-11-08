import { VIEWABLE } from "../src/data/solarSystem";
import { PAGES } from "../src/lib/routes";
import { expectOverview, expectPlanetView, openApp, test, expect } from "./fixtures";

/** Pull one tag's attribute out of raw HTML, as a crawler that runs no JavaScript sees it. */
const attr = (html: string, pattern: RegExp) => html.match(pattern)?.[1];

test.describe("pages for search engines", () => {
  for (const body of VIEWABLE) {
    test(`/${body.id} serves its own prerendered page`, async ({ request }) => {
      const res = await request.get(`/${body.id}`);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<title>${body.name} · Solar System Explorer</title>`);
      expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toMatch(new RegExp(`/${body.id}$`));
      expect(attr(html, /<meta name="description" content="([^"]+)"/)!.length).toBeLessThanOrEqual(160);
      expect(attr(html, /<meta property="og:image" content="([^"]+)"/)).toMatch(new RegExp(`/og/${body.id}\\.jpg$`));
      expect(html).toContain(`<h1>${body.name}</h1>`);
      for (const poi of body.pois) expect(html).toContain(poi.name.replace(/&/g, "&amp;"));
      const ld = JSON.parse(attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/)!);
      expect(JSON.stringify(ld)).toContain(body.wikipedia);
    });
  }

  test("the home page links to every world", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toMatch(/<title>Solar System Explorer · /);
    for (const body of VIEWABLE) expect(html).toContain(`<a href="/${body.id}">`);
  });

  test("serves the neighbourhood and its stars as their own pages", async ({ request }) => {
    const html = await (await request.get("/neighbourhood")).text();
    expect(html).toContain("<title>Solar System Explorer · The Sun's nearest stars</title>");
    expect(html).toContain('<a href="/sirius">Sirius</a>');
    const sirius = await (await request.get("/sirius")).text();
    expect(sirius).toContain("<h1>Sirius</h1>");
    expect(sirius).toContain("8.6 light-years from the Sun");
    // No share image yet: a small card, not a broken large one.
    expect(sirius).toContain('<meta name="twitter:card" content="summary" />');
  });

  test("lists every page in sitemap.xml, linked from robots.txt", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap.match(/<loc>/g)).toHaveLength(PAGES.length);
    expect(await (await request.get("/robots.txt")).text()).toMatch(/^Sitemap: .+\/sitemap\.xml$/m);
  });

  test("redirects a trailing slash to the clean URL", async ({ request }) => {
    const res = await request.get("/mars/", { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toBe("/mars");
  });
});

test.describe("prerendered text", () => {
  test("is replaced by the app", async ({ page }) => {
    await openApp(page, "jupiter");
    await expectPlanetView(page, "Jupiter");
    await expect(page.locator(".prerendered")).toHaveCount(0);
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("is readable", async ({ page }) => {
      await page.goto("/saturn");
      await expect(page.getByRole("heading", { level: 1, name: "Saturn" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("link", { name: "Mars" })).toBeVisible();
    });
  });
});

test.describe("icons", () => {
  for (const path of ["/", "/mars", "/no-such-world"]) {
    test(`${path} links the favicon, touch icon, and manifest`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      for (const [rel, href, type] of [
        ["icon", "/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
        ["icon", "/favicon.svg", /image\/svg\+xml/],
        ["apple-touch-icon", "/apple-touch-icon.png", /image\/png/],
        ["manifest", "/site.webmanifest", /json|manifest/],
      ] as const) {
        expect(html, `${path} ${href}`).toContain(`<link rel="${rel}"`);
        expect(html, `${path} ${href}`).toContain(`href="${href}"`);
        const res = await request.get(href);
        expect(res.status(), href).toBe(200);
        expect(res.headers()["content-type"], href).toMatch(type);
      }
    });
  }
});

test.describe("404", () => {
  // The browser logs the 404 response itself as a console error.
  test.use({ allowErrors: true });

  test("shows the custom page with a 404 status and a way home", async ({ page }) => {
    const res = await page.goto("/no-such-world");
    expect(res!.status()).toBe(404);
    await expect(page).toHaveTitle(/Beyond the charted sky/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Beyond the charted sky");
    await page.addInitScript(() => sessionStorage.setItem("sse-entrance-played", "1"));
    await page.getByRole("link", { name: "Return to the system" }).click();
    await expectOverview(page);
  });

  test("uses the point-of-light cursor, wider over links, within the CSP", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { cspViolations: string[] }).cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        (window as unknown as { cspViolations: string[] }).cspViolations.push(e.blockedURI),
      );
    });
    await page.goto("/no-such-world");
    const cursor = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).cursor);
    expect(await cursor("body")).toMatch(/^url\(.+\) 16 16, auto$/);
    const link = await cursor(".lost__home");
    expect(link).toMatch(/^url\(.+\) 32 32, url\(.+\) 16 16, pointer$/);
    expect(link).not.toBe(await cursor("body"));
    expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
  });

  test.describe("on touch screens", () => {
    test.use({ hasTouch: true, isMobile: true });
    test("keeps the system cursor", async ({ page }) => {
      await page.goto("/no-such-world");
      expect(await page.locator("body").evaluate((el) => getComputedStyle(el).cursor)).toBe("auto");
    });
  });

  test("covers missing files too", async ({ request }) => {
    expect((await request.get("/assets/missing.js")).status()).toBe(404);
  });
});
