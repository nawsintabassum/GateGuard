# GateGuard Professional Upgrade — Integration Notes

## Included in this source update

- Gemini failure explanations receive verified findings, failed test names/output, file paths when supplied, branch, commit and metrics. The model is instructed to separate hypotheses from verified facts. AI remains advisory; deterministic quality-gate rules decide PASS/FAIL.
- CI payloads include individual Vitest assertions (`testCases`) so GateGuard can compare a test's results across analysis runs.
- `GET /api/analyses/analytics/:projectId` returns seven-day quality/coverage history and identifies tests observed both passing and failing during the period.
- Project details show the Project ID and let the owner regenerate and copy a CI token. Tokens are intentionally not retrievable: only a newly generated token is displayed because the database stores a SHA-256 hash. Regeneration immediately invalidates the old token.
- Dependency audit findings include affected range and a fixed version when npm audit provides one.
- GitHub `pull_request` webhooks can fetch the changed-file diff, ask Gemini for evidence-backed bug/security/test-gap findings, and post a summary comment to the pull request. It is advisory and does not create inline review threads. The existing Actions workflow also reports deterministic CI quality results.
- Project details show repeated findings as quality-debt signals and surface actionable recommendations from the latest verified analysis.

## Project count clarification

There is no four-project limit in the Project model or creation API. The dashboard overview now renders the full accessible project list; the Projects page also loads all accessible projects.

## Required environment and GitHub configuration

Backend environment:

```env
GEMINI_API_KEY=your_google_ai_studio_key
```

Keep this key only in the backend/Vercel server environment. Never use a `VITE_` prefix for secrets. Redeploy the backend after setting it.

For every GitHub repository connected to GateGuard, configure Actions variables/secrets:

- Repository variable `GATEGUARD_PROJECT_ID`: copy from GateGuard → Project details → Project & CI credentials.
- Repository variable `GATEGUARD_API_URL`: deployed GateGuard origin, for example `https://your-gateguard-domain` (no trailing slash).
- Repository secret `GATEGUARD_CI_TOKEN`: generate from GateGuard → Project details → Regenerate token, then copy immediately.

The workflow uses `GITHUB_TOKEN` to create/update a PR comment. The workflow permissions include `pull-requests: write`; repository Actions settings must allow the workflow token to write. Fork-originated pull requests may have restricted write permissions on GitHub.

## Important capability boundaries

- Flaky-test detection requires stable test names and per-test statuses over multiple CI runs. The included workflow exports Vitest assertion results; other test runners must emit the documented `testCases` array.
- Seven-day analytics use actual CI analysis timestamps. No historical data is fabricated.
- Quality debt in this iteration is a repeated-finding signal across recent analysis history, not a full issue lifecycle with manual resolve/reopen states or estimated engineer-hour cost.
- Team roles are project-scoped. Existing GateGuard accounts are activated immediately when invited; pending invitations activate when the invitee registers or signs in with the invited email. Invitation email delivery is not configured. Owners/admins manage membership; owners/admins/managers can change quality policies; only owners can delete projects or regenerate CI tokens.
- In-app notifications are stored in MongoDB and refresh every 30 seconds. Slack Incoming Webhook delivery is supported; email delivery and a full audit log are not included. Slack webhook URLs are encrypted with `TOKEN_ENCRYPTION_KEY`.
- Policy templates replace the selected project quality thresholds and apply to subsequent CI runs.
- The AI PR review uses the diff supplied by GitHub and posts a summary issue comment. It does not create inline review threads. A matching PR-head CI result is distinguished from a project-wide latest analysis.
- Dependency safe-version details are shown only when npm audit supplies `fixAvailable`; otherwise the UI says the version was not supplied rather than guessing.

## CI result payload extension

The API accepts optional `testCases` entries:

```json
{
  "testCases": [
    {
      "name": "auth rejects invalid credentials",
      "status": "failed",
      "durationMs": 32,
      "file": "src/auth.test.ts",
      "error": "Expected 401 but received 200"
    }
  ]
}
```

Allowed status values: `passed`, `failed`, `skipped`. Include real runner output only; AI explanations must not be treated as proof of a defect.
