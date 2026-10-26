import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { DESTINATIONS, SITE, VIEWABLE, isSurfacePOI, type CelestialBody, type POIStat } from "../src/data/solarSystem.ts";
import { bodyMark, formatAU } from "../src/lib/format.ts";
import { pageTitle } from "../src/lib/seo.ts";
import { notFoundChart, notFoundStars } from "./notFoundChart.ts";

/**
 * Search engines ignore the app's JavaScript-drawn text, so the build writes a real HTML
 * page for the overview and for each world (`/mars` from `dist/mars.html`), filled from
 * the data file: its own title, description, canonical URL, share tags, structured data,
 * and the world's text inside #root. React replaces that text when the app starts; it
 * is the same text the app shows. Also writes sitemap.xml and robots.txt.
 */

/** Where the site lives: SITE_URL if set, else Vercel's production URL, else local preview. */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const url = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:4173");
  return url.replace(/\/+$/, "");
}

const MAX_DESCRIPTION = 160;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A search-result description: whole words, within the length search engines show. */
export function describe(body?: CelestialBody): string {
  const text = body ? `${body.tagline} ${body.pois[0]?.summary ?? ""}`.trim() : SITE.description;
  if (text.length <= MAX_DESCRIPTION) return text;
  return `${text.slice(0, MAX_DESCRIPTION - 1).replace(/\s+\S*$/, "")}…`;
}

const order = (body: CelestialBody) => DESTINATIONS.indexOf(body) + 1;

function statsHtml(stats: POIStat[] | undefined) {
  if (!stats?.length) return "";
  const items = stats.map((s) => `<div><dt>${escape(s.label)}</dt><dd>${escape(s.value)}${s.unit ? ` ${escape(s.unit)}` : ""}</dd></div>`);
  return `<dl>${items.join("")}</dl>`;
}

function worldsNav(current?: CelestialBody) {
  const links = VIEWABLE.map((b) =>
    b === current ? `<li aria-current="page">${escape(b.name)}</li>` : `<li><a href="/${b.id}">${escape(b.name)}</a></li>`,
  );
  return `<nav aria-label="Worlds"><ul>${current ? `<li><a href="/">${escape(SITE.title)}</a></li>` : ""}${links.join("")}</ul></nav>`;
}

/** The world's text, as the app shows it across the planet view and its detail panels. */
function articleHtml(body?: CelestialBody) {
  if (!body) {
    return `<article class="prerendered"><h1>${escape(SITE.title)}</h1><p>${escape(SITE.intro)}</p>${worldsNav()}</article>`;
  }
  const pois = body.pois.map(
    (poi) =>
      `<section><h3>${escape(poi.name)}</h3><p>${escape(poi.summary)}</p>${statsHtml(poi.stats)}<ul>${poi.facts
        .map((f) => `<li>${escape(f)}</li>`)
        .join("")}</ul><p><a href="${escape(poi.source.url)}" rel="noreferrer">Learn more on ${escape(poi.source.label)}</a></p></section>`,
  );
  const surface = body.pois.some(isSurfacePOI);
  return `<article class="prerendered"><p>${escape(bodyMark(body.kind, order(body)))}</p><h1>${escape(body.name)}</h1><p>${escape(
    body.tagline,
  )}</p>${body.distanceAU !== undefined ? `<p>${formatAU(body.distanceAU)} from the Sun</p>` : ""}${statsHtml(body.stats)}<h2>${
    surface ? "Points of interest" : "Around it"
  }</h2>${pois.join("")}${worldsNav(body)}</article>`;
}

function structuredData(site: string, body?: CelestialBody) {
  const website = { "@type": "WebSite", "@id": `${site}/#website`, name: SITE.name, url: `${site}/`, description: SITE.description };
  const graph: object[] = [website];
  if (body) {
    const url = `${site}/${body.id}`;
    graph.push(
      {
        "@type": "WebPage",
        url,
        name: pageTitle(body),
        description: describe(body),
        isPartOf: { "@id": website["@id"] },
        about: { "@type": "Thing", name: body.name, sameAs: body.wikipedia },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE.title, item: `${site}/` },
          { "@type": "ListItem", position: 2, name: body.name, item: url },
        ],
      },
    );
  }
  // "<" is escaped so the data can never close its script tag.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

/** One page: the built index.html with this page's head tags and text. */
export function renderPage(template: string, site: string, body?: CelestialBody, hasImage = false): string {
  const url = body ? `${site}/${body.id}` : `${site}/`;
  const title = pageTitle(body);
  const description = describe(body);
  const image = hasImage ? `${site}/og/${body?.id ?? "home"}.jpg` : null;
  const head = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(SITE.name)}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    ...(image
      ? [
          `<meta property="og:image" content="${image}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
        ]
      : [`<meta name="twitter:card" content="summary" />`]),
    `<script type="application/ld+json">${structuredData(site, body)}</script>`,
  ].join("\n    ");

  if (!template.includes("<!--seo-->") || !template.includes('<div id="root"></div>')) {
    throw new Error("prerender: index.html needs a <!--seo--> marker and an empty #root");
  }
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace("<!--seo-->", head)
    .replace('<div id="root"></div>', `<div id="root">${articleHtml(body)}</div>`);
}

/** The 404 page, with its astrolabe drawn and its line of links to every world filled in. */
export function notFoundPage(template: string): string {
  const links = VIEWABLE.map((b) => `<li><a href="/${b.id}">${escape(b.name)}</a></li>`).join("");
  return template
    .replace("<!--chart-->", notFoundStars() + notFoundChart())
    .replace("<!--worlds-->", `<ul class="lost__worlds" aria-label="Worlds">${links}</ul>`);
}

export function sitemap(site: string): string {
  const urls = [`${site}/`, ...VIEWABLE.map((b) => `${site}/${b.id}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`;
}

export function robots(site: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`;
}

/** Vite plugin: after a production build, write the pages, sitemap.xml, and robots.txt. */
export function prerender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "prerender",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      const out = config.build.outDir;
      const site = siteUrl();
      const template = readFileSync(join(out, "index.html"), "utf8");
      const hasImage = (id: string) => existsSync(join(config.publicDir, "og", `${id}.jpg`));
      writeFileSync(join(out, "index.html"), renderPage(template, site, undefined, hasImage("home")));
      for (const body of VIEWABLE) writeFileSync(join(out, `${body.id}.html`), renderPage(template, site, body, hasImage(body.id)));
      writeFileSync(join(out, "sitemap.xml"), sitemap(site));
      writeFileSync(join(out, "robots.txt"), robots(site));
      config.logger.info(`prerender: ${VIEWABLE.length + 1} pages for ${site}`);
    },
  };
}

/**
 * Vite plugin: draws the 404 page's astrolabe and world links (in dev and in the build),
 * and makes the dev server answer unknown paths with it, as Vercel and `vite preview` do.
 */
export function notFound(): Plugin {
  const worlds = new Set(VIEWABLE.map((b) => `/${b.id}`));
  return {
    name: "not-found-page",
    transformIndexHtml: {
      order: "pre",
      handler: (html, ctx) => (ctx.filename.endsWith("404.html") ? notFoundPage(html) : html),
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? "/").split("?")[0].replace(/\/$/, "") || "/";
        // Only page requests: not Vite's own modules, source files, or assets with an extension.
        const isPage = req.headers.accept?.includes("text/html") && !/^\/(@|src\/|node_modules\/)/.test(path) && !/\.[a-z0-9]+$/i.test(path);
        if (!isPage || path === "/" || worlds.has(path)) return next();
        try {
          const raw = readFileSync(join(server.config.root, "404.html"), "utf8");
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(await server.transformIndexHtml("/404.html", raw));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}
