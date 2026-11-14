import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for pure logic only (no DOM, no Supabase).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
