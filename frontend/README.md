# GateGuard Frontend

Premium dark developer SaaS frontend for the GateGuard Software Quality Gate & CI Monitoring Platform.

## Included
- 15 routed screens: landing, login, registration, forgot/reset password, dashboard, projects, add repository, project details, analysis results, quality rules, analysis history, reports, settings and documentation.
- Responsive sidebar/drawer, topbar, reusable cards, status badges, tables, charts, forms, modal and toast feedback.
- Demo data is explicitly labelled. No real GitHub connection, code scanning, authentication or report generation is performed by this frontend alone.

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```
Open the local URL printed by Vite.

## Production build
```bash
npm run typecheck
npm run build
npm run preview
```

## Backend integration
Set `VITE_API_URL` to your Express API. Replace the demo handlers in `src/lib/api.ts` with real endpoints. Keep GitHub OAuth secrets and tokens on the server; never place secrets in `VITE_*` variables.
