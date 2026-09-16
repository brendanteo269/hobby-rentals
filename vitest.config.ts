import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests for the pure logic under src/lib — validation rules and the
 * notice allowlists. Deliberately no DOM environment: components are covered
 * by using the app, whereas these are the decisions that are cheap to get
 * wrong and invisible when they are.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
