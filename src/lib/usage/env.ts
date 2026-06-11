import type { UsageEnv } from "@prisma/client";

/**
 * Authoritative environment stamp, read server-side from VERCEL_ENV.
 * Never trust a client-supplied environment.
 */
export function resolveUsageEnv(): UsageEnv {
  switch (process.env.VERCEL_ENV) {
    case "production":
      return "PRODUCTION";
    case "preview":
      return "PREVIEW";
    default:
      return "DEVELOPMENT";
  }
}
