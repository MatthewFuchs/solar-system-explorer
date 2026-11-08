import { CoverageReport } from "monocart-coverage-reports";
import { COVERAGE, coverageOptions } from "./coverage";

/** Start each coverage run clean. */
export default async function setup() {
  if (COVERAGE) new CoverageReport(coverageOptions).cleanCache();
}
