


import { describe, expect, it } from "vitest";
import {
  evaluateQualityGate,
  type Metrics,
  type QualityRules,
} from "../src/services/qualityGate.service";

const rules: QualityRules = {
  minCoverage: 80,
  minTestPassRate: 95,
  maxEslintErrors: 0,
  maxCriticalVulnerabilities: 0,
  maxHighVulnerabilities: 0,
};

const healthyMetrics: Metrics = {
  coverage: {
    statements: 90,
    branches: 85,
    functions: 92,
    lines: 88,
  },
  tests: {
    total: 100,
    passed: 98,
    failed: 1,
    skipped: 1,
    passRate: 98,
  },
  eslint: { errors: 0, warnings: 2 },
  security: { critical: 0, high: 0, moderate: 1, low: 2 },
};

describe("evaluateQualityGate", () => {
  it("passes when all configured thresholds are satisfied", () => {
    const result = evaluateQualityGate(healthyMetrics, rules);

    expect(result.status).toBe("PASS");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.failedReasons).toHaveLength(0);
  });

  it("fails when line coverage is below minimum", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        coverage: { ...healthyMetrics.coverage, lines: 79 },
      },
      rules,
    );

    expect(result.status).toBe("FAIL");
    expect(result.failedReasons.some((reason) =>
      reason.includes("Line coverage"),
    )).toBe(true);
  });

  it("fails when test pass rate is below minimum", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        tests: { ...healthyMetrics.tests, passRate: 94 },
      },
      rules,
    );

    expect(result.status).toBe("FAIL");
  });

  it("fails when ESLint errors exceed the limit", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        eslint: { errors: 1, warnings: 0 },
      },
      rules,
    );

    expect(result.status).toBe("FAIL");
  });

  it("fails when critical vulnerabilities are present", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        security: { ...healthyMetrics.security, critical: 1 },
      },
      rules,
    );

    expect(result.status).toBe("FAIL");
  });

  it("fails when high vulnerabilities are present", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        security: { ...healthyMetrics.security, high: 1 },
      },
      rules,
    );

    expect(result.status).toBe("FAIL");
  });

  it("checks pipeline failures when pipeline metrics are supplied", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        pipeline: {
          typecheckPassed: false,
          buildPassed: false,
          lintExecuted: false,
          auditCompleted: false,
        },
      },
      rules,
    );

    expect(result.status).toBe("FAIL");
    expect(result.failedReasons).toHaveLength(4);
  });

  it("passes when every pipeline check succeeds", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        pipeline: {
          typecheckPassed: true,
          buildPassed: true,
          lintExecuted: true,
          auditCompleted: true,
        },
      },
      rules,
    );

    expect(result.status).toBe("PASS");
  });

  it("never returns a score outside 0 to 100", () => {
    const result = evaluateQualityGate(
      {
        ...healthyMetrics,
        eslint: { errors: 100, warnings: 100 },
      },
      rules,
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns all evaluated rules in the result", () => {
    const result = evaluateQualityGate(healthyMetrics, rules);

    expect(result.rules.length).toBe(5);
    expect(result.rules.map((rule) => rule.key)).toContain("coverage");
  });
});
