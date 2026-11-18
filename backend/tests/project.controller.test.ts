import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  findOneAndDelete: vi.fn(),
  deleteMany: vi.fn(),
  createProject: vi.fn(),
  createRule: vi.fn(),
  randomToken: vi.fn(),
  sha256: vi.fn(),
}));

vi.mock("../src/models/Project", () => ({
  Project: {
    find: mocks.find,
    findOne: mocks.findOne,
    findOneAndDelete: mocks.findOneAndDelete,
    create: mocks.createProject,
  },
}));

vi.mock("../src/models/Analysis", () => ({
  Analysis: {
    deleteMany: mocks.deleteMany,
  },
}));

vi.mock("../src/models/QualityRule", () => ({
  QualityRule: {
    create: mocks.createRule,
    deleteMany: mocks.deleteMany,
  },
}));

vi.mock("../src/utils/crypto", () => ({
  randomToken: mocks.randomToken,
  sha256: mocks.sha256,
}));

import {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  regenerateCiToken,
} from "../src/controllers/project.controller";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

function mockRequest(body: any = {}, id = "project-123", userId = "user-123") {
  return {
    body,
    params: { id },
    user: { id: userId },
  } as unknown as Request;
}

const sampleProject = () => ({
  _id: "project-123",
  owner: "user-123",
  name: "Test Repo",
  repoFullName: "owner/repo",
  repoUrl: "https://github.com/owner/repo",
  defaultBranch: "main",
  ciTokenHash: "hashed-token",
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn().mockReturnValue({
    _id: "project-123",
    name: "Test Repo",
    repoFullName: "owner/repo",
    repoUrl: "https://github.com/owner/repo",
  }),
});

beforeEach(() => {
  vi.clearAllMocks();

  mocks.randomToken.mockReturnValue("test-ci-token");
  mocks.sha256.mockReturnValue("hashed-ci-token");
  mocks.createRule.mockResolvedValue({});
  mocks.deleteMany.mockResolvedValue({ deletedCount: 1 });
});

describe("listProjects", () => {
  it("returns projects belonging to the logged-in user", async () => {
    const projects = [sampleProject()];
    const select = vi.fn().mockResolvedValue(projects);
    const sort = vi.fn().mockReturnValue({ select });

    mocks.find.mockReturnValue({ sort });

    const req = mockRequest();
    const res = mockResponse();

    await listProjects(req, res);

    expect(mocks.find).toHaveBeenCalledWith({ owner: "user-123" });
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(select).toHaveBeenCalledWith("-ciTokenHash");
    expect(res.json).toHaveBeenCalledWith({ projects });
  });
});

describe("createProject", () => {
  it("creates a project and returns the CI token", async () => {
    const project = sampleProject();
    mocks.createProject.mockResolvedValue(project);

    const req = mockRequest({
      name: "Test Repo",
      repoUrl: "https://github.com/owner/repo",
      branch: "develop",
    });
    const res = mockResponse();

    await createProject(req, res);

    expect(mocks.createProject).toHaveBeenCalledWith({
      owner: "user-123",
      name: "Test Repo",
      repoFullName: "owner/repo",
      repoUrl: "https://github.com/owner/repo",
      defaultBranch: "develop",
      ciTokenHash: "hashed-ci-token",
    });

    expect(mocks.createRule).toHaveBeenCalledWith({
      owner: "user-123",
      project: project._id,
    });

    expect(project.toObject).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      project: {
        _id: "project-123",
        name: "Test Repo",
        repoFullName: "owner/repo",
        repoUrl: "https://github.com/owner/repo",
      },
      ciToken: "test-ci-token",
    });
  });

  it("uses the repository name and main branch as defaults", async () => {
    mocks.createProject.mockResolvedValue(sampleProject());

    await createProject(
      mockRequest({ repoUrl: "https://github.com/owner/my-repo" }),
      mockResponse()
    );

    expect(mocks.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "my-repo",
        defaultBranch: "main",
      })
    );
  });

  it("rejects an invalid repository URL", async () => {
    await expect(
      createProject(
        mockRequest({ repoUrl: "https://example.com/owner/repo" }),
        mockResponse()
      )
    ).rejects.toThrow();

    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  it("rejects an empty repository URL", async () => {
    await expect(
      createProject(mockRequest({ repoUrl: "" }), mockResponse())
    ).rejects.toThrow();

    expect(mocks.createProject).not.toHaveBeenCalled();
  });
});

describe("getProject", () => {
  it("returns a project without exposing its CI token hash", async () => {
    const project = sampleProject();
    const select = vi.fn().mockResolvedValue(project);

    mocks.findOne.mockReturnValue({ select });

    const req = mockRequest();
    const res = mockResponse();

    await getProject(req, res);

    expect(mocks.findOne).toHaveBeenCalledWith({
      _id: "project-123",
      owner: "user-123",
    });
    expect(select).toHaveBeenCalledWith("-ciTokenHash");
    expect(res.json).toHaveBeenCalledWith({ project });
  });

  it("returns 404 when the project does not exist", async () => {
    const select = vi.fn().mockResolvedValue(null);
    mocks.findOne.mockReturnValue({ select });

    const res = mockResponse();

    await getProject(mockRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Project not found",
    });
  });
});

describe("deleteProject", () => {
  it("deletes the project and its related records", async () => {
    const project = sampleProject();
    mocks.findOneAndDelete.mockResolvedValue(project);

    const res = mockResponse();

    await deleteProject(mockRequest(), res);

    expect(mocks.findOneAndDelete).toHaveBeenCalledWith({
      _id: "project-123",
      owner: "user-123",
    });

    expect(mocks.deleteMany).toHaveBeenCalledTimes(2);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      owner: "user-123",
      project: project._id,
    });

    expect(res.json).toHaveBeenCalledWith({
      message: "Project deleted",
    });
  });

  it("returns 404 when the project does not exist", async () => {
    mocks.findOneAndDelete.mockResolvedValue(null);

    const res = mockResponse();

    await deleteProject(mockRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Project not found",
    });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});

describe("regenerateCiToken", () => {
  it("generates and saves a new CI token", async () => {
    const project = sampleProject();
    const select = vi.fn().mockResolvedValue(project);

    mocks.findOne.mockReturnValue({ select });

    const res = mockResponse();

    await regenerateCiToken(mockRequest(), res);

    expect(mocks.findOne).toHaveBeenCalledWith({
      _id: "project-123",
      owner: "user-123",
    });
    expect(select).toHaveBeenCalledWith("+ciTokenHash");
    expect(mocks.randomToken).toHaveBeenCalled();
    expect(mocks.sha256).toHaveBeenCalledWith("test-ci-token");
    expect(project.ciTokenHash).toBe("hashed-ci-token");
    expect(project.save).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: "CI token regenerated successfully",
      ciToken: "test-ci-token",
    });
  });

  it("returns 404 when the project does not exist", async () => {
    const select = vi.fn().mockResolvedValue(null);
    mocks.findOne.mockReturnValue({ select });

    const res = mockResponse();

    await regenerateCiToken(mockRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Project not found",
    });
    expect(mocks.randomToken).not.toHaveBeenCalled();
  });
});
