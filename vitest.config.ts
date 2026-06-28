import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Minimal unit-test config. Tests cover PURE logic only (billing math, request
// validation, agent helpers) so the suite runs in CI with no database or network.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Don't pull the LangGraph/Next/Prisma-heavy modules into the default run.
    globals: false,
  },
});
