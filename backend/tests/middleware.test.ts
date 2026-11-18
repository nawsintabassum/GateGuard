import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../src/utils/asyncHandler";
import { notFound, errorHandler } from "../src/middleware/error";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("asyncHandler", () => {
  it("forwards rejected promises to next", async () => {
    const error = new Error("Test error");
    const next = vi.fn();
    const handler = asyncHandler(async () => {
      throw error;
    });

    handler({} as Request, {} as Response, next as NextFunction);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledWith(error);
  });

  it("runs a successful async handler", async () => {
    const next = vi.fn();
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);

    handler({} as Request, {} as Response, next as NextFunction);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe("notFound", () => {
  it("returns 404 for unknown routes", () => {
    const res = mockResponse();

    notFound({} as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Route not found" });
  });
});

describe("errorHandler", () => {
  it("handles Zod validation errors", () => {
    const res = mockResponse();
    const error = { name: "ZodError", issues: [{ message: "Required" }] };

    errorHandler(error, {} as Request, res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Validation failed",
      errors: error.issues,
    });
  });

  it("handles duplicate database records", () => {
    const res = mockResponse();

    errorHandler({ code: 11000 }, {} as Request, res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "A record with this value already exists",
    });
  });

  it.each(["ValidationError", "CastError"])(
    "handles %s errors",
    (name) => {
      const res = mockResponse();

      errorHandler({ name }, {} as Request, res as unknown as Response, vi.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid request data",
      });
    },
  );

  it("handles custom client errors", () => {
    const res = mockResponse();

    errorHandler(
      { statusCode: 403, message: "Forbidden" },
      {} as Request,
      res as unknown as Response,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("hides internal server error details", () => {
    const res = mockResponse();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      errorHandler(
        { statusCode: 500, message: "Database password leaked" },
        {} as Request,
        res as unknown as Response,
        vi.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error",
      });
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
