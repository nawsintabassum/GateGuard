import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
  hash: vi.fn(),
  signAccessToken: vi.fn(),
  randomToken: vi.fn(),
  sha256: vi.fn(),
  axiosPost: vi.fn(),
  axiosGet: vi.fn(),
  env: {
    CLIENT_URL: "http://localhost:5173",
    PORT: 5000,
    GITHUB_CLIENT_ID: "github-client",
    GITHUB_CLIENT_SECRET: "github-secret",
    GITHUB_CALLBACK_URL: "http://localhost:5000/api/github/callback",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
    GOOGLE_CALLBACK_URL: "http://localhost:5000/api/auth/oauth/google/callback",
  },
}));

vi.mock("../src/models/User", () => ({
  User: {
    findOne: mocks.findOne,
    create: mocks.create,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
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

vi.mock("axios", () => ({
  default: {
    post: mocks.axiosPost,
    get: mocks.axiosGet,
  },
}));

import {
  githubOAuthStart,
  googleOAuthStart,
  githubOAuthCallback,
  googleOAuthCallback,
  exchangeOAuthCode,
} from "../src/controllers/oauth.controller";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    redirect: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.cookie.mockReturnValue(res);
  res.clearCookie.mockReturnValue(res);
  res.redirect.mockReturnValue(res);

  return res;
}

function mockRequest(
  query: Record<string, unknown> = {},
  cookies: Record<string, unknown> = { oauth_state: "valid-state" },
  body: Record<string, unknown> = {},
) {
  return {
    query,
    cookies,
    body,
  } as unknown as Request;
}

function sampleUser() {
  return {
    _id: { toString: () => "user-123" },
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    githubId: null as string | null,
    githubUsername: null as string | null,
    googleId: null as string | null,
    tokenVersion: 0,
    oauthLoginCodeHash: undefined as string | undefined,
    oauthLoginCodeExpires: undefined as Date | undefined,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.env.CLIENT_URL = "http://localhost:5173";
  mocks.env.GITHUB_CLIENT_ID = "github-client";
  mocks.env.GITHUB_CLIENT_SECRET = "github-secret";
  mocks.env.GOOGLE_CLIENT_ID = "google-client";
  mocks.env.GOOGLE_CLIENT_SECRET = "google-secret";

  mocks.randomToken.mockReturnValue("generated-code");
  mocks.sha256.mockReturnValue("hashed-code");
  mocks.hash.mockResolvedValue("hashed-password");
  mocks.signAccessToken.mockReturnValue("access-token");
});

describe("OAuth start endpoints", () => {
  it("starts GitHub OAuth and returns an authorization URL", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await githubOAuthStart(req, res as unknown as Response);

    expect(res.cookie).toHaveBeenCalledWith(
      "oauth_state",
      "generated-code",
      expect.objectContaining({ httpOnly: true }),
    );

    const response = res.json.mock.calls[0][0];
    const url = new URL(response.authorizationUrl);

    expect(url.hostname).toBe("github.com");
    expect(url.searchParams.get("client_id")).toBe("github-client");
    expect(url.searchParams.get("scope")).toBe("read:user user:email");
    expect(url.searchParams.get("state")).toBe("generated-code");
  });

  it("returns 503 when GitHub OAuth is not configured", async () => {
    mocks.env.GITHUB_CLIENT_ID = "";

    const res = mockResponse();

    await githubOAuthStart(mockRequest(), res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("not configured") }),
    );
  });

  it("starts Google OAuth and returns an authorization URL", async () => {
    const res = mockResponse();

    await googleOAuthStart(mockRequest(), res as unknown as Response);

    const response = res.json.mock.calls[0][0];
    const url = new URL(response.authorizationUrl);

    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("google-client");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("returns 503 when Google OAuth credentials are missing", async () => {
    mocks.env.GOOGLE_CLIENT_SECRET = "";

    const res = mockResponse();

    await googleOAuthStart(mockRequest(), res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(503);
  });
});

describe("GitHub OAuth callback", () => {
  it("redirects when OAuth state is invalid", async () => {
    const res = mockResponse();

    await githubOAuthCallback(
      mockRequest({ code: "github-code", state: "wrong-state" }),
      res as unknown as Response,
    );

    expect(res.clearCookie).toHaveBeenCalledWith(
      "oauth_state",
      expect.any(Object),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("GitHub+authorization+failed"),
    );
    expect(mocks.axiosPost).not.toHaveBeenCalled();
  });

  it("redirects when the authorization code is missing", async () => {
    const res = mockResponse();

    await githubOAuthCallback(
      mockRequest({ state: "valid-state" }),
      res as unknown as Response,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("GitHub+authorization+failed"),
    );
  });

  it("creates a new user after successful GitHub authentication", async () => {
    const user = sampleUser();

    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "github-access-token" },
    });

    mocks.axiosGet
      .mockResolvedValueOnce({
        data: { id: 123, login: "testuser", name: "Test User" },
      })
      .mockResolvedValueOnce({
        data: [
          { email: "test@example.com", verified: true, primary: true },
        ],
      });

    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue(user);

    const res = mockResponse();

    await githubOAuthCallback(
      mockRequest({ code: "github-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        githubId: "123",
        githubUsername: "testuser",
      }),
    );

    expect(user.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/auth/oauth/callback?code="),
    );
  });

  it("uses a verified non-primary email when no primary verified email exists", async () => {
    const user = sampleUser();

    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "github-access-token" },
    });

    mocks.axiosGet
      .mockResolvedValueOnce({
        data: { id: 123, login: "testuser" },
      })
      .mockResolvedValueOnce({
        data: [
          { email: "unverified@example.com", verified: false, primary: true },
          { email: "verified@example.com", verified: true, primary: false },
        ],
      });

    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue(user);

    const res = mockResponse();

    await githubOAuthCallback(
      mockRequest({ code: "github-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "verified@example.com" }),
    );
  });

  it("redirects when GitHub has no verified email", async () => {
    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "github-access-token" },
    });

    mocks.axiosGet
      .mockResolvedValueOnce({ data: { id: 123, login: "testuser" } })
      .mockResolvedValueOnce({
        data: [{ email: "test@example.com", verified: false }],
      });

    const res = mockResponse();

    await githubOAuthCallback(
      mockRequest({ code: "github-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("GitHub+sign-in+failed"),
    );
  });

  it("links GitHub to an existing user", async () => {
    const user = sampleUser();

    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "github-access-token" },
    });

    mocks.axiosGet
      .mockResolvedValueOnce({
        data: { id: 456, login: "newuser", name: "Test User" },
      })
      .mockResolvedValueOnce({
        data: [{ email: "test@example.com", verified: true }],
      });

    mocks.findOne.mockResolvedValue(user);

    const res = mockResponse();

    await githubOAuthCallback(
      mockRequest({ code: "github-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(user.githubId).toBe("456");
    expect(user.githubUsername).toBe("newuser");
    expect(user.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/auth/oauth/callback?code="),
    );
  });

  it("rejects a GitHub account already linked to another account", async () => {
    const user = sampleUser();
    user.githubId = "different-id";

    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "github-access-token" },
    });

    mocks.axiosGet
      .mockResolvedValueOnce({
        data: { id: 456, login: "newuser" },
      })
      .mockResolvedValueOnce({
        data: [{ email: "test@example.com", verified: true }],
      });

    mocks.findOne.mockResolvedValue(user);

    const res = mockResponse();

    await githubOAuthCallback(
      mockRequest({ code: "github-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("already+linked+to+another+GitHub+account"),
    );
  });

  it("handles a GitHub API error", async () => {
    mocks.axiosPost.mockRejectedValue(new Error("GitHub API unavailable"));

    const res = mockResponse();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await githubOAuthCallback(
      mockRequest({ code: "github-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("GitHub+sign-in+failed"),
    );

    errorSpy.mockRestore();
  });
});

describe("Google OAuth callback", () => {
  it("redirects when OAuth state is invalid", async () => {
    const res = mockResponse();

    await googleOAuthCallback(
      mockRequest({ code: "google-code", state: "wrong-state" }),
      res as unknown as Response,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("Google+authorization+failed"),
    );
    expect(mocks.axiosPost).not.toHaveBeenCalled();
  });

  it("creates a new user after successful Google authentication", async () => {
    const user = sampleUser();

    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "google-access-token" },
    });

    mocks.axiosGet.mockResolvedValue({
      data: {
        email: "GOOGLE@example.com",
        email_verified: true,
        name: "Google User",
        sub: "google-123",
      },
    });

    mocks.findOne.mockResolvedValue(null);
    mocks.create.mockResolvedValue(user);

    const res = mockResponse();

    await googleOAuthCallback(
      mockRequest({ code: "google-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "google@example.com",
        googleId: "google-123",
      }),
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/auth/oauth/callback?code="),
    );
  });

  it("rejects an unverified Google email", async () => {
    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "google-access-token" },
    });

    mocks.axiosGet.mockResolvedValue({
      data: {
        email: "test@example.com",
        email_verified: false,
        sub: "google-123",
      },
    });

    const res = mockResponse();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await googleOAuthCallback(
      mockRequest({ code: "google-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("Google+sign-in+failed"),
    );

    errorSpy.mockRestore();
  });

  it("rejects a Google account already linked to another account", async () => {
    const user = sampleUser();
    user.googleId = "different-google-id";

    mocks.axiosPost.mockResolvedValue({
      data: { access_token: "google-access-token" },
    });

    mocks.axiosGet.mockResolvedValue({
      data: {
        email: "test@example.com",
        email_verified: true,
        sub: "new-google-id",
      },
    });

    mocks.findOne.mockResolvedValue(user);

    const res = mockResponse();

    await googleOAuthCallback(
      mockRequest({ code: "google-code", state: "valid-state" }),
      res as unknown as Response,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("already+linked+to+another+Google+account"),
    );
  });
});

describe("exchangeOAuthCode", () => {
  it("rejects a missing OAuth code", async () => {
    const res = mockResponse();

    await exchangeOAuthCode(
      mockRequest({}, {}, {}),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "OAuth code is required",
    });
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired OAuth code", async () => {
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const res = mockResponse();

    await exchangeOAuthCode(
      mockRequest({}, {}, { code: "invalid-code" }),
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "OAuth sign-in code is invalid or expired",
    });
  });

  it("exchanges a valid code and returns the user and access token", async () => {
    const user = sampleUser();
    user.githubId = "github-123";
    user.githubUsername = "testuser";

    mocks.findOneAndUpdate.mockResolvedValue(user);

    const res = mockResponse();

    await exchangeOAuthCode(
      mockRequest({}, {}, { code: "valid-code" }),
      res as unknown as Response,
    );

    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ oauthLoginCodeHash: "hashed-code" }),
      expect.objectContaining({ $unset: expect.any(Object) }),
      { new: true },
    );

    expect(mocks.signAccessToken).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      token: "access-token",
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        githubConnected: true,
        githubUsername: "testuser",
      },
    });
  });
});
