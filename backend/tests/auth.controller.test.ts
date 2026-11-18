import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
  compare: vi.fn(),
  signAccessToken: vi.fn(),
  randomToken: vi.fn(),
  sha256: vi.fn(),
  env: { NODE_ENV: "test" },
}));

vi.mock("../src/models/User", () => ({
  User: {
    findOne: mocks.findOne,
    findById: mocks.findById,
    findByIdAndUpdate: mocks.findByIdAndUpdate,
    create: mocks.create,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.hash,
    compare: mocks.compare,
  },
}));

vi.mock("../src/utils/jwt", () => ({
  signAccessToken: mocks.signAccessToken,
}));

vi.mock("../src/utils/crypto", () => ({
  randomToken: mocks.randomToken,
  sha256: mocks.sha256,
}));

vi.mock("../src/config/env", () => ({
  env: mocks.env,
}));

import {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../src/controllers/auth.controller";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
}

function mockRequest(body: any = {}, userId = "user-123") {
  return {
    body,
    user: { id: userId },
  } as unknown as Request;
}

const sampleUser = () => ({
  _id: { toString: () => "user-123" },
  name: "Test User",
  email: "test@example.com",
  passwordHash: "hashed-password",
  githubId: null,
  githubUsername: null,
  tokenVersion: 0,
  save: vi.fn().mockResolvedValue(undefined),
  set: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.NODE_ENV = "test";
  mocks.hash.mockResolvedValue("hashed-password");
  mocks.compare.mockResolvedValue(true);
  mocks.signAccessToken.mockReturnValue("test-access-token");
  mocks.randomToken.mockReturnValue("test-reset-token");
  mocks.sha256.mockReturnValue("hashed-reset-token");
});

describe("register", () => {
  it("registers a new user successfully", async () => {
    const user = sampleUser();

    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue(user);

    const res = mockResponse();

    await register(
      mockRequest({
        name: "Test User",
        email: "TEST@example.com",
        password: "password123",
      }),
      res as unknown as Response,
    );

    expect(mocks.findOne).toHaveBeenCalledWith({
      email: "test@example.com",
    });
    expect(mocks.hash).toHaveBeenCalledWith("password123", 12);
    expect(mocks.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      token: "test-access-token",
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        githubConnected: false,
        githubUsername: null,
      },
    });
  });

  it("rejects an existing email", async () => {
    mocks.findOne.mockResolvedValue({ email: "test@example.com" });

    const res = mockResponse();

    await register(
      mockRequest({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects invalid registration data", async () => {
    await expect(
      register(
        mockRequest({
          name: "A",
          email: "invalid-email",
          password: "123",
        }),
        mockResponse() as unknown as Response,
      ),
    ).rejects.toThrow();
  });
});

describe("login", () => {
  it("logs in with valid credentials", async () => {
    const user = sampleUser();
    const query = { select: vi.fn().mockResolvedValue(user) };
    mocks.findOne.mockReturnValue(query);

    const res = mockResponse();

    await login(
      mockRequest({
        email: "TEST@example.com",
        password: "password123",
      }),
      res as unknown as Response,
    );

    expect(query.select).toHaveBeenCalledWith("+passwordHash");
    expect(mocks.compare).toHaveBeenCalledWith(
      "password123",
      "hashed-password",
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects an unknown user", async () => {
    const query = { select: vi.fn().mockResolvedValue(null) };
    mocks.findOne.mockReturnValue(query);

    const res = mockResponse();

    await login(
      mockRequest({
        email: "test@example.com",
        password: "password123",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid email or password",
    });
  });

  it("rejects an incorrect password", async () => {
    const query = {
      select: vi.fn().mockResolvedValue(sampleUser()),
    };
    mocks.findOne.mockReturnValue(query);
    mocks.compare.mockResolvedValue(false);

    const res = mockResponse();

    await login(
      mockRequest({
        email: "test@example.com",
        password: "wrong-password",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("me", () => {
  it("returns the current user", async () => {
    mocks.findById.mockResolvedValue(sampleUser());

    const res = mockResponse();

    await me(mockRequest(), res as unknown as Response);

    expect(mocks.findById).toHaveBeenCalledWith("user-123");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when the user does not exist", async () => {
    mocks.findById.mockResolvedValue(null);

    const res = mockResponse();

    await me(mockRequest(), res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("updateProfile", () => {
  it("updates the profile successfully", async () => {
    mocks.findOne.mockResolvedValue(null);
    mocks.findByIdAndUpdate.mockResolvedValue(sampleUser());

    const res = mockResponse();

    await updateProfile(
      mockRequest({
        name: "Updated User",
        email: "updated@example.com",
      }),
      res as unknown as Response,
    );

    expect(mocks.findByIdAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects an email already used by another user", async () => {
    mocks.findOne.mockResolvedValue({ email: "used@example.com" });

    const res = mockResponse();

    await updateProfile(
      mockRequest({
        name: "Updated User",
        email: "used@example.com",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the user cannot be updated", async () => {
    mocks.findOne.mockResolvedValue(null);
    mocks.findByIdAndUpdate.mockResolvedValue(null);

    const res = mockResponse();

    await updateProfile(
      mockRequest({
        name: "Updated User",
        email: "updated@example.com",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("changePassword", () => {
  it("changes the password and invalidates existing tokens", async () => {
    const user = sampleUser();
    const query = { select: vi.fn().mockResolvedValue(user) };
    mocks.findById.mockReturnValue(query);

    const res = mockResponse();

    await changePassword(
      mockRequest({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      }),
      res as unknown as Response,
    );

    expect(mocks.hash).toHaveBeenCalledWith("newpassword123", 12);
    expect(user.tokenVersion).toBe(1);
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when the user does not exist", async () => {
    mocks.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const res = mockResponse();

    await changePassword(
      mockRequest({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rejects an incorrect current password", async () => {
    const user = sampleUser();
    mocks.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });
    mocks.compare.mockResolvedValue(false);

    const res = mockResponse();

    await changePassword(
      mockRequest({
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.save).not.toHaveBeenCalled();
  });

  it("rejects reusing the current password", async () => {
    const user = sampleUser();
    mocks.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const res = mockResponse();

    await changePassword(
      mockRequest({
        currentPassword: "samepassword",
        newPassword: "samepassword",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.save).not.toHaveBeenCalled();
  });
});

describe("forgotPassword", () => {
  it("returns 503 in production", async () => {
    mocks.env.NODE_ENV = "production";

    const res = mockResponse();

    await forgotPassword(
      mockRequest({ email: "test@example.com" }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("returns a generic response for an unknown email", async () => {
    mocks.findOne.mockResolvedValue(null);

    const res = mockResponse();

    await forgotPassword(
      mockRequest({ email: "unknown@example.com" }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message:
        "If the account exists, a development reset token has been generated.",
    });
  });

  it("creates a development reset token for an existing user", async () => {
    const user = sampleUser();
    mocks.findOne.mockResolvedValue(user);

    const res = mockResponse();

    await forgotPassword(
      mockRequest({ email: "test@example.com" }),
      res as unknown as Response,
    );

    expect(user.resetTokenHash).toBe("hashed-reset-token");
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.randomToken).toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  it("resets the password and invalidates existing sessions", async () => {
    const user = sampleUser();
    const query = { select: vi.fn().mockResolvedValue(user) };
    mocks.findOne.mockReturnValue(query);

    const res = mockResponse();

    await resetPassword(
      mockRequest({
        token: "valid-reset-token-123456",
        password: "newpassword123",
      }),
      res as unknown as Response,
    );

    expect(query.select).toHaveBeenCalledWith("+resetTokenHash");
    expect(user.tokenVersion).toBe(1);
    expect(user.set).toHaveBeenCalledWith("resetTokenHash", undefined);
    expect(user.set).toHaveBeenCalledWith("resetTokenExpires", undefined);
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects an invalid or expired reset token", async () => {
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const res = mockResponse();

    await resetPassword(
      mockRequest({
        token: "invalid-reset-token-123456",
        password: "newpassword123",
      }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
