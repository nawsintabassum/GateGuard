import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Crypto utilities", () => {
  let cryptoUtils: typeof import("../src/utils/crypto");

  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/gateguard-test");
    vi.stubEnv("JWT_SECRET", "test-secret-key-that-is-at-least-32-characters");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "0123456789abcdef".repeat(4));

    vi.resetModules();
    cryptoUtils = await import("../src/utils/crypto");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should encrypt and decrypt text correctly", () => {
    const original = "GateGuard secure token";

    const encrypted = cryptoUtils.encrypt(original);
    const decrypted = cryptoUtils.decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it("should generate encrypted data with three parts", () => {
    const encrypted = cryptoUtils.encrypt("test data");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^[a-f0-9]{24}$/);
    expect(parts[1]).toMatch(/^[a-f0-9]{32}$/);
    expect(parts[2]).toMatch(/^[a-f0-9]+$/);
  });

  it("should throw error when encryption key is missing", async () => {
    vi.doMock("../src/config/env", () => ({
      env: { TOKEN_ENCRYPTION_KEY: undefined },
    }));

    vi.resetModules();
    const cryptoWithoutKey = await import("../src/utils/crypto");

    expect(() => cryptoWithoutKey.encrypt("test")).toThrow(
      "TOKEN_ENCRYPTION_KEY must be 64 hex characters"
    );

    vi.doUnmock("../src/config/env");
  });

  it("should generate correct SHA-256 hash", () => {
    expect(cryptoUtils.sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("should generate unique 64-character random tokens", () => {
    const token1 = cryptoUtils.randomToken();
    const token2 = cryptoUtils.randomToken();

    expect(token1).toMatch(/^[a-f0-9]{64}$/);
    expect(token2).toMatch(/^[a-f0-9]{64}$/);
    expect(token1).not.toBe(token2);
  });
});
