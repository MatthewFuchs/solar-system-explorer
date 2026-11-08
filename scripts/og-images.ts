/**
 * Captures the link-preview images (1200x630 JPEG) for the overview and each world into
 * public/og/, from the production build. Run after visual changes with `npm run og`, then
 * commit the images; the next build links them from each page (scripts/prerender.ts).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { PAGES, segmentOf } from "../src/lib/routes.ts";
import { ogImageName } from "./prerender.ts";

const PORT = 4174;
const base = `http://localhost:${PORT}`;
const outDir = new URL("../public/og/", import.meta.url).pathname;

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
try {
  for (let i = 0; ; i++) {
    if (await fetch(base).then((r) => r.ok, () => false)) break;
    if (i > 50) throw new Error("preview server did not start");
    await new Promise((r) => setTimeout(r, 200));
  }
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 } });
  await context.addInitScript(() => sessionStorage.setItem("sse-entrance-played", "1"));
  const page = await context.newPage();

  for (const route of PAGES) {
    const id = ogImageName(route);
    // Wait for the textures (and, in a planet view, its full-size map and moons) to arrive.
    await page.goto(`${base}/${segmentOf(route)}`, { waitUntil: "networkidle" });
    if (!route.body) await page.locator('.plate[data-entrance="done"]').waitFor();
    else await page.locator('.feature[data-phase="planet"]').waitFor();
    await page.waitForTimeout(4000); // shaders compile and the maps upload before they draw
    await page.screenshot({ path: `${outDir}${id}.jpg`, type: "jpeg", quality: 82 });
    console.log(`og/${id}.jpg`);
  }
  await browser.close();
} finally {
  server.kill();
}
