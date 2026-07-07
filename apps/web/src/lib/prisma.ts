import { PrismaClient } from "@/generated/prisma/client";
import { sanitizeDatabaseUrl } from "@/lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/** Pool sizing used to ride along in the connection string
 * (connection_limit / pool_timeout), which dashboard edits to the env URL
 * kept mangling — and which the pg driver ignores anyway. The pool is
 * configured here instead; the URL only carries connection and TLS info.
 * The Pool is constructed by us (not by PrismaPg) so that db-metrics can
 * observe it.
 *
 * Sizing is bounded by PgBouncer's max_client_conn (600 on our bouncer),
 * which counts CLIENT sockets — including ones abandoned by suspended or
 * killed lambda instances, which the bouncer never reaps on its own
 * (client_idle_timeout defaults to 0 = disabled). Instance churn opens
 * ~30-50 connections/hour, so abandoned sockets accumulate toward the
 * ceiling over hours; on 2026-07-07 the limit was hit and Better Auth
 * session reads failed with FATAL 08P01 (max_client_conn), aborting
 * in-flight prerenders and surfacing as HANGING_PROMISE_REJECTION on the
 * map route. A small max caps the leak quantum per dead instance, and 60s
 * idle closes a thawed instance's surplus quickly without per-request
 * churn (pg's 10s default would). PlanetScale doesn't expose
 * client_idle_timeout (the setting that would reap abandoned client
 * sockets), so the bouncer only drops them via TCP keepalive — headroom on
 * max_client_conn is the backstop. Queries behind the bouncer run in
 * transaction mode and are ms-fast, so the small pool costs at most an
 * extra wave of queueing on wide fan-outs. */
function makeDb() {
  const pool = new Pool({
    connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
    max: 6,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 60_000,
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
