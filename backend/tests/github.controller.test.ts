import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createHmac } from "crypto";

const mocks = vi.hoisted(() => ({
  findByIdAndUpdate: vi.fn(),
  findOneAndUpdate: vi.fn(),
  axiosGet: vi.fn(),
  exchangeCode: vi.fn(),
  listRepositories: vi.fn(),
  githubOAuthCallback: vi.fn(),
  encrypt: vi.fn(),
  randomToken: vi.fn(),
  sha256: vi.fn(),
  env: {
    GITHUB_CLIENT_ID: "github-client-id",
    GITHUB_CALLBACK_URL: "http://localhost:5000/api/github/callback",
    GITHUB_WEBHOOK_SECRET: "webhook-secret",
    CLIENT_URL: "http://localhost:5173",
  },
}));

vi.mock("axios", () => ({
  default: { get: mocks.axiosGet },
}));

vi.mock("../src/models/User", () => ({
  User: {
    findByIdAndUpdate: mocks.findByIdAndUpdate,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

vi.mock("../src/services/github.service", () => ({
  exchangeCode: mocks.exchangeCode,
  listRepositories: mocks.listRepositories,
}));

vi.mock("../src/controllers/oauth.controller", () => ({
  githubOAuthCallback: mocks.githubOAuthCallback,
}));

vi.mock("../src/utils/crypto", () => ({
  encrypt: mocks.encrypt,
  randomToken: mocks.randomToken,
  sha256: mocks.sha256,
}));

vi.mock("../src/config/env", () => ({
  env: mocks.env,
}));

import {
  connectStart,
  callback,
  repositories,
  disconnect,
  githubWebhook,
} from "../src/controllers/github.controller";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    redirect: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.redirect.mockReturnValue(res);

  return res;
}

function mockRequest(options: any = {}) {
  return {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    cookies: options.cookies || {},
    user: { id: options.userId || "user-123" },
    get: vi.fn((header: string) => options.headers?.[header.toLowerCase()]),
  } as unknown as Request;
}

function webhookRequest(
  event = "ping",
  payload: any = {},
  secret = "webhook-secret",
) {
  const body = Buffer.from(JSON.stringify(payload));
  const signature =
    "sha256=" +
    createHmac("sha256", secret).update(body).digest("hex");

  return mockRequest({
    body,
    headers: {
      "x-hub-signature-256": signature,
      "x-github-event": event,
      "x-github-delivery": "delivery-123",
    },
  });
}

beforeEach(() => {
  vi.resetAllMocks();

  mocks.env.GITHUB_CLIENT_ID = "github-client-id";
  mocks.env.GITHUB_CALLBACK_URL =
    "http://localhost:5000/api/github/callback";
  mocks.env.GITHUB_WEBHOOK_SECRET = "webhook-secret";
  mocks.env.CLIENT_URL = "http://localhost:5173";

  mocks.randomToken.mockReturnValue("random-state");
  mocks.sha256.mockReturnValue("hashed-state");
  mocks.encrypt.mockReturnValue("encrypted-token");
  mocks.exchangeCode.mockResolvedValue("github-access-token");
  mocks.listRepositories.mockResolvedValue([]);
});

// ============================================
// GitHub OAuth - Connect
// ============================================

describe("connectStart", () => {
  it("should return authorization URL when OAuth is configured", async () => {
    mocks.findByIdAndUpdate.mockResolvedValue({});

    const req = mockRequest();
    const res = mockResponse();

    await connectStart(req, res);

    expect(mocks.randomToken).toHaveBeenCalled();
    expect(mocks.sha256).toHaveBeenCalledWith("random-state");
    expect(mocks.findByIdAndUpdate).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      authorizationUrl: expect.stringContaining(
        "https://github.com/login/oauth/authorize",
      ),
    });
  });

  it("should return 503 when OAuth is not configured", async () => {
    mocks.env.GITHUB_CLIENT_ID = "";

    const req = mockRequest();
    const res = mockResponse();

    await connectStart(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      message: "GitHub OAuth is not configured",
    });
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should propagate database errors", async () => {
    mocks.findByIdAndUpdate.mockRejectedValue(
      new Error("Database error"),
    );

    const req = mockRequest();
    const res = mockResponse();

    await expect(connectStart(req, res)).rejects.toThrow(
      "Database error",
    );
  });
});

// ============================================
// GitHub OAuth - Callback
// ============================================

describe("callback", () => {
  it("should connect GitHub account successfully", async () => {
    const user = { _id: "user-123" };

    mocks.findOneAndUpdate.mockResolvedValue(user);

    mocks.axiosGet.mockResolvedValue({
      data: { id: 12345, login: "test-user" },
    });

    const req = mockRequest({
      query: { code: "oauth-code", state: "valid-state" },
    });
    const res = mockResponse();

    await callback(req, res);

    expect(mocks.findOneAndUpdate).toHaveBeenCalled();
    expect(mocks.exchangeCode).toHaveBeenCalledWith("oauth-code");
    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith(
      "user-123",
      {
        githubId: "12345",
        githubUsername: "test-user",
        githubTokenEncrypted: "encrypted-token",
      },
    );
    expect(res.redirect).toHaveBeenCalledWith(
      "http://localhost:5173/app/settings?github=connected",
    );
  });

  it("should redirect with error when OAuth state is invalid", async () => {
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const req = mockRequest({
      query: { code: "oauth-code", state: "invalid-state" },
    });
    const res = mockResponse();

    await callback(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      "http://localhost:5173/app/settings?github=error",
    );
    expect(mocks.exchangeCode).not.toHaveBeenCalled();
  });

  it("should redirect with error when code or state is missing", async () => {
    const req = mockRequest({
      query: { code: "oauth-code" },
    });
    const res = mockResponse();

    await callback(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      "http://localhost:5173/app/settings?github=error",
    );
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("should delegate to OAuth callback when oauth_state cookie exists", async () => {
    const req = mockRequest({
      cookies: { oauth_state: "cookie-state" },
    });
    const res = mockResponse();

    await callback(req, res);

    expect(mocks.githubOAuthCallback).toHaveBeenCalledWith(req, res);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

// ============================================
// GitHub Repositories
// ============================================

describe("repositories", () => {
  it("should return the user's GitHub repositories", async () => {
    const repos = [
      { id: 1, name: "GateGuard", fullName: "user/GateGuard" },
    ];

    mocks.listRepositories.mockResolvedValue(repos);

    const req = mockRequest();
    const res = mockResponse();

    await repositories(req, res);

    expect(mocks.listRepositories).toHaveBeenCalledWith("user-123");
    expect(res.json).toHaveBeenCalledWith({
      repositories: repos,
    });
  });

  it("should propagate repository service errors", async () => {
    mocks.listRepositories.mockRejectedValue(
      new Error("GitHub API error"),
    );

    const req = mockRequest();
    const res = mockResponse();

    await expect(repositories(req, res)).rejects.toThrow(
      "GitHub API error",
    );
  });
});

// ============================================
// GitHub Disconnect
// ============================================

describe("disconnect", () => {
  it("should disconnect GitHub account successfully", async () => {
    mocks.findByIdAndUpdate.mockResolvedValue({});

    const req = mockRequest();
    const res = mockResponse();

    await disconnect(req, res);

    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith(
      "user-123",
      {
        $unset: {
          githubId: 1,
          githubUsername: 1,
          githubTokenEncrypted: 1,
        },
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "GitHub disconnected",
    });
  });

  it("should propagate database errors", async () => {
    mocks.findByIdAndUpdate.mockRejectedValue(
      new Error("Database error"),
    );

    const req = mockRequest();
    const res = mockResponse();

    await expect(disconnect(req, res)).rejects.toThrow(
      "Database error",
    );
  });
});

// ============================================
// GitHub Webhook
// ============================================

describe("githubWebhook", () => {
  it("should return 503 when webhook secret is not configured", async () => {
    mocks.env.GITHUB_WEBHOOK_SECRET = "";

    const req = mockRequest();
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "GitHub Webhook is not configured",
    });
  });

  it("should reject a non-Buffer request body", async () => {
    const req = mockRequest({ body: { test: true } });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("Invalid webhook"),
      }),
    );
  });

  it("should reject a missing signature", async () => {
    const req = mockRequest({
      body: Buffer.from("{}"),
      headers: {},
    });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("Invalid webhook"),
      }),
    );
  });

  it("should reject an incorrectly formatted signature", async () => {
    const req = mockRequest({
      body: Buffer.from("{}"),
      headers: {
        "x-hub-signature-256": "invalid-signature",
      },
    });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should reject an incorrect webhook signature", async () => {
    const req = mockRequest({
      body: Buffer.from("{}"),
      headers: {
        "x-hub-signature-256": "sha256=" + "0".repeat(64),
      },
    });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Webhook signature verification failed",
    });
  });

  it("should reject missing event headers", async () => {
    const body = Buffer.from("{}");
    const signature =
      "sha256=" +
      createHmac("sha256", "webhook-secret")
        .update(body)
        .digest("hex");

    const req = mockRequest({
      body,
      headers: {
        "x-hub-signature-256": signature,
      },
    });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Missing GitHub event headers",
    });
  });

  it("should reject invalid JSON payload", async () => {
    const body = Buffer.from("{invalid-json");
    const signature =
      "sha256=" +
      createHmac("sha256", "webhook-secret")
        .update(body)
        .digest("hex");

    const req = mockRequest({
      body,
      headers: {
        "x-hub-signature-256": signature,
        "x-github-event": "ping",
        "x-github-delivery": "delivery-123",
      },
    });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid JSON payload",
    });
  });

  it("should accept a valid ping event", async () => {
    const req = webhookRequest("ping", {});
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "GitHub webhook connection successful",
    });
  });

  it("should accept a valid push event", async () => {
    const req = webhookRequest("push", {
      repository: { full_name: "user/GateGuard" },
    });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "GitHub webhook event received",
      event: "push",
      deliveryId: "delivery-123",
      repository: "user/GateGuard",
    });
  });

  it("should accept a valid pull request event", async () => {
    const req = webhookRequest("pull_request", {
      repository: { full_name: "user/GateGuard" },
    });
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "GitHub webhook event received",
      event: "pull_request",
      deliveryId: "delivery-123",
      repository: "user/GateGuard",
    });
  });

  it("should ignore unsupported events", async () => {
    const req = webhookRequest("issues", {});
    const res = mockResponse();

    await githubWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Event ignored",
      event: "issues",
    });
  });
});
