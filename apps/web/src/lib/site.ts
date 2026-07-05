/**
 * Canonical origins and contact points for the deployed site. Every
 * parsertime.app reference in the app routes through here, so a future
 * domain flip is an env change (plus these fallbacks) instead of a
 * codebase-wide sweep. NEXT_PUBLIC_ vars are inlined at build time, so
 * these constants are safe to import from both server and client code.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://parsertime.app"
).replace(/\/$/, "");

/** Bare hostname for display copy (browser-chrome mocks, bot messages). */
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

// Typed as a template literal so typed-routes `Link href` accepts it.
export const DOCS_URL = (
  process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.parsertime.app"
).replace(/\/$/, "") as `https://${string}`;

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "help@parsertime.app";

/** Hostname that identifies the beta deployment (beta banner check). */
export const BETA_HOST =
  process.env.NEXT_PUBLIC_BETA_HOST ?? "beta.parsertime.app";
