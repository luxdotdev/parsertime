const path = require("path");
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
