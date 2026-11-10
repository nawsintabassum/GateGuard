import { describe, expect, it } from 'vitest'
import { evaluateQualityGate, type Metrics } from '../src/services/qualityGate.service'

const rules = {
  minCoverage: 80,
  minTestPassRate: 95,
  maxEslintErrors: 0,
  maxCriticalVulnerabilities: 0,
  maxHighVulnerabilities: 0,
}

const healthyMetrics: Metrics = {
  coverage: { statements: 90, branches: 85, functions: 92, lines: 88 },
  tests: { total: 100, passed: 98, failed: 1, skipped: 1, passRate: 98 },
  eslint: { errors: 0, warnings: 2 },
  security: { critical: 0, high: 0, moderate: 1, low: 2 },
}

describe('evaluateQualityGate', () => {
  it('passes when every configured threshold is satisfied', () => {
    const result = evaluateQualityGate(healthyMetrics, rules)
    expect(result.status).toBe('PASS')
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.failedReasons).toHaveLength(0)
  })

  it('fails when line coverage is below the configured minimum', () => {
    const result = evaluateQualityGate({ ...healthyMetrics, coverage: { ...healthyMetrics.coverage, lines: 79 } }, rules)
    expect(result.status).toBe('FAIL')
    expect(result.failedReasons.some(reason => reason.includes('Line coverage'))).toBe(true)
  })

  it('fails when a critical vulnerability is present', () => {
    const result = evaluateQualityGate({ ...healthyMetrics, security: { ...healthyMetrics.security, critical: 1 } }, rules)
    expect(result.status).toBe('FAIL')
  })

  it('fails when the test pass rate is below the minimum', () => {
    const result = evaluateQualityGate({ ...healthyMetrics, tests: { ...healthyMetrics.tests, passRate: 94 } }, rules)
    expect(result.status).toBe('FAIL')
  })


  it('fails when the CI typecheck or production build fails', () => {
    const result = evaluateQualityGate({ ...healthyMetrics, pipeline: { typecheckPassed: true, buildPassed: false, lintExecuted: true, auditCompleted: true } }, rules)
    expect(result.status).toBe('FAIL')
    expect(result.failedReasons.some(reason => reason.includes('production build failed'))).toBe(true)
  })

  it('never returns a score outside the 0–100 range', () => {
    const result = evaluateQualityGate({ ...healthyMetrics, eslint: { errors: 100, warnings: 100 } }, rules)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
