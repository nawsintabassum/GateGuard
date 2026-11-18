import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  projectSelect: vi.fn(),
  exists: vi.fn(),
  analysisFind: vi.fn(),
  analysisFindOne: vi.fn(),
  populate: vi.fn(),
  sort: vi.fn(),
  limit: vi.fn(),
  create: vi.fn(),
  ruleFindOne: vi.fn(),
  ruleCreate: vi.fn(),
  explainFindings: vi.fn(),
  sha256: vi.fn(),
  save: vi.fn(),
}));

vi.mock("../src/models/Project", () => ({
  Project: {
    findById: mocks.findById,
    exists: mocks.exists,
  },
}));

vi.mock("../src/models/QualityRule", () => ({
  QualityRule: {
    findOne: mocks.ruleFindOne,
    create: mocks.ruleCreate,
  },
}));

vi.mock("../src/models/Analysis", () => ({
  Analysis: {
    create: mocks.create,
    find: mocks.analysisFind,
    findOne: mocks.analysisFindOne,
  },
}));

vi.mock("../src/services/ai.service", () => ({
  explainFindings: mocks.explainFindings,
}));

vi.mock("../src/utils/crypto", () => ({
  sha256: mocks.sha256,
}));

import {
  ingestCiResult,
  listAnalyses,
  getAnalysis,
  runAnalysis,
} from "../src/controllers/analysis.controller";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function mockRequest(options: any = {}) {
  return {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    user: { id: options.userId || "user-123" },
    header: vi.fn().mockReturnValue(options.token || "valid-token"),
  } as unknown as Request;
}

const metrics = {
  coverage: { statements: 90, branches: 85, functions: 90, lines: 90 },
  tests: { total: 10, passed: 10, failed: 0, skipped: 0 },
  eslint: { errors: 0, warnings: 0 },
  security: { critical: 0, high: 0, moderate: 0, low: 0 },
};

const sampleProject = () => ({
  _id: "project-123",
  owner: "user-123",
  ciTokenHash: "hashed-token",
  defaultBranch: "main",
  save: mocks.save,
});

const sampleAnalysis = () => ({
  _id: "analysis-123",
  status: "PASS",
  score: 95,
  rules: [],
});

function setupProjectSelect(project: any) {
  mocks.findById.mockReturnValue({
    select: vi.fn().mockResolvedValue(project),
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.sha256.mockReturnValue("hashed-token");
  mocks.explainFindings.mockResolvedValue("AI explanation");
  mocks.save.mockResolvedValue(undefined);

  mocks.ruleFindOne.mockResolvedValue({
    minCoverage: 80,
    minTestPassRate: 95,
    maxEslintErrors: 0,
    maxCriticalVulnerabilities: 0,
    maxHighVulnerabilities: 0,
  });

  mocks.create.mockResolvedValue(sampleAnalysis());
});

describe("ingestCiResult", () => {
  it("returns 404 when project does not exist", async () => {
    setupProjectSelect(null);
    const req = mockRequest({ params: { projectId: "missing" } });
    const res = mockResponse();

    await ingestCiResult(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Project not found" });
  });

  it("rejects an invalid CI token", async () => {
    setupProjectSelect(sampleProject());
    mocks.sha256.mockReturnValue("wrong-hash");

    const req = mockRequest();
    const res = mockResponse();

    await ingestCiResult(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid CI token" });
  });

  it("stores a valid CI result successfully", async () => {
    const project = sampleProject();
    setupProjectSelect(project);

    const req = mockRequest({
      body: { metrics, findings: [] },
    });
    const res = mockResponse();

    await ingestCiResult(req, res);

    expect(mocks.create).toHaveBeenCalled();
    expect(project.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      analysis: expect.any(Object),
      qualityGate: {
        status: "PASS",
        score: 95,
        rules: [],
      },
    });
  });

  it("rejects inconsistent test totals", async () => {
    setupProjectSelect(sampleProject());

    const req = mockRequest({
      body: {
        metrics: {
          ...metrics,
          tests: { total: 10, passed: 8, failed: 1, skipped: 0 },
        },
      },
    });
    const res = mockResponse();

    await expect(ingestCiResult(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Test totals must equal passed + failed + skipped",
    });
  });

  it("rejects an invalid finding", async () => {
    setupProjectSelect(sampleProject());

    const req = mockRequest({
      body: {
        metrics,
        findings: [{ title: "" }],
      },
    });
    const res = mockResponse();

    await expect(ingestCiResult(req, res)).rejects.toThrow();
  });

  it("rejects an invalid commit SHA", async () => {
    setupProjectSelect(sampleProject());

    const req = mockRequest({
      body: { metrics, commitSha: "invalid-sha" },
    });
    const res = mockResponse();

    await expect(ingestCiResult(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects an invalid duration", async () => {
    setupProjectSelect(sampleProject());

    const req = mockRequest({
      body: { metrics, durationMs: -1 },
    });
    const res = mockResponse();

    await expect(ingestCiResult(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects an invalid start date", async () => {
    setupProjectSelect(sampleProject());

    const req = mockRequest({
      body: { metrics, startedAt: "not-a-date" },
    });
    const res = mockResponse();

    await expect(ingestCiResult(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("uses project default branch when branch is omitted", async () => {
    const project = sampleProject();
    setupProjectSelect(project);

    const req = mockRequest({ body: { metrics } });
    const res = mockResponse();

    await ingestCiResult(req, res);

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "main",
        source: "github-actions",
      }),
    );
  });

  it("creates project rules when no rules exist", async () => {
    const project = sampleProject();
    setupProjectSelect(project);
    mocks.ruleFindOne.mockResolvedValue(null);
    mocks.ruleCreate.mockResolvedValue({
      minCoverage: 80,
      minTestPassRate: 95,
      maxEslintErrors: 0,
      maxCriticalVulnerabilities: 0,
      maxHighVulnerabilities: 0,
    });

    const req = mockRequest({ body: { metrics } });
    const res = mockResponse();

    await ingestCiResult(req, res);

    expect(mocks.ruleCreate).toHaveBeenCalledWith({
      owner: "user-123",
      project: "project-123",
    });
  });
});

describe("listAnalyses", () => {
  beforeEach(() => {
    mocks.analysisFind.mockReturnValue({
      populate: mocks.populate,
    });
    mocks.populate.mockReturnValue({
      sort: mocks.sort,
    });
    mocks.sort.mockReturnValue({
      limit: mocks.limit,
    });
    mocks.limit.mockResolvedValue([sampleAnalysis()]);
  });

  it("lists analyses for the current user", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await listAnalyses(req, res);

    expect(mocks.analysisFind).toHaveBeenCalledWith({
      owner: "user-123",
    });
    expect(mocks.limit).toHaveBeenCalledWith(50);
    expect(res.json).toHaveBeenCalledWith({
      analyses: [expect.any(Object)],
    });
  });

  it("filters analyses by an existing project", async () => {
    mocks.exists.mockResolvedValue(true);

    const req = mockRequest({
      query: { projectId: "project-123", limit: "20" },
    });
    const res = mockResponse();

    await listAnalyses(req, res);

    expect(mocks.analysisFind).toHaveBeenCalledWith({
      owner: "user-123",
      project: "project-123",
    });
    expect(mocks.limit).toHaveBeenCalledWith(20);
  });

  it("returns 404 for a project not owned by the user", async () => {
    mocks.exists.mockResolvedValue(false);

    const req = mockRequest({
      query: { projectId: "foreign-project" },
    });
    const res = mockResponse();

    await listAnalyses(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Project not found",
    });
  });

  it("caps the requested limit at 100", async () => {
    const req = mockRequest({ query: { limit: "500" } });
    const res = mockResponse();

    await listAnalyses(req, res);

    expect(mocks.limit).toHaveBeenCalledWith(100);
  });
});

describe("getAnalysis", () => {
  it("returns an analysis when found", async () => {
    mocks.analysisFindOne.mockReturnValue({
      populate: vi.fn().mockResolvedValue(sampleAnalysis()),
    });

    const req = mockRequest({ params: { id: "analysis-123" } });
    const res = mockResponse();

    await getAnalysis(req, res);

    expect(res.json).toHaveBeenCalledWith({
      analysis: expect.any(Object),
    });
  });

  it("returns 404 when analysis is missing", async () => {
    mocks.analysisFindOne.mockReturnValue({
      populate: vi.fn().mockResolvedValue(null),
    });

    const req = mockRequest({ params: { id: "missing" } });
    const res = mockResponse();

    await getAnalysis(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Analysis not found",
    });
  });
});

describe("runAnalysis", () => {
  it("returns 501 because execution is delegated to GitHub Actions", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await runAnalysis(req, res);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining("isolated GitHub Actions runner"),
    });
  });
});
