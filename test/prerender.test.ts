import { describe, expect, it } from "vitest";
import { describe as describePage, notFoundPage, renderPage, robots, siteUrl, sitemap } from "../scripts/prerender";
import { VIEWABLE } from "../src/data/solarSystem";

const TEMPLATE = `<!doctype html><html><head><title>Solar System Explorer</title>
<!--seo-->
</head><body><div id="root"></div></body></html>`;
const SITE = "https://example.com";
const mars = VIEWABLE.find((b) => b.id === "mars")!;

describe("siteUrl", () => {
  it("prefers SITE_URL, then Vercel's production URL, then local preview", () => {
    expect(siteUrl({ SITE_URL: "https://stars.example/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://stars.example");
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://x.vercel.app");
    expect(siteUrl({})).toBe("http://localhost:4173");
  });
});

describe("descriptions", () => {
  it("stay within 160 characters and end on a whole word", () => {
    for (const body of [undefined, ...VIEWABLE]) {
      const d = describePage(body);
      expect(d.length).toBeLessThanOrEqual(160);
      expect(d).not.toMatch(/\s…$/);
    }
  });
});

describe("renderPage", () => {
  const html = renderPage(TEMPLATE, SITE, mars, true);

  it("replaces the title and fills the head", () => {
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain("<title>Mars · Solar System Explorer</title>");
    expect(html).toContain(`<link rel="canonical" href="${SITE}/mars" />`);
    expect(html).toContain(`<meta property="og:image" content="${SITE}/og/mars.jpg" />`);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it("writes valid structured data about the world", () => {
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
    const data = JSON.parse(json);
    const page = data["@graph"].find((n: { "@type": string }) => n["@type"] === "WebPage");
    expect(page.about.sameAs).toBe(mars.wikipedia);
    expect(json).not.toContain("<");
  });

  it("puts the world's text in #root, escaped", () => {
    expect(html).toContain('<div id="root"><article class="prerendered">');
    expect(html).toContain("<h1>Mars</h1>");
    for (const poi of mars.pois) expect(html).toContain(poi.summary.replace(/&/g, "&amp;").replace(/"/g, "&quot;"));
    expect(renderPage(TEMPLATE, SITE)).toContain('<a href="/mars">Mars</a>');
  });

  it("links under the site's base path (GitHub Pages)", () => {
    const site = "https://someone.github.io/repo";
    const page = renderPage(TEMPLATE, site, mars, true, "/repo/");
    expect(page).toContain(`<link rel="canonical" href="${site}/mars" />`);
    expect(page).toContain('<a href="/repo/">');
    expect(page).toContain('<a href="/repo/earth">Earth</a>');
    expect(page).not.toMatch(/href="\/(?!repo\/)[a-z]/);
  });

  it("falls back to a small card without a share image", () => {
    expect(renderPage(TEMPLATE, SITE, mars, false)).toContain('<meta name="twitter:card" content="summary" />');
  });

  it("refuses a template without its markers", () => {
    expect(() => renderPage("<html></html>", SITE)).toThrow(/seo/);
  });
});

describe("crawling files", () => {
  it("list every page and point to the sitemap", () => {
    expect(sitemap(SITE).match(/<loc>/g)).toHaveLength(VIEWABLE.length + 1);
    expect(robots(SITE)).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});

describe("notFoundPage", () => {
  const html = notFoundPage("<main><!--chart--><!--worlds--></main>");

  it("draws the astrolabe, its rule pointing to the uncharted place", () => {
    expect(html).toContain('<svg class="astrolabe"');
    expect(html).toContain('class="rule"');
    expect(html).toContain(">Uncharted<");
    for (const body of VIEWABLE.filter((b) => b.kind !== "star")) expect(html).toContain(`>${body.name}</textPath>`);
    expect(html).not.toMatch(/NaN/);
  });

  it("links every world", () => {
    for (const body of VIEWABLE) expect(html).toContain(`<a href="/${body.id}">${body.name}</a>`);
  });

  it("links under the site's base path (GitHub Pages)", () => {
    const page = notFoundPage('<main><a class="lost__home" href="/">Home</a><!--chart--><!--worlds--></main>', "/repo/");
    expect(page).toContain('<a class="lost__home" href="/repo/">');
    for (const body of VIEWABLE) expect(page).toContain(`<a href="/repo/${body.id}">${body.name}</a>`);
  });
});
