import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { findOneMock, populateMock, PDFDocumentMock, docMock } = vi.hoisted(() => {
  const doc = {
    pipe: vi.fn(),
    fontSize: vi.fn(),
    text: vi.fn(),
    moveDown: vi.fn(),
    fillColor: vi.fn(),
    end: vi.fn(),
  };

  return {
    findOneMock: vi.fn(),
    populateMock: vi.fn(),
    PDFDocumentMock: vi.fn(),
    docMock: doc,
  };
});

vi.mock("../src/models/Analysis", () => ({
  Analysis: {
    findOne: findOneMock,
  },
}));

vi.mock("pdfkit", () => ({
  default: PDFDocumentMock,
}));

import { exportReport } from "../src/controllers/report.controller";

function mockRequest() {
  return {
    params: { analysisId: "analysis-123" },
    user: { id: "user-123" },
  } as unknown as Request;
}

function mockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
}

describe("exportReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findOneMock.mockReturnValue({
      populate: populateMock,
    });

    docMock.pipe.mockReturnValue(docMock);
    docMock.fontSize.mockReturnValue(docMock);
    docMock.text.mockReturnValue(docMock);
    docMock.moveDown.mockReturnValue(docMock);
    docMock.fillColor.mockReturnValue(docMock);
    docMock.end.mockReturnValue(undefined);

    PDFDocumentMock.mockImplementation(function () { return docMock; });
  });

  it("returns 404 when the analysis does not exist", async () => {
    populateMock.mockResolvedValue(null);

    const req = mockRequest();
    const res = mockResponse();

    await exportReport(req, res as unknown as Response);

    expect(findOneMock).toHaveBeenCalledWith({
      _id: "analysis-123",
      owner: "user-123",
    });

    expect(populateMock).toHaveBeenCalledWith(
      "project",
      "name repoFullName"
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Analysis not found",
    });

    expect(PDFDocumentMock).not.toHaveBeenCalled();
  });

  it("generates a PDF report with analysis data", async () => {
    const analysis = {
      id: "analysis-123",
      status: "PASS",
      score: 95,
      project: {
        name: "GateGuard Demo",
        repoFullName: "user/GateGuard",
      },
      metrics: {
        coverage: { lines: 90 },
        tests: { passRate: 100, passed: 20, total: 20 },
        eslint: { errors: 0 },
        security: { critical: 0, high: 1, moderate: 2 },
      },
      rules: [
        {
          passed: true,
          label: "Coverage",
          reason: "Coverage is above threshold",
        },
        {
          passed: false,
          label: "Security",
          reason: "High vulnerability found",
        },
      ],
      findings: [
        {
          severity: "high",
          title: "Unsafe dependency",
          file: "src/app.ts",
          line: 25,
          message: "A vulnerable dependency was detected",
          recommendation: "Update the dependency",
        },
      ],
      aiExplanation: "Improve dependency security.",
    };

    populateMock.mockResolvedValue(analysis);

    const req = mockRequest();
    const res = mockResponse();

    await exportReport(req, res as unknown as Response);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf"
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="gateguard-analysis-123.pdf"'
    );

    expect(docMock.pipe).toHaveBeenCalledWith(res);

    expect(docMock.text.mock.calls.some(([text]) => typeof text === "string" && text.includes("[HIGH] Unsafe dependency"))).toBe(true);
    expect(
      docMock.text.mock.calls.some(
        ([text]) =>
          typeof text === "string" &&
          text.includes("[HIGH] Unsafe dependency")
      )
    ).toBe(true);
  });

  it("uses fallback values when optional report data is missing", async () => {
    const analysis = {
      id: "analysis-456",
      status: "FAIL",
      score: 40,
      project: null,
      metrics: null,
      rules: [],
      findings: [],
      aiExplanation: null,
    };

    populateMock.mockResolvedValue(analysis);

    const req = mockRequest();
    req.params.analysisId = "analysis-456";
    const res = mockResponse();

    await exportReport(req, res as unknown as Response);

    expect(docMock.text).toHaveBeenCalledWith("Project");
    expect(docMock.text).toHaveBeenCalledWith("Line coverage: 0%");
    expect(docMock.text).toHaveBeenCalledWith("Test pass rate: 0% (0/0)");
    expect(docMock.text).toHaveBeenCalledWith("Not available");
    expect(docMock.end).toHaveBeenCalled();
  });
});
