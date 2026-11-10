export type QualityRules = {
  minCoverage: number;
  minTestPassRate: number;
  maxEslintErrors: number;
  maxCriticalVulnerabilities: number;
  maxHighVulnerabilities: number;
};

export type Metrics = {
  coverage: { statements: number; branches: number; functions: number; lines: number };
  tests: { total: number; passed: number; failed: number; skipped: number; passRate: number };
  eslint: { errors: number; warnings: number };
  security: { critical: number; high: number; moderate: number; low: number };
  pipeline?: { typecheckPassed: boolean; buildPassed: boolean; lintExecuted: boolean; auditCompleted: boolean };
};
export function evaluateQualityGate(metrics: Metrics, rules: QualityRules) {
  const checks = [
    { key: "coverage", label: "Minimum test coverage", actual: metrics.coverage.lines, expected: rules.minCoverage, passed: metrics.coverage.lines >= rules.minCoverage, reason: `Line coverage ${metrics.coverage.lines}% (minimum ${rules.minCoverage}%)` },
    { key: "testPassRate", label: "Test pass rate", actual: metrics.tests.passRate, expected: rules.minTestPassRate, passed: metrics.tests.passRate >= rules.minTestPassRate, reason: `Test pass rate ${metrics.tests.passRate}% (minimum ${rules.minTestPassRate}%)` },
    { key: "eslintErrors", label: "ESLint errors", actual: metrics.eslint.errors, expected: rules.maxEslintErrors, passed: metrics.eslint.errors <= rules.maxEslintErrors, reason: `${metrics.eslint.errors} ESLint errors (maximum ${rules.maxEslintErrors})` },
    { key: "criticalVulnerabilities", label: "Critical vulnerabilities", actual: metrics.security.critical, expected: rules.maxCriticalVulnerabilities, passed: metrics.security.critical <= rules.maxCriticalVulnerabilities, reason: `${metrics.security.critical} critical vulnerabilities (maximum ${rules.maxCriticalVulnerabilities})` },
    { key: "highVulnerabilities", label: "High vulnerabilities", actual: metrics.security.high, expected: rules.maxHighVulnerabilities, passed: metrics.security.high <= rules.maxHighVulnerabilities, reason: `${metrics.security.high} high vulnerabilities (maximum ${rules.maxHighVulnerabilities})` }
  ];
  if (metrics.pipeline) {
    checks.push({ key: "typecheck", label: "TypeScript typecheck", actual: metrics.pipeline.typecheckPassed ? 1 : 0, expected: 1, passed: metrics.pipeline.typecheckPassed, reason: metrics.pipeline.typecheckPassed ? "TypeScript typecheck passed" : "TypeScript typecheck failed" });
    checks.push({ key: "build", label: "Production build", actual: metrics.pipeline.buildPassed ? 1 : 0, expected: 1, passed: metrics.pipeline.buildPassed, reason: metrics.pipeline.buildPassed ? "Frontend and backend production builds passed" : "Frontend or backend production build failed" });
    checks.push({ key: "lintExecution", label: "Static analysis execution", actual: metrics.pipeline.lintExecuted ? 1 : 0, expected: 1, passed: metrics.pipeline.lintExecuted, reason: metrics.pipeline.lintExecuted ? "ESLint completed" : "ESLint did not complete" });
    checks.push({ key: "auditExecution", label: "Dependency audit execution", actual: metrics.pipeline.auditCompleted ? 1 : 0, expected: 1, passed: metrics.pipeline.auditCompleted, reason: metrics.pipeline.auditCompleted ? "Backend and frontend dependency audits completed" : "One or more dependency audits could not complete" });
  }
  const failed = checks.filter(c => !c.passed);
  const score = Math.max(0, Math.round(
    (metrics.coverage.lines * 0.30) + (metrics.tests.passRate * 0.25) +
    Math.max(0, 100 - metrics.eslint.errors * 5 - metrics.eslint.warnings) * 0.20 +
    Math.max(0, 100 - metrics.security.critical * 25 - metrics.security.high * 10 - metrics.security.moderate * 3) * 0.25
  ));
  return { status: failed.length ? "FAIL" as const : "PASS" as const, score, rules: checks.map(c => ({ ...c, expected: c.expected })), failedReasons: failed.map(c => c.reason) };
}
