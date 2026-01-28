/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    /* === Environment === */
    environment: "jsdom",

    /* === Setup files === */
    setupFiles: ["./vitest.setup.ts"],

    /* === Include/Exclude patterns === */
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".astro", "tests/e2e/**"],

    /* === Coverage configuration === */
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/db/database.types.ts",
        "src/env.d.ts",
        "src/components/ui/**",
      ],
    },

    /* === Globals and utilities === */
    globals: true,

    /* === TypeScript and path resolution === */
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },

    /* === Performance === */
    pool: "forks",
    testTimeout: 10000,
  },
});
