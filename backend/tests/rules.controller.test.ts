import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const {
  existsMock,
  findOneMock,
  createMock,
  findOneAndUpdateMock,
} = vi.hoisted(() => ({
  existsMock: vi.fn(),
  findOneMock: vi.fn(),
  createMock: vi.fn(),
  findOneAndUpdateMock: vi.fn(),
}));

vi.mock("../src/models/Project", () => ({
  Project: {
    exists: existsMock,
  },
}));

vi.mock("../src/models/QualityRule", () => ({
  QualityRule: {
    findOne: findOneMock,
    create: createMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import { getRules, updateRules } from "../src/controllers/rules.controller";

const USER_ID = "user-123";
const PROJECT_ID = "project-123";

const validRules = {
  minCoverage: 80,
  minTestPassRate: 95,
  maxEslintErrors: 0,
  maxCriticalVulnerabilities: 0,
  maxHighVulnerabilities: 0,
};

function mockRequest(
  query: Record<string, unknown> = {},
  body: unknown = {}
) {
  return {
    user: { id: USER_ID },
    query,
    body,
  } as unknown as Request;
}

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

describe("Rules controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsMock.mockResolvedValue({ _id: PROJECT_ID });
  });

  describe("getRules", () => {
    it("returns 404 when the project does not belong to the user", async () => {
      existsMock.mockResolvedValue(null);

      const req = mockRequest({ projectId: PROJECT_ID });
      const res = mockResponse();

      await getRules(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Project not found",
      });
      expect(findOneMock).not.toHaveBeenCalled();
    });

    it("returns existing rules for a project", async () => {
      const existingRules = { ...validRules, _id: "rule-123" };
      findOneMock.mockResolvedValue(existingRules);

      const req = mockRequest({ projectId: PROJECT_ID });
      const res = mockResponse();

      await getRules(req, res as unknown as Response);

      expect(existsMock).toHaveBeenCalledWith({
        _id: PROJECT_ID,
        owner: USER_ID,
      });
      expect(findOneMock).toHaveBeenCalledWith({
        owner: USER_ID,
        project: PROJECT_ID,
      });
      expect(res.json).toHaveBeenCalledWith({
        rules: existingRules,
      });
      expect(createMock).not.toHaveBeenCalled();
    });

    it("creates default rules when no existing rules are found", async () => {
      const newRules = { ...validRules, _id: "new-rule" };
      findOneMock.mockResolvedValue(null);
      createMock.mockResolvedValue(newRules);

      const req = mockRequest();
      const res = mockResponse();

      await getRules(req, res as unknown as Response);

      expect(findOneMock).toHaveBeenCalledWith({
        owner: USER_ID,
        project: null,
      });
      expect(createMock).toHaveBeenCalledWith({
        owner: USER_ID,
        project: null,
      });
      expect(res.json).toHaveBeenCalledWith({
        rules: newRules,
      });
    });
  });

  describe("updateRules", () => {
    it("returns 404 when the project does not belong to the user", async () => {
      existsMock.mockResolvedValue(null);

      const req = mockRequest({ projectId: PROJECT_ID }, validRules);
      const res = mockResponse();

      await updateRules(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Project not found",
      });
      expect(findOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects invalid rule values", async () => {
      const invalidRules = {
        ...validRules,
        minCoverage: 120,
      };

      const req = mockRequest({}, invalidRules);
      const res = mockResponse();

      await expect(
        updateRules(req, res as unknown as Response)
      ).rejects.toThrow();

      expect(findOneAndUpdateMock).not.toHaveBeenCalled();
    });

    it("updates rules for a project with upsert enabled", async () => {
      const updatedRules = { ...validRules, _id: "updated-rule" };
      findOneAndUpdateMock.mockResolvedValue(updatedRules);

      const req = mockRequest({ projectId: PROJECT_ID }, validRules);
      const res = mockResponse();

      await updateRules(req, res as unknown as Response);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          owner: USER_ID,
          project: PROJECT_ID,
        },
        {
          $set: validRules,
          $setOnInsert: {
            owner: USER_ID,
            project: PROJECT_ID,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      expect(res.json).toHaveBeenCalledWith({
        rules: updatedRules,
      });
    });

    it("updates global rules when no projectId is provided", async () => {
      const updatedRules = { ...validRules, _id: "global-rule" };
      findOneAndUpdateMock.mockResolvedValue(updatedRules);

      const req = mockRequest({}, validRules);
      const res = mockResponse();

      await updateRules(req, res as unknown as Response);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          owner: USER_ID,
          project: null,
        },
        {
          $set: validRules,
          $setOnInsert: {
            owner: USER_ID,
            project: null,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      expect(res.json).toHaveBeenCalledWith({
        rules: updatedRules,
      });
    });
  });
});
