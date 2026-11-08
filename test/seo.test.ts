import { describe, expect, it } from "vitest";
import { renderPage } from "../scripts/prerender";
import { HOME, PAGES, routeFor } from "../src/lib/routes";
import { pagePath, pageTitle } from "../src/lib/seo";

const TEMPLATE = `<!doctype html><html><head><title>x</title>
<!--seo-->
</head><body><div id="root"></div></body></html>`;

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("pageTitle", () => {
  it("names the open world, as its prerendered page does", () => {
    for (const route of PAGES) {
      const html = renderPage(TEMPLATE, "https://example.com", route);
      expect(html, route.body?.id ?? route.plate.id).toContain(`<title>${escapeHtml(pageTitle(route))}</title>`);
    }
  });

  it("gives every world its own title", () => {
    const titles = PAGES.map((r) => pageTitle(r));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("pagePath", () => {
  it("puts worlds under the base path, and the overview at it", () => {
    expect(pagePath(routeFor("mars")!)).toBe(`${import.meta.env.BASE_URL}mars`);
    expect(pagePath(HOME)).toBe(import.meta.env.BASE_URL);
  });
});
