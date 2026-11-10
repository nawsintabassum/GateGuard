import fs from 'node:fs'

const read = (path, fallback) => {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')) } catch { return fallback }
}

const lint = read('eslint-report.json', [])
const tests = read('test-results.json', {})
const audit = read('npm-audit.json', {})
const frontendAudit = read('../frontend/frontend-audit.json', {})
const coverage = read('coverage/coverage-summary.json', { total: {} })
const totals = coverage.total || {}
const eslintErrors = lint.reduce((total, file) => total + Number(file.errorCount || 0), 0)
const eslintWarnings = lint.reduce((total, file) => total + Number(file.warningCount || 0), 0)

const testFiles = Array.isArray(tests.testResults) ? tests.testResults : []
const assertions = testFiles.flatMap(file => file.assertionResults || [])
const passed = assertions.filter(test => test.status === 'passed').length || Number(tests.numPassedTests || 0)
const failed = assertions.filter(test => test.status === 'failed').length || Number(tests.numFailedTests || 0)
const skipped = assertions.filter(test => ['pending', 'skipped', 'todo'].includes(test.status)).length || Number(tests.numPendingTests || 0)
const vulnerabilities = audit.metadata?.vulnerabilities || {}
const frontendVulnerabilities = frontendAudit.metadata?.vulnerabilities || {}
const findings = []

for (const file of lint) {
  for (const message of file.messages || []) {
    findings.push({
      severity: message.severity === 2 ? 'high' : 'medium',
      title: message.message || 'ESLint finding',
      file: file.filePath,
      ...(message.line ? { line: message.line } : {}),
      recommendation: message.ruleId ? `Review ESLint rule ${message.ruleId}` : 'Review lint output',
    })
  }
}

for (const [sourceName, report] of [['backend', audit], ['frontend', frontendAudit]]) {
  for (const [severity, entry] of Object.entries(report.vulnerabilities || {})) {
    for (const item of entry.via || []) {
    if (typeof item === 'object') findings.push({
      severity: severity === 'moderate' ? 'medium' : ['critical', 'high', 'low'].includes(severity) ? severity : 'info',
      title: item.title || `${entry.name || 'Dependency'} vulnerability`,
      package: entry.name,
      message: `${sourceName} dependency · ${item.range || ''}`,
      recommendation: 'Upgrade to a patched dependency version',
    })
    }
  }
}

for (const [key, label] of [['FRONTEND_BUILD_OUTCOME', 'Frontend typecheck and production build'], ['TYPECHECK_OUTCOME', 'Backend TypeScript typecheck'], ['BUILD_OUTCOME', 'Backend production build']]) {
  if (process.env[key] === 'failure') findings.push({
    severity: 'high',
    title: `${label} failed`,
    message: 'The repository did not pass this CI validation step.',
    recommendation: `Fix the ${label.toLowerCase()} errors and rerun the workflow.`,
  })
}

if (process.env.LINT_OUTCOME === 'failure' && lint.length === 0) findings.push({ severity: 'high', title: 'ESLint could not complete', recommendation: 'Check the ESLint configuration and rerun the workflow.' })
if (process.env.TEST_OUTCOME === 'failure' && passed + failed + skipped === 0) findings.push({ severity: 'high', title: 'Automated tests could not run', recommendation: 'Check the Vitest setup and ensure the test suite executes.' })
if ((process.env.AUDIT_OUTCOME === 'failure' && !audit.metadata) || (process.env.FRONTEND_AUDIT_OUTCOME === 'failure' && !frontendAudit.metadata)) findings.push({ severity: 'high', title: 'Dependency audit could not complete', recommendation: 'Check npm registry connectivity and rerun npm audit.' })

const pct = key => Number(totals[key]?.pct ?? 0)
const payload = {
  branch: process.env.GITHUB_REF_NAME || 'unknown',
  commitSha: process.env.GITHUB_SHA || '',
  source: 'github-actions',
  metrics: {
    coverage: { statements: pct('statements'), branches: pct('branches'), functions: pct('functions'), lines: pct('lines') },
    tests: { total: passed + failed + skipped, passed, failed, skipped },
    eslint: { errors: eslintErrors, warnings: eslintWarnings },
    pipeline: {
      typecheckPassed: process.env.TYPECHECK_OUTCOME === 'success',
      buildPassed: process.env.FRONTEND_BUILD_OUTCOME === 'success' && process.env.BUILD_OUTCOME === 'success',
      lintExecuted: process.env.LINT_OUTCOME === 'success' || lint.length > 0,
      auditCompleted: Boolean(audit.metadata && frontendAudit.metadata),
    },
    security: {
      critical: Number(vulnerabilities.critical || 0) + Number(frontendVulnerabilities.critical || 0),
      high: Number(vulnerabilities.high || 0) + Number(frontendVulnerabilities.high || 0),
      moderate: Number(vulnerabilities.moderate || 0) + Number(frontendVulnerabilities.moderate || 0),
      low: Number(vulnerabilities.low || 0) + Number(frontendVulnerabilities.low || 0),
    },
  },
  findings,
}

fs.writeFileSync('gateguard-result.json', JSON.stringify(payload, null, 2))
