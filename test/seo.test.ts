import { describe, expect, it } from "vitest";
import { renderPage } from "../scripts/prerender";
import { VIEWABLE } from "../src/data/solarSystem";
import { pagePath, pageTitle } from "../src/lib/seo";

const TEMPLATE = `<!doctype html><html><head><title>x</title>
<!--seo-->
</head><body><div id="root"></div></body></html>`;

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("pageTitle", () => {
  it("names the open world, as its prerendered page does", () => {
    for (const body of [undefined, ...VIEWABLE]) {
      const html = renderPage(TEMPLATE, "https://example.com", body);
      expect(html, body?.id ?? "overview").toContain(`<title>${escapeHtml(pageTitle(body))}</title>`);
    }
  });

  it("gives every world its own title", () => {
    const titles = [undefined, ...VIEWABLE].map((b) => pageTitle(b));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("pagePath", () => {
  it("puts worlds under the base path, and the overview at it", () => {
    expect(pagePath("mars")).toBe(`${import.meta.env.BASE_URL}mars`);
    expect(pagePath(null)).toBe(import.meta.env.BASE_URL);
  });
});
