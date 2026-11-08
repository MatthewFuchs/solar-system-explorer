import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { describe as describePage, notFound, prerender } from "../scripts/prerender";
import { previewNotFound } from "../scripts/previewNotFound";
import { VIEWABLE } from "../src/data/solarSystem";
import { PAGES, routeFor } from "../src/lib/routes";

type Handler = (req: { url?: string; headers: Record<string, string> }, res: FakeRes, next: (err?: unknown) => void) => unknown;
type FakeRes = { statusCode: number; headers: Record<string, string>; body?: string; setHeader(k: string, v: string): void; end(b?: unknown): void };

const hook = <T>(fn: unknown) => fn as (...args: unknown[]) => T;

/** Run one request through a middleware; report whether it passed it on, or what it sent. */
async function request(handler: Handler, url: string, accept = "text/html") {
  const res: FakeRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    end(b) {
      this.body = b === undefined ? "" : String(b);
    },
  };
  let passed = false;
  await handler({ url, headers: { accept } }, res, () => (passed = true));
  return { passed, status: res.statusCode, location: res.headers.location, body: res.body };
}

const dirs: string[] = [];
const tempDir = () => {
  const d = mkdtempSync(join(tmpdir(), "sse-"));
  dirs.push(d);
  return d;
};
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A small built site: pages, the 404, and an asset. */
function builtSite() {
  const root = tempDir();
  const out = join(root, "dist");
  mkdirSync(join(out, "assets"), { recursive: true });
  for (const f of ["index.html", "mars.html", "404.html", "assets/app.js"]) writeFileSync(join(out, f), f);
  writeFileSync(join(root, "secret.txt"), "outside the build");
  return { root, out };
}

function previewHandler(base: string) {
  const { root } = builtSite();
  let handler!: Handler;
  hook(previewNotFound().configurePreviewServer)({
    config: { root, base, build: { outDir: "dist" } },
    middlewares: { use: (h: Handler) => (handler = h) },
  });
  return handler;
}

describe("preview server (mirrors Vercel)", () => {
  const handler = previewHandler("/");

  it("serves pages and files that exist", async () => {
    for (const url of ["/", "/mars", "/mars.html", "/assets/app.js", "/mars?ref=x"]) expect((await request(handler, url)).passed, url).toBe(true);
  });

  it("answers anything else with the 404 page and status", async () => {
    for (const url of ["/atlantis", "/assets/missing.js"]) {
      const r = await request(handler, url);
      expect(r, url).toMatchObject({ passed: false, status: 404, body: "404.html" });
    }
  });

  it("redirects a trailing slash permanently, keeping the query", async () => {
    expect(await request(handler, "/mars/")).toMatchObject({ status: 308, location: "/mars" });
    expect(await request(handler, "/mars/?ref=x")).toMatchObject({ status: 308, location: "/mars?ref=x" });
  });

  it("leaves paths that climb out of the build folder to Vite, which refuses them", async () => {
    // Without the guard these would be looked up on disk outside dist/ and answered here.
    for (const url of ["/..%2fsecret.txt", "/..%2fmissing.txt", "/%2e%2e/%2e%2e/etc/passwd"]) {
      const r = await request(handler, url);
      expect(r, url).toMatchObject({ passed: true });
      expect(r.body ?? "", url).not.toContain("outside the build");
    }
  });

  it("works under a base path (GitHub Pages)", async () => {
    const based = previewHandler("/repo/");
    expect((await request(based, "/repo/")).passed).toBe(true);
    expect((await request(based, "/repo")).passed).toBe(true);
    expect((await request(based, "/repo/mars")).passed).toBe(true);
    expect((await request(based, "/elsewhere")).passed).toBe(true);
    expect(await request(based, "/repo/atlantis")).toMatchObject({ status: 404 });
    expect(await request(based, "/repo/mars/")).toMatchObject({ status: 308, location: "/repo/mars" });
  });
});

describe("dev server 404", () => {
  const plugin = notFound();
  let handler!: Handler;
  const transformIndexHtml = vi.fn(async (_url: string, html: string) => `transformed:${html.length}`);
  hook(plugin.configResolved)({ base: "/" });
  hook(plugin.configureServer)({
    config: { root: process.cwd() },
    transformIndexHtml,
    middlewares: { use: (h: Handler) => (handler = h) },
  });

  it("answers unknown pages with the transformed 404 page", async () => {
    const r = await request(handler, "/atlantis");
    expect(r).toMatchObject({ passed: false, status: 404 });
    expect(r.body).toMatch(/^transformed:/);
    expect(transformIndexHtml).toHaveBeenCalledWith("/404.html", expect.stringContaining("Beyond the charted sky"));
  });

  it("leaves pages, source modules, assets, and non-page requests to Vite", async () => {
    for (const url of ["/", "/mars", "/mars/", "/src/main.tsx", "/@vite/client", "/node_modules/x.js", "/favicon.svg"])
      expect((await request(handler, url)).passed, url).toBe(true);
    expect((await request(handler, "/atlantis", "application/json")).passed).toBe(true);
  });

  it("hands Vite the error if the 404 page can't be read", async () => {
    const broken = notFound();
    let h!: Handler;
    hook(broken.configureServer)({ config: { root: tempDir() }, transformIndexHtml, middlewares: { use: (x: Handler) => (h = x) } });
    let error: unknown;
    await h({ url: "/atlantis", headers: { accept: "text/html" } }, { statusCode: 200, headers: {}, setHeader() {}, end() {} }, (err) => (error = err));
    expect(error).toBeInstanceOf(Error);
  });

  it("draws the chart into 404.html only", () => {
    const transform = (plugin.transformIndexHtml as { handler: (html: string, ctx: { filename: string }) => string }).handler;
    const template = readFileSync("404.html", "utf8");
    expect(transform(template, { filename: "/x/404.html" })).not.toBe(template);
    expect(transform(template, { filename: "/x/index.html" })).toBe(template);
  });
});

describe("prerender plugin", () => {
  it("writes a page per world, the sitemap, and robots.txt after the build", () => {
    const root = tempDir();
    const out = join(root, "dist");
    const publicDir = join(root, "public");
    mkdirSync(out, { recursive: true });
    mkdirSync(join(publicDir, "og"), { recursive: true });
    writeFileSync(join(publicDir, "og", "home.jpg"), "");
    writeFileSync(join(out, "index.html"), `<!doctype html><html><head><title>x</title>\n<!--seo-->\n</head><body><div id="root"></div></body></html>`);
    const info = vi.fn();
    vi.stubEnv("SITE_URL", "https://stars.example");

    const plugin = prerender();
    hook(plugin.configResolved)({ build: { outDir: out }, publicDir, base: "/", logger: { info } });
    hook(plugin.closeBundle)();
    vi.unstubAllEnvs();

    for (const body of VIEWABLE) expect(readFileSync(join(out, `${body.id}.html`), "utf8"), body.id).toContain(`<title>${body.name} ·`);
    const home = readFileSync(join(out, "index.html"), "utf8");
    expect(home).toContain('content="https://stars.example/og/home.jpg"');
    // No share image on disk for Mars: a small card instead of a broken image link.
    expect(readFileSync(join(out, "mars.html"), "utf8")).not.toContain("og/mars.jpg");
    expect(readFileSync(join(out, "sitemap.xml"), "utf8")).toContain("<loc>https://stars.example/mars</loc>");
    expect(readFileSync(join(out, "robots.txt"), "utf8")).toContain("Sitemap: https://stars.example/sitemap.xml");
    expect(info).toHaveBeenCalledWith(`prerender: ${PAGES.length} pages for https://stars.example`);
  });
});

describe("long descriptions", () => {
  it("are cut on a whole word with an ellipsis", () => {
    const mars = routeFor("mars")!;
    const d = describePage({ ...mars, body: { ...mars.body!, tagline: "Rust and dust and ancient riverbeds ".repeat(10) } });
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith("…")).toBe(true);
    expect(d.slice(0, -1)).toMatch(/(riverbeds|Rust|and|dust|ancient)$/);
  });
});
