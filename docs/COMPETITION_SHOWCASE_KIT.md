# GateGuard — Project Showcasing Competition Kit

This kit is designed around the summit's 5-minute presentation + live demo and 3-minute Q&A. Replace every `[TEAM ...]` placeholder with truthful team information before presenting.

## 1. Team and originality declaration

- Team name: `[TEAM NAME]`
- Members (1–3): `[MEMBER 1]`, `[MEMBER 2]`, `[MEMBER 3 if applicable]`
- Each listed member must be registered, present, and participate.
- Project: GateGuard — a repository quality and release-gate dashboard.
- Original work statement: `[Describe which design, frontend, backend, rules, integration and testing work was done by team members. Do not claim work that was not done by the team.]`
- Open-source disclosure: React, Vite, TypeScript, Express, MongoDB/Mongoose, Vitest, Recharts, Axios, GitHub Actions and other dependencies listed in package manifests are third-party libraries/tools. GitHub OAuth and GitHub Actions are external platform integrations. List any additional AI/API services actually enabled in the deployed version.
- Do not claim that a library, API, generated code, or external service was authored by the team.

## 2. Five-minute presentation script

| Time | What to say/show | Judging criteria |
|---|---|---|
| 0:00–0:40 | State the problem: quality evidence is scattered across tests, coverage, lint and dependency audits. Explain who needs a single release decision. | Innovation / relevance |
| 0:40–1:15 | Explain the architecture: React frontend → Express API → MongoDB; GitHub OAuth for repository access; GitHub Actions runner executes checks; CI sends structured metrics to the API; quality rules produce PASS/FAIL/WARNING and a report. | Technical depth |
| 1:15–2:20 | Live demo: open a connected project, show repository/branch, start the configured GitHub Actions workflow (or show a previously completed real run if internet is unavailable). | Functionality / demo |
| 2:20–3:20 | Open a real analysis result. Explain test pass rate, coverage, lint errors, dependency risks, findings and which quality rule passed/failed. | Functionality / software quality |
| 3:20–4:15 | Show the QA evidence: automated tests, typecheck/lint/build, CI workflow and a defect/regression example. Clearly distinguish executed results from planned tests. | Software quality / testing |
| 4:15–5:00 | State the value and limitations; summarize how the tool turns CI evidence into a consistent release decision. | Presentation |

Keep the talk under 5 minutes. Do not rely on slides alone; use the running application and a prepared backup report.

## 3. Three-minute Q&A preparation

**Q: What problem does GateGuard solve?**

A: It consolidates CI evidence such as tests, coverage, lint and dependency audit into a quality score, rule evaluation and report so a team can make a more consistent release decision.

**Q: Does GateGuard execute untrusted repository code on its API server?**

A: No. The intended design runs checks in an isolated GitHub Actions runner. The runner submits structured metrics to the GateGuard API using a project-scoped CI token.

**Q: What happens when a quality rule fails?**

A: The submitted analysis records the metrics and failed rules. The workflow checks the returned quality-gate status and can fail the CI job when the gate is not PASS.

**Q: How do you test GateGuard itself?**

A: Describe only the checks actually executed for the submitted build: backend unit tests, TypeScript typecheck, lint, frontend production build, dependency audit and manual API/UI test cases. Bring the real terminal/CI output as evidence.

**Q: What works offline?**

A: The frontend's explicitly labelled offline demo mode can demonstrate navigation and sample analysis interactions. It does not clone or scan a repository and its sample metrics are not real test results. A real analysis requires a configured backend, database, GitHub Actions workflow and network access.

**Q: Which parts are third-party?**

A: Frameworks, libraries and GitHub platform services are disclosed in the dependency manifests and project documentation. The team should explain its own integration, rules, application logic and design contributions accurately.

## 4. Live demo checklist

### Before the event

- [ ] Confirm the team has 1–3 registered members and all members will attend and speak.
- [ ] Confirm this project is not registered by another team.
- [ ] Replace team placeholders in this document.
- [ ] Use a dedicated demo account and non-sensitive test repository.
- [ ] Verify backend `/api/health` reports healthy and MongoDB is connected.
- [ ] Verify frontend `VITE_API_URL` points to the deployed/reachable API and `VITE_DEMO_MODE=false` for a real demo.
- [ ] Verify GitHub OAuth and webhook/CI configuration without exposing secrets.
- [ ] Run the workflow from GitHub Actions and verify the result appears in GateGuard.
- [ ] Prepare one passing and one failing quality-gate example, if available.
- [ ] Export a real PDF report and keep it locally.
- [ ] Prepare screenshots or a short recording as backup; label screenshots/data with their actual source/date.
- [ ] Test offline demo mode separately; do not present its sample values as real analysis.
- [ ] Bring laptop, charger, adapters and a copy of the project/demo assets on USB.

### At the venue

- [ ] Close terminals/tabs containing `.env`, credentials, tokens or personal data.
- [ ] Check display resolution, browser zoom and internet before the slot.
- [ ] Start from the dashboard/project page already loaded.
- [ ] Keep one browser tab open to the GitHub Actions run and one to the GateGuard report.
- [ ] Keep within 5 minutes; reserve Q&A for the following 3 minutes.

## 5. Offline demonstration mode — honest scope

Set `VITE_DEMO_MODE=true` in the frontend environment and start the frontend. The UI uses clearly identified sample records. On a project details page, **Run offline demo** adds a sample history row stored in that browser's localStorage. This is a UI demonstration only; it does not run tests, inspect repository source, call the API or produce an authentic quality score.

For an authentic result, use `VITE_DEMO_MODE=false`, a reachable backend and the configured GitHub Actions workflow. Do not describe offline sample output as a real scan.

## 6. QA evidence register

Fill this table only after executing each check. Attach terminal output, CI run URL, screenshots or issue IDs where possible.

| ID | Check | Expected result | Actual result | Evidence / date | Status |
|---|---|---|---|---|---|
| QA-01 | Backend typecheck | `npm run typecheck` exits 0 | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-02 | Backend unit tests | `npm test` exits 0 | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-03 | Backend lint | `npm run lint` exits 0 | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-04 | Backend build | `npm run build` exits 0 | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-05 | Frontend build | `npm run build` exits 0 | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-06 | Auth / protected route | Unauthenticated request rejected | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-07 | GitHub webhook | Valid signed delivery accepted; invalid signature rejected | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-08 | CI result submission | Valid CI token stores analysis; invalid token rejected | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-09 | Quality gate | Passing and failing metrics produce expected decision | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |
| QA-10 | PDF report | Owned analysis exports readable PDF | `[FILL IN]` | `[LINK/FILE]` | `[NOT RUN]` |

## 7. Known demo limitations to disclose

- A real analysis depends on a reachable API, database and configured GitHub Actions runner/workflow.
- Offline mode uses sample data and browser-local persistence; it is not an offline source-code scanner.
- Any feature marked preview/not persisted in the UI should be described as a preview, not a completed backend capability.
- The team must verify all workflows and integrations against the exact commit presented at the summit.
