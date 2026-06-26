import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./test/__mocks__/server-only.ts"),
      "next-axiom": path.resolve(__dirname, "./test/__mocks__/next-axiom.ts"),
    },
  },
  test: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    setupFiles: ["./test/setup.ts"],
  },
});
