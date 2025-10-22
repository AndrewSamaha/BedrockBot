import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: { reporter: ["text", "html"], reportsDirectory: "coverage" }
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  }
});
