import { defineConfig } from "vitest/config";
import { resolve } from "path";

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
