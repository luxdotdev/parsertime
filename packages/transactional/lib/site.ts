/**
 * Canonical origin and support address for links baked into emails. Reads the
 * same env vars as apps/web's src/lib/site.ts so a future domain flip is an
 * env change in one place; the fallbacks keep `email dev` previews working.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://parsertime.app"
).replace(/\/$/, "");

export const DOCS_URL = (
  process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.parsertime.app"
).replace(/\/$/, "");

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "help@parsertime.app";
