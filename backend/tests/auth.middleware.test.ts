import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const { verifyTokenMock, findByIdMock, selectMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
  findByIdMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock("../src/utils/jwt", () => ({
  verifyToken: verifyTokenMock,
}));

vi.mock("../src/models/User", () => ({
  User: {
    findById: findByIdMock,
  },
}));

import { requireAuth } from "../src/middleware/auth";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

function mockRequest(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
    user: undefined,
  } as unknown as Request;
}

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdMock.mockReturnValue({ select: selectMock });
  });

  it("rejects requests without an Authorization header", async () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await requireAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid or expired tokens", async () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const req = mockRequest("Bearer invalid-token");
    const res = mockResponse();
    const next = vi.fn();

    await requireAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
    });
    expect(findByIdMock).not.toHaveBeenCalled();
  });

  it("rejects when the user does not exist", async () => {
    verifyTokenMock.mockReturnValue({
      id: "user-123",
      email: "test@example.com",
    });
    selectMock.mockResolvedValue(null);

    const req = mockRequest("Bearer valid-token");
    const res = mockResponse();
    const next = vi.fn();

    await requireAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Session is invalid or has expired. Please sign in again.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when tokenVersion does not match", async () => {
    verifyTokenMock.mockReturnValue({
      id: "user-123",
      email: "test@example.com",
      tokenVersion: 1,
    });
    selectMock.mockResolvedValue({ tokenVersion: 2 });

    const req = mockRequest("Bearer valid-token");
    const res = mockResponse();
    const next = vi.fn();

    await requireAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a valid authenticated user", async () => {
    verifyTokenMock.mockReturnValue({
      id: "user-123",
      email: "test@example.com",
      tokenVersion: 2,
    });
    selectMock.mockResolvedValue({ tokenVersion: 2 });

    const req = mockRequest("Bearer valid-token");
    const res = mockResponse();
    const next = vi.fn();

    await requireAuth(req, res as unknown as Response, next);

    expect(req.user).toEqual({
      id: "user-123",
      email: "test@example.com",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("forwards database errors to next", async () => {
    const error = new Error("Database unavailable");

    verifyTokenMock.mockReturnValue({
      id: "user-123",
      email: "test@example.com",
    });
    selectMock.mockRejectedValue(error);

    const req = mockRequest("Bearer valid-token");
    const res = mockResponse();
    const next = vi.fn();

    await requireAuth(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
