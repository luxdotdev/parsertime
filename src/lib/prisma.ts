import { PrismaClient } from "@/generated/prisma/client";
import { sanitizeDatabaseUrl } from "@/lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/** Pool sizing used to ride along in the connection string
 * (connection_limit / pool_timeout), which dashboard edits to the env URL
 * kept mangling — and which the pg driver ignores anyway. The pool is
 * configured here instead; the URL only carries connection and TLS info.
 * Idle timeout mirrors Prisma v6 (300s) — pg's default of 10s would churn
 * connections. The Pool is constructed by us (not by PrismaPg) so that
 * db-metrics can observe it. */
function makeDb() {
  const pool = new Pool({
    connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
    max: 15,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 300_000,
  });
  const client = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { pool, client };
}

declare global {
  var prismaDb: undefined | ReturnType<typeof makeDb>;
}

const db = globalThis.prismaDb ?? makeDb();

const prisma = db.client;

export function getDbPool(): Pool {
  return db.pool;
}

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaDb = db;
