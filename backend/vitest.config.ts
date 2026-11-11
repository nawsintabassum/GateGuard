import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "json", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/config/env.ts",
        "src/**/*.d.ts",
      ],
      reportsDirectory: "./coverage",
    },
  },
});
