import { defineConfig } from "deepsec/config";

export default defineConfig({
  projects: [
    { id: "parsertime", root: ".." },
    // <deepsec:projects-insert-above>
  ],
});
