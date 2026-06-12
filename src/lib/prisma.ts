import { PrismaClient } from "@/generated/prisma/client";
import { sanitizeDatabaseUrl } from "@/lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";

/** Pool sizing used to ride along in the connection string
 * (connection_limit / pool_timeout), which dashboard edits to the env URL
 * kept mangling — and which the pg driver ignores anyway. The pool is
 * configured here instead; the URL only carries connection and TLS info.
 * Idle timeout mirrors Prisma v6 (300s) — pg's default of 10s would churn
 * connections. */
function prismaClientSingleton() {
  const adapter = new PrismaPg({
    connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
    max: 15,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 300_000,
  });
  return new PrismaClient({ adapter });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
