# GateGuard

**GateGuard** is a developer-focused software quality assurance platform. It collects CI evidence from GitHub Actions, evaluates configurable quality thresholds, stores analysis history, and presents quality findings and reports in a web workspace.

## Project structure

```text
GateGuard/
├── backend/       # Express + TypeScript + MongoDB API
├── frontend/      # React + TypeScript + Vite dashboard
├── docs/          # QA plan and Summit demo runbook
└── .github/       # Repository-level GitHub Actions workflow
```

## Technology stack

- Frontend: React 19, TypeScript, Vite, React Router, Recharts
- Backend: Node.js 20+, Express, TypeScript, Mongoose
- Database: MongoDB
- Authentication: bcrypt password hashing, JWT access tokens, token-version session invalidation
- Integrations: GitHub OAuth, GitHub Actions, npm audit, ESLint, Vitest/V8 coverage
- Reporting: PDFKit
- AI assistance: Google Generative AI (optional; findings remain available if the service is not configured)

## Local development

### 1. Start MongoDB

Run MongoDB locally or provision a MongoDB database. The default local URI is `mongodb://127.0.0.1:27017/gateguard`.

### 2. Configure and start the backend

```bash
cd backend
npm install
cp .env.example .env
```

Set a unique `JWT_SECRET` with at least 32 characters. Generate an encryption key using `openssl rand -hex 32` and set `TOKEN_ENCRYPTION_KEY`. The sample key in `.env.example` is a placeholder and must never be used outside local setup.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

The API runs at `http://localhost:5000` by default. Health check: `GET http://localhost:5000/api/health`.

### 3. Configure and start the frontend

```bash
cd frontend
npm ci
cp .env.example .env
npm run typecheck
npm run build
npm run dev
```

The Vite app runs at `http://localhost:5173`. `VITE_API_URL` should point to the backend API. Set `VITE_DEMO_MODE=true` only when intentionally reviewing sample data; demo records are not real repository analysis.

## GitHub OAuth setup

Create a GitHub OAuth App and configure:

- Homepage URL: your frontend origin, e.g. `http://localhost:5173`
- Authorization callback URL: `http://localhost:5000/api/github/callback`

Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`, and a real `TOKEN_ENCRYPTION_KEY` in the backend environment. All OAuth values must be configured together.

## Connect a repository to CI

1. Register and sign in to GateGuard.
2. Add the GitHub repository URL from the Projects page.
3. Save the returned CI token as a GitHub Actions secret named `GATEGUARD_CI_TOKEN`.
4. Add repository variables `GATEGUARD_PROJECT_ID` and `GATEGUARD_API_URL`.
5. Push a commit or manually run the `GateGuard Quality Gate` workflow.

The API never executes untrusted repository code. GitHub Actions runs checks in an isolated runner and sends structured results to the API. The workflow fails when the resulting GateGuard quality gate fails.

## Quality and security notes

- Passwords are bcrypt-hashed; accepted passwords are limited to bcrypt's 72-byte input boundary.
- Password changes and resets increment the account token version, invalidating previous access tokens.
- GitHub OAuth uses a one-time, expiring random state value; GitHub tokens are encrypted at rest with AES-256-GCM.
- CI tokens are stored as SHA-256 hashes and checked using a timing-safe comparison.
- User-facing project and analysis queries are scoped to the authenticated owner.
- API request payloads are validated with Zod and request rates are limited.
- Production password-reset email delivery is intentionally disabled until an email provider is configured; the API returns an explicit configuration error rather than claiming an email was sent.

See [the QA plan](docs/QUALITY_ASSURANCE.md) and [the Summit demo runbook](docs/SUMMIT_DEMO_RUNBOOK.md) before presenting the project.

## Authentication setup (local development)

1. Copy `backend/.env.example` to `backend/.env` and fill in your MongoDB URI, a unique `JWT_SECRET`, and a 64-character hexadecimal `TOKEN_ENCRYPTION_KEY`.
2. For GitHub sign-in, configure the GitHub OAuth App callback URL as `http://localhost:5000/api/github/callback`. Put its client ID and secret in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Keep `GITHUB_CALLBACK_URL` equal to that exact callback URL; it is shared by GitHub sign-in and the existing GitHub account-connection flow.
3. For Google sign-in, create a Google OAuth Web application. Add `http://localhost:5000/api/auth/oauth/google/callback` as an authorized redirect URI, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in `backend/.env`.
4. Copy `frontend/.env.example` to `frontend/.env`. Keep `VITE_API_URL=http://localhost:5000/api` (the `/api` suffix is required).
5. Start the backend (`cd backend && npm install && npm run dev`) and frontend (`cd frontend && npm install && npm run dev`) in separate terminals. After changing either `.env` file or `vite.config.ts`, stop the dev server with Ctrl+C and restart it.

Social sign-in requires the matching OAuth provider credentials and exact callback URLs. Email/password registration and login use the same `/api` proxy and require the backend and MongoDB to be running.


### OAuth callback troubleshooting
- A GitHub OAuth App supports one callback URL. Keep its callback URL equal to `GITHUB_CALLBACK_URL` (normally `http://localhost:5000/api/github/callback`). GateGuard dispatches this callback to sign-in or workspace connection using the corresponding OAuth state.
- The Google OAuth callback must be exactly `http://localhost:5000/api/auth/oauth/google/callback`.
- The OAuth callback page prevents duplicate one-time code exchanges during React StrictMode development mounting.

## Summit presentation resources

See `docs/COMPETITION_SHOWCASE_KIT.md` for the five-minute demo script, Q&A, offline-demo scope, team/originality declaration and QA evidence register. See `docs/TEST_CASES.md` and `docs/OPEN_SOURCE_DISCLOSURE.md` before presenting. Replace placeholders and record only tests that have actually been executed.
