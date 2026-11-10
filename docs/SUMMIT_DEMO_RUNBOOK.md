# GateGuard — Summit Demo Runbook

## Five-minute presentation

Use `COMPETITION_SHOWCASE_KIT.md` for the timed script and Q&A. Keep the live walkthrough to five minutes, followed by three minutes of judge questions.

## Real online demo

1. Start MongoDB and the backend API; verify `/api/health` reports `status: ok` and `database: connected`.
2. Start the frontend with `VITE_API_URL` set to the reachable API and `VITE_DEMO_MODE=false`.
3. Sign in using a dedicated demo account and connect a non-sensitive test repository.
4. Confirm the repository has the GateGuard workflow and required GitHub Actions variables/secrets: `GATEGUARD_PROJECT_ID`, `GATEGUARD_API_URL`, and `GATEGUARD_CI_TOKEN`.
5. Run **GateGuard Quality Gate** from the repository's Actions tab (`workflow_dispatch`) or push a commit.
6. Confirm the CI run submits results and the GateGuard project history shows a new analysis.
7. Open the report and explain real metrics and quality-rule decisions. Export the PDF before the event.

## Offline fallback

Set `VITE_DEMO_MODE=true` and run the frontend. The offline demo uses sample data and localStorage only. The project details page offers **Run offline demo**; its output is explicitly sample data and does not scan source code. Keep a previously generated real report and screenshots/recording as a separate backup, clearly labelled with date and source.

## Security

Never show `.env`, OAuth client secrets, CI tokens, database credentials or personal user data. Never commit secrets. Use a disposable demo account/repository and revoke demo access after the event if appropriate.
