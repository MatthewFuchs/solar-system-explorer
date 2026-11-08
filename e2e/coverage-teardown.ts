import { CoverageReport } from "monocart-coverage-reports";
import { COVERAGE, coverageOptions } from "./coverage";

/** After every test: merge what each one recorded into one report under coverage/e2e. */
export default async function teardown() {
  if (COVERAGE) await new CoverageReport(coverageOptions).generate();
}
