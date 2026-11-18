import { describe, it, expect, vi } from "vitest";

vi.mock("../src/controllers/analysis.controller", () => ({
  listAnalyses: vi.fn(),
  getAnalysis: vi.fn(),
  runAnalysis: vi.fn(),
  ingestCiResult: vi.fn(),
}));

vi.mock("../src/controllers/auth.controller", () => ({
  register: vi.fn(),
  login: vi.fn(),
  me: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock("../src/controllers/oauth.controller", () => ({
  githubOAuthStart: vi.fn(),
  googleOAuthStart: vi.fn(),
  githubOAuthCallback: vi.fn(),
  googleOAuthCallback: vi.fn(),
  exchangeOAuthCode: vi.fn(),
}));

vi.mock("../src/controllers/github.controller", () => ({
  connectStart: vi.fn(),
  callback: vi.fn(),
  repositories: vi.fn(),
  disconnect: vi.fn(),
  githubWebhook: vi.fn(),
}));

vi.mock("../src/controllers/project.controller", () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  deleteProject: vi.fn(),
  regenerateCiToken: vi.fn(),
}));

vi.mock("../src/controllers/report.controller", () => ({
  exportReport: vi.fn(),
}));

vi.mock("../src/controllers/rules.controller", () => ({
  getRules: vi.fn(),
  updateRules: vi.fn(),
}));

vi.mock("../src/middleware/auth", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
}));

import analysisRoutes from "../src/routes/analysis.routes";
import authRoutes from "../src/routes/auth.routes";
import ciRoutes from "../src/routes/ci.routes";
import githubRoutes from "../src/routes/github.routes";
import projectRoutes from "../src/routes/project.routes";
import reportRoutes from "../src/routes/report.routes";
import rulesRoutes from "../src/routes/rules.routes";
import { requireAuth } from "../src/middleware/auth";

function getRoutes(router: any) {
  return router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => {
      const methods = Object.keys(layer.route.methods)
        .filter((method) => layer.route.methods[method])
        .map((method) => method.toUpperCase());

      return methods.map(
        (method) => `${method} ${layer.route.path}`,
      );
    })
    .flat();
}

describe("Route registration", () => {
  it("registers analysis endpoints", () => {
    expect(getRoutes(analysisRoutes)).toEqual([
      "GET /",
      "POST /projects/:projectId/run",
      "GET /:id",
    ]);
  });

  it("registers all auth and OAuth endpoints", () => {
    expect(getRoutes(authRoutes)).toEqual([
      "POST /register",
      "POST /login",
      "GET /oauth/github",
      "GET /oauth/github/callback",
      "GET /oauth/google",
      "GET /oauth/google/callback",
      "POST /oauth/exchange",
      "GET /me",
      "PATCH /profile",
      "POST /change-password",
      "POST /forgot-password",
      "POST /reset-password",
    ]);
  });

  it("registers CI result endpoint", () => {
    expect(getRoutes(ciRoutes)).toEqual([
      "POST /:projectId/results",
    ]);
  });

  it("registers GitHub endpoints and authentication middleware", () => {
    expect(getRoutes(githubRoutes)).toEqual([
      "POST /webhook",
      "GET /callback",
      "GET /connect",
      "GET /repositories",
      "DELETE /disconnect",
    ]);

    expect(
      githubRoutes.stack.some(
        (layer: any) => layer.handle === requireAuth,
      ),
    ).toBe(true);
  });

  it("registers project endpoints", () => {
    expect(getRoutes(projectRoutes)).toEqual([
      "GET /",
      "POST /",
      "POST /:id/ci-token/regenerate",
      "GET /:id",
      "DELETE /:id",
    ]);
  });

  it("registers PDF report endpoint", () => {
    expect(getRoutes(reportRoutes)).toEqual([
      "GET /:analysisId/pdf",
    ]);
  });

  it("registers quality rule endpoints", () => {
    expect(getRoutes(rulesRoutes)).toEqual([
      "GET /",
      "PUT /",
    ]);
  });
});
