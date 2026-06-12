import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** Pool sizing used to ride along in the connection string
 * (connection_limit / pool_timeout) because dashboard edits to the env URL
 * kept mangling it. The pg driver ignores those params, so translate them
 * into Pool options; explicit values in the URL still win over our
 * defaults. Idle timeout mirrors Prisma v6 (300s) — pg's default of 10s
 * would churn connections. */
export function poolOptionsFromUrl(raw: string | undefined): {
  connectionString: string | undefined;
  max: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
} {
  const defaults = {
    connectionString: raw,
    max: 15,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 300_000,
  };
  if (!raw) return defaults;
  try {
    const url = new URL(raw);
    const connectionLimit = url.searchParams.get("connection_limit");
    const poolTimeout = url.searchParams.get("pool_timeout");
    url.searchParams.delete("connection_limit");
    url.searchParams.delete("pool_timeout");
    return {
      connectionString: url.toString(),
      max: connectionLimit ? Number(connectionLimit) : defaults.max,
      connectionTimeoutMillis: poolTimeout
        ? Number(poolTimeout) * 1000
        : defaults.connectionTimeoutMillis,
      idleTimeoutMillis: defaults.idleTimeoutMillis,
    };
  } catch {
    return defaults;
  }
}

function prismaClientSingleton() {
  const adapter = new PrismaPg(poolOptionsFromUrl(process.env.DATABASE_URL));
  return new PrismaClient({ adapter });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
