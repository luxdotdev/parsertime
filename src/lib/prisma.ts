import { PrismaClient } from "@prisma/client";

/** Pool sizing belongs in the connection string, but the env URL already
 * carries TLS params and a dashboard edit appended with a second `?` makes
 * the pool params part of the sslrootcert value — Prisma silently falls
 * back to its tiny default (5) and the dashboards starve under load.
 * Enforce sane defaults here; explicit values in the URL still win. */
export function databaseUrlWithPoolDefaults(
  raw: string | undefined
): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "15");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function prismaClientSingleton() {
  const datasourceUrl = databaseUrlWithPoolDefaults(process.env.DATABASE_URL);
  return new PrismaClient(
    datasourceUrl === undefined ? undefined : { datasourceUrl }
  );
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
