# GateGuard — System Architecture

## Component overview

```mermaid
flowchart TD
    U[Developer] --> FE[React + TypeScript Dashboard]
    FE -->|JWT-protected REST API| API[Express + TypeScript API]
    API --> DB[(MongoDB)]
    FE -->|GitHub OAuth start| API
    API --> GH[GitHub OAuth + REST API]
    GH --> API
    R[GitHub Repository] --> W[GitHub Actions Runner]
    W --> L[ESLint]
    W --> T[Vitest + V8 Coverage]
    W --> A[npm audit]
    W --> B[Typecheck + Build]
    L --> P[Structured CI Payload]
    T --> P
    A --> P
    B --> P
    P -->|Project CI token| API
    API --> Q[Quality Gate Evaluator]
    Q --> DB
    Q --> AI[Optional AI Findings Explanation]
    DB --> FE
    API --> PDF[PDF Report Generator]
```

## Trust boundaries

1. **Browser boundary:** the browser calls authenticated REST endpoints. The API validates the JWT and checks the current user session version.
2. **API boundary:** all project, analysis, rule and report queries are scoped to the authenticated owner.
3. **Repository execution boundary:** GateGuard's API never clones or executes customer repository code. GitHub Actions executes checks in the hosted runner and sends only structured results to the API.
4. **CI ingestion boundary:** each project has a random CI token. GateGuard stores only its SHA-256 hash and compares submitted credentials using a timing-safe comparison.
5. **GitHub credential boundary:** OAuth uses one-time expiring state; the GitHub access token is encrypted with AES-256-GCM before storage.

## Main analysis sequence

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub Actions
    participant API as GateGuard API
    participant DB as MongoDB
    Dev->>GH: Push commit / dispatch workflow
    GH->>GH: Lint, tests, coverage, audit, build
    GH->>API: Submit metrics + findings + project CI token
    API->>API: Validate token and payload
    API->>DB: Load project quality rules
    API->>API: Calculate score and PASS/FAIL decision
    API->>DB: Save analysis and update project summary
    API-->>GH: Return quality gate result
    GH-->>Dev: Pass or fail CI job
    Dev->>API: Open analysis/report in dashboard
    API-->>Dev: Return owned analysis and PDF report
```

## Core data entities

- **User:** account identity, password hash, GitHub identity, encrypted GitHub credential, password-reset state and token version.
- **Project:** owner, GitHub repository identity, default branch, hashed CI token and latest quality summary.
- **QualityRule:** owner/project-scoped coverage, test pass-rate, lint and vulnerability thresholds.
- **Analysis:** owner, project, commit, branch, structured metrics, findings, rule results, score, gate status and AI explanation.
