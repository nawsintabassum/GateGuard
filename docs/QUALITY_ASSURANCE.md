# GateGuard — Quality Assurance Plan

## 1. Purpose

This plan defines how GateGuard's own code and the repositories connected to it are checked. The GateGuard API receives evidence from CI; it does not execute repository code itself.

## 2. Quality attributes

| Attribute | Verification approach | Acceptance target |
|---|---|---|
| Functional correctness | Unit, integration and end-to-end tests | All release-blocking tests pass |
| Code quality | ESLint and TypeScript typecheck | 0 ESLint errors; typecheck succeeds |
| Test health | Vitest with V8 coverage | Configurable minimum pass rate and coverage |
| Dependency security | npm audit for backend and frontend | 0 critical and 0 high vulnerabilities by default |
| Authentication | Register/login, protected routes, password reset/change | Invalid credentials rejected; old sessions invalidated after password change |
| Authorization | Owner-scoped project, rule, analysis and report API checks | Users cannot read or mutate another user's records |
| CI integrity | One-time project CI token and payload validation | Invalid tokens and malformed metrics rejected |
| Availability | API health endpoint and graceful shutdown | Health endpoint reflects MongoDB connectivity |

## 3. Current automated test coverage

The backend Vitest suite currently covers the quality-gate scoring service:

- A healthy metrics payload passes configured thresholds.
- Coverage below the minimum fails the gate.
- Critical vulnerabilities fail the gate.
- Test pass rate below the minimum fails the gate.
- The score remains within the 0–100 range.

The current suite is a starting point, not proof of complete application coverage. Before a final Summit release, add tests for authentication, authorization, CI payload validation, project ownership, rules persistence, PDF report access and GitHub OAuth state handling. Keep coverage reporting inclusive of the backend source rather than excluding untested modules to inflate the percentage.

## 4. Manual test checklist

1. Register with a valid email and password; verify duplicate email registration is rejected.
2. Sign in with correct and incorrect credentials.
3. Open an authenticated route without a token; verify redirect to login.
4. Change password; verify the old session token is rejected.
5. Add a valid GitHub repository URL; verify duplicate repositories are rejected.
6. Attempt to read another user's project ID; verify the API returns not found.
7. Submit CI metrics with mismatched test totals; verify validation fails.
8. Submit an invalid CI token; verify the request is rejected.
9. Submit a valid CI result; verify the analysis is stored and the project summary is updated.
10. Export a PDF report for an owned analysis; verify the response is a PDF.
11. Disconnect GitHub; verify encrypted credentials are removed.
12. Stop MongoDB; verify the health endpoint reports a degraded state.

## 5. Release criteria

Do not describe the application as production-ready until the automated and manual test cases above have been executed in a configured environment, all release-blocking defects have been fixed, real email delivery has been configured, and deployment secrets have been stored outside source control.
