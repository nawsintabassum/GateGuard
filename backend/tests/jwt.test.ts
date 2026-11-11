import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("JWT utilities", () => {
  let jwtUtils: typeof import("../src/utils/jwt");

  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/gateguard-test");
    vi.stubEnv("JWT_SECRET", "test-secret-key-that-is-at-least-32-characters");
    vi.stubEnv("JWT_EXPIRES_IN", "7d");

    vi.resetModules();
    jwtUtils = await import("../src/utils/jwt");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should sign and verify an access token", () => {
    const payload = {
      id: "user-123",
      email: "test@example.com",
    };

    const token = jwtUtils.signAccessToken(payload);
    const decoded = jwtUtils.verifyToken(token);

    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
  });

  it("should preserve tokenVersion in the payload", () => {
    const payload = {
      id: "user-123",
      email: "test@example.com",
      tokenVersion: 2,
    };

    const token = jwtUtils.signAccessToken(payload);
    const decoded = jwtUtils.verifyToken(token);

    expect(decoded.tokenVersion).toBe(2);
  });

  it("should reject an invalid token", () => {
    expect(() => jwtUtils.verifyToken("invalid-token")).toThrow();
  });

  it("should reject a tampered token", () => {
    const token = jwtUtils.signAccessToken({
      id: "user-123",
      email: "test@example.com",
    });

    const tamperedToken = token.slice(0, -5) + "xxxxx";

    expect(() => jwtUtils.verifyToken(tamperedToken)).toThrow();
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("JWT utilities", () => {
  let jwtUtils: typeof import("../src/utils/jwt");

  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/gateguard-test");
    vi.stubEnv("JWT_SECRET", "test-secret-key-that-is-at-least-32-characters");
    vi.stubEnv("JWT_EXPIRES_IN", "7d");

    vi.resetModules();
    jwtUtils = await import("../src/utils/jwt");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should sign and verify an access token", () => {
    const payload = {
      id: "user-123",
      email: "test@example.com",
    };

    const token = jwtUtils.signAccessToken(payload);
    const decoded = jwtUtils.verifyToken(token);

    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
  });

  it("should preserve tokenVersion in the payload", () => {
    const payload = {
      id: "user-123",
      email: "test@example.com",
      tokenVersion: 2,
    };

    const token = jwtUtils.signAccessToken(payload);
    const decoded = jwtUtils.verifyToken(token);

    expect(decoded.tokenVersion).toBe(2);
  });

  it("should reject an invalid token", () => {
    expect(() => jwtUtils.verifyToken("invalid-token")).toThrow();
  });

  it("should reject a tampered token", () => {
    const token = jwtUtils.signAccessToken({
      id: "user-123",
      email: "test@example.com",
    });

    const tamperedToken = token.slice(0, -5) + "xxxxx";

    expect(() => jwtUtils.verifyToken(tamperedToken)).toThrow();
  });
});
