# GateGuard 🛡️
### Software Quality Monitoring & Quality Gate Management Platform

**Build better software. Detect quality issues early. Ship with confidence.**

GateGuard is a software quality monitoring and quality gate management platform designed to help development teams evaluate code quality, monitor testing performance, identify security risks, and make informed release decisions.

By integrating with GitHub and CI/CD workflows, GateGuard brings essential software quality insights into one centralized workspace.

---
## Vercel Link : https://gateguard-git-test-pull-request-gate-guard1.vercel.app/

## 🚀 Key Features

### 1. GitHub Integration
- Connect GitHub accounts and repositories.
- Link repositories to GateGuard projects.
- Monitor project-related quality analysis.
- Support GitHub-based development workflows.

### 2. Quality Monitoring Dashboard
Get a centralized overview of software quality through key metrics:

- **Test Coverage:** Measures how much of the codebase is covered by tests.
- **Test Pass Rate:** Tracks successful versus total test executions.
- **ESLint Errors:** Highlights code quality and linting issues.
- **Dependency Vulnerabilities:** Tracks security vulnerabilities in project dependencies.
- **Quality Score:** Provides an overall view of project quality.

### 3. Analysis History
- View previous analysis results.
- Track project quality assessments.
- Review historical findings and analysis details.
- Compare results across analysis sessions.

### 4. Configurable Quality Rules
Define quality requirements according to project needs.

Default quality thresholds include:

| Quality Metric | Default Requirement |
|---|---:|
| Test Coverage | At least 80% |
| Test Pass Rate | At least 95% |
| ESLint Errors | Maximum 0 |
| Critical/High Vulnerabilities | Maximum 0 |

### 5. CI/CD Quality Gate
Integrate GateGuard with GitHub Actions to automate quality checks.

- Receive CI analysis results.
- Evaluate results against configured quality rules.
- Determine whether a build passes or fails the quality gate.
- Help teams identify quality issues before release.

### 6. AI-Assisted Analysis Explanation
GateGuard includes an analysis explanation service powered by Google's Gemini API when configured. It can help explain analysis findings in a more understandable way.

---

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind/CSS-based styling, Lucide Icons |
| Data Visualization | Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| Integrations | GitHub OAuth, Google OAuth |
| AI Service | Google Gemini API |
| CI/CD | GitHub Actions |
| Deployment | Vercel |

---

## 🏗️ Project Architecture

GateGuard follows a frontend-backend architecture.

```text
GateGuard/
│
├── api/                  # Vercel API handlers
│
├── backend/
│   ├── src/
│   │   ├── controllers/  # Request handling and business logic
│   │   ├── middleware/   # Authentication and middleware
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Application services
│   │   └── server.ts     # Backend entry point
│   │
│   └── tests/            # Backend tests
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages
│   │   ├── lib/          # API and utility functions
│   │   └── ...
│   │
│   └── ...
│
├── vercel.json
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have installed:

- Node.js 20 or later
- npm
- MongoDB database
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/nawsintabassum/GateGuard414
cd GateGuard
```

### 2. Configure Environment Variables

Configure the environment variables required by the backend and frontend.

Create the necessary `.env` files using the project's environment example files, if available.

Typical configuration includes:

**Backend**
- MongoDB connection URI
- JWT secret
- Frontend/client URL
- GitHub OAuth credentials
- Google OAuth credentials
- Gemini API key (optional)

**Frontend**
- API base URL
- Demo mode configuration, if required

Never commit actual secrets, API keys, database credentials, or OAuth client secrets to GitHub.

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Start the Backend

```bash
npm run dev
```

The backend development server runs at:

```text
http://localhost:5000
```

### 5. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### 6. Start the Frontend

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

---

## 🧪 Testing

Run backend tests:

```bash
cd backend
npm test
```

Run backend tests with coverage:

```bash
npm run test:coverage
```

Build the frontend:

```bash
cd frontend
npm run build
```

---

## 🔄 CI/CD Integration

GateGuard supports quality gate evaluation through GitHub Actions.

A typical workflow:

1. A developer pushes code or creates a pull request.
2. GitHub Actions runs the configured CI workflow.
3. The workflow collects available test and quality metrics.
4. Results are submitted to the GateGuard API.
5. GateGuard evaluates the results against configured quality rules.
6. The quality gate returns a PASS or FAIL decision.

This helps development teams identify quality problems before changes move further through the delivery pipeline.

---

## 🔐 Security

GateGuard incorporates security-focused practices, including:

- Password hashing using bcrypt.
- JWT-based authentication.
- Protected API routes.
- Secure handling of sensitive user fields.
- GitHub OAuth integration.
- Environment-based secret configuration.
- Dependency vulnerability monitoring.

---

## 🎯 Why GateGuard?

Software quality is more than writing code that works. It also involves maintainability, test reliability, security, and consistency.

GateGuard helps development teams:

- Monitor software quality from one workspace.
- Identify potential issues earlier.
- Establish consistent quality standards.
- Automate quality gate decisions.
- Make more informed release decisions.

**Our goal is to make software quality measurable, understandable, and actionable.**

---

## 🌐 Project Links

- **GitHub Repository:** https://github.com/nawsintabassum/GateGuard414
- **Live Application:https://gateguard-git-test-pull-request-gate-guard1.vercel.app

---

## 👥 Project Information

**Project Name:** GateGuard  
**Project Category:** Software Quality Monitoring & Quality Gate Management  
**Project Showcase:** DIU SQAT Summit

---


## Professional workspace capabilities

See [`docs/PROFESSIONAL_WORKSPACE_FEATURES.md`](docs/PROFESSIONAL_WORKSPACE_FEATURES.md) for team roles, notifications and Slack setup, policy templates, GitHub pull-request AI review setup, permissions and API endpoints.
