import "dotenv/config";
import { defineConfig } from "prisma/config";

/** CLI-only config (generate, migrate, db push). The app's runtime
 * connection lives in src/lib/prisma.ts via the pg driver adapter.
 * Migrations need the direct (non-pooled) connection, hence DIRECT_URL
 * first. The placeholder keeps `prisma generate` working in environments
 * with no DB env at all (CI lint/typecheck/vitest installs). */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://localhost:5432/parsertime",
  },
});
