import type { Page } from "@playwright/test";
import { CoverageReport, type CoverageReportOptions } from "monocart-coverage-reports";

/** On for `npm run coverage`: the build then carries source maps so coverage maps back to src/. */
export const COVERAGE = process.env.COVERAGE === "1";

export const coverageOptions: CoverageReportOptions = {
  name: "End-to-end coverage",
  outputDir: "coverage/e2e",
  reports: ["v8", "console-details", "json"],
  // Only the app's own source, not three.js or React.
  entryFilter: (entry) => entry.url.includes("/assets/") && entry.url.endsWith(".js"),
  sourceFilter: (path) => path.startsWith("src/") || path.includes("/src/"),
  sourcePath: (path) => path.replace(/^.*?(?=src\/)/, ""),
};

/** Record which of the app's code a test ran (Chromium only). */
export async function withCoverage(page: Page, javaScriptEnabled: boolean, run: () => Promise<void>) {
  if (!COVERAGE || !javaScriptEnabled) return run();
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  try {
    await run();
  } finally {
    const data = await page.coverage.stopJSCoverage();
    if (data.length > 0) await new CoverageReport(coverageOptions).add(data);
  }
}
