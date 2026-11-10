# GateGuard Backend

Express + TypeScript + MongoDB backend for the GateGuard quality-gate SaaS.

## Included
- JWT registration, login, current-user and password reset-token endpoints.
- User-owned GitHub repository projects.
- GitHub OAuth connection and repository listing (private repo scope is requested only after user consent).
- Per-project CI token, hashed at rest.
- Quality-rule CRUD and deterministic PASS/FAIL evaluation.
- CI result ingestion endpoint for GitHub Actions.
- Analysis history and PDF report export.
- Optional Gemini explanations; core gate works without Gemini.
- Helmet, CORS allowlist, rate limiting, Zod validation and centralized errors.

## 1. Requirements
- Node.js 20+
- MongoDB 6+
- A GitHub OAuth App for GitHub connection (optional for public repo URL onboarding)
- Gemini API key is optional

## 2. Install
```bash
npm install
cp .env.example .env
```
On Windows PowerShell use `Copy-Item .env.example .env`; on Git Bash use `cp`.

Fill `.env`. Generate secrets:
```bash
openssl rand -hex 32
```
Use one long random value for `JWT_SECRET` (at least 32 characters) and a 64-character hex value for `TOKEN_ENCRYPTION_KEY`.

## 3. Configure GitHub OAuth (optional)
In GitHub Developer Settings create an OAuth App:
- Homepage URL: `http://localhost:5173`
- Authorization callback URL: value of `GITHUB_CALLBACK_URL` (default `http://localhost:5000/api/github/callback`)
Copy client ID and secret into `.env`.
The backend stores the access token encrypted using AES-256-GCM. Never put OAuth secrets in the frontend.

## 4. Run
```bash
npm run dev
```
Health check: `GET http://localhost:5000/api/health`

Production:
```bash
npm run build
npm start
```

## 5. API overview
All authenticated endpoints require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current account |
| POST | `/api/auth/forgot-password` | Create reset token |
| POST | `/api/auth/reset-password` | Set new password |
| GET/POST | `/api/projects` | List/create projects |
| GET/DELETE | `/api/projects/:id` | Read/delete owned project |
| GET/PUT | `/api/rules?projectId=:id` | Read/update quality rules |
| GET | `/api/analyses` | List own analyses; optional `projectId` |
| GET | `/api/analyses/:id` | Read own analysis |
| POST | `/api/analyses/projects/:projectId/run` | Returns 501 until CI runner dispatch is configured |
| GET | `/api/github/connect` | Get GitHub authorization URL |
| GET | `/api/github/repositories` | List connected GitHub repositories |
| DELETE | `/api/github/disconnect` | Disconnect GitHub |
| GET | `/api/reports/:analysisId/pdf` | Download PDF report |
| POST | `/api/ci/:projectId/results` | Ingest signed CI result (project CI token) |

### Create project
```json
{ "name": "ShopEase", "repoUrl": "https://github.com/your-org/shopease", "branch": "main" }
```
Response includes a one-time `ciToken`. Save it immediately as a GitHub Actions secret named `GATEGUARD_CI_TOKEN`; it cannot be read back.

### Update quality rules
```json
{
  "minCoverage": 80,
  "minTestPassRate": 95,
  "maxEslintErrors": 0,
  "maxCriticalVulnerabilities": 0,
  "maxHighVulnerabilities": 0
}
```

## 6. GitHub Actions runner
Copy `.github/workflows/gateguard.yml` and `.github/scripts/build-gateguard-payload.mjs` into the repository being analyzed. Configure:
- Repository variable `GATEGUARD_API_URL` = deployed API base URL (e.g. `https://api.example.com`)
- Repository variable `GATEGUARD_PROJECT_ID` = project ID from GateGuard
- Repository secret `GATEGUARD_CI_TOKEN` = one-time CI token from project creation

The sample workflow expects the target repo to have `npm ci`, ESLint, Vitest and coverage configured. It reads `coverage/coverage-summary.json`; configure Vitest coverage reporter `json-summary`. Workflow currently submits metrics and findings from the runner. It does **not** download and execute repository source on the API server.

## 7. Security / production checklist
- Use HTTPS and a strict `CLIENT_URL`.
- Keep `.env`, GitHub client secret, Gemini key and CI tokens out of git.
- Configure transactional email delivery before exposing password reset in production. Development mode returns a reset token only for local testing.
- Use an isolated ephemeral runner (GitHub-hosted Actions or dedicated sandbox) for untrusted repository code.
- Review GitHub Actions permissions and pin third-party actions to full commit SHAs for hardened production deployments.
- Configure backups, monitoring, log redaction, and secret rotation.
- Add OAuth account unlinking/revocation policy and audit logs before enterprise deployment.

## Important implementation boundaries
This backend provides a working API foundation and the quality-gate/result pipeline. It deliberately does not execute arbitrary uploaded repository code on the Express server. `POST /api/analyses/projects/:projectId/run` is explicitly not implemented as an unsafe server-side shell execution; use the included GitHub Actions workflow to run analysis in an isolated CI runner. A dispatch endpoint and per-repository workflow installation can be added once a GitHub App / installation-token architecture is configured.

## Professional development and CI setup

### Local setup

1. Use Node.js 20 or newer and MongoDB 7 or a compatible managed MongoDB service.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set a unique `JWT_SECRET` (at least 32 characters).
4. Generate a 32-byte encryption key with `openssl rand -hex 32` and set `TOKEN_ENCRYPTION_KEY`.
5. Configure all three GitHub OAuth values (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`) together. GitHub OAuth also requires `TOKEN_ENCRYPTION_KEY`.
6. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before starting with `npm run dev`.

### GitHub Actions → GateGuard

Add these repository variables/secrets to the repository running the workflow:

- Variable `GATEGUARD_API_URL`: the public base URL of the GateGuard API, without a trailing slash.
- Variable `GATEGUARD_PROJECT_ID`: the project ID returned when the repository is added in GateGuard.
- Secret `GATEGUARD_CI_TOKEN`: the one-time CI token returned by the project creation API. Store it as a GitHub Actions secret; never commit it to source control.

The workflow runs typecheck, ESLint, Vitest with V8 coverage, production build, and `npm audit`. It submits structured results to GateGuard and fails the GitHub Actions job when the quality gate returns `FAIL`.

### Important deployment notes

- Keep `.env` and all CI tokens out of Git. Use `.env.example` only as a template.
- Set `NODE_ENV=production`, use HTTPS, and configure `CLIENT_URL` to the exact frontend origin(s).
- Configure an email delivery provider before advertising production password-reset email delivery. In development, the API returns a reset token for local testing only.
- Repository code is intentionally not executed by the API server. Analysis runs inside GitHub Actions runners.
- Configure GitHub OAuth callback URL exactly as `https://YOUR_API_HOST/api/github/callback` in the GitHub OAuth application.


## Troubleshooting: frontend receives 404 from auth endpoints

- Confirm the backend is running on port 5000 and `GET http://localhost:5000/api/health` returns JSON.
- In `frontend/.env`, set `VITE_API_URL=http://localhost:5000/api` (including `/api`).
- Restart the Vite server after changing frontend environment variables.
- Confirm `CLIENT_URL=http://localhost:5173` in `backend/.env` and restart the backend after editing it.
- Google callback URI must exactly match `GOOGLE_CALLBACK_URL` and the Authorized redirect URI in Google Cloud Console.
