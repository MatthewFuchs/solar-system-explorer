import { openApp, test, expect } from "./fixtures";

test("sends the production security headers", async ({ request }) => {
  const res = await request.get("/");
  expect(res.ok()).toBe(true);
  const headers = res.headers();
  const csp = headers["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("unsafe-eval");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("loads every resource under the CSP, without violations", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) blocked.push(m.text());
  });
  await openApp(page, "#saturn");
  await expect(page.locator(".plate-canvas canvas")).toBeVisible();
  // Fonts come from Google Fonts and must not be blocked.
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family));
  expect(fonts.join(" ")).toMatch(/Cormorant Garamond|Marcellus/);
  expect(blocked).toEqual([]);
});

test("does not render content from the URL hash", async ({ page }) => {
  await openApp(page, "#%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E");
  let dialog = false;
  page.on("dialog", () => (dialog = true));
  await expect(page.locator("img[src='x']")).toHaveCount(0);
  expect(dialog).toBe(false);
});
