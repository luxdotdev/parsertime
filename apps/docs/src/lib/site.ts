/**
 * Single source of truth for the public site URL. Override locally via
 * NEXT_PUBLIC_SITE_URL if you're testing OG / structured-data against a
 * preview deployment.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.parsertime.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Parsertime Docs';

// Meta description, kept under ~160 chars so Google won't truncate the SERP
// snippet. Packs the load-bearing terms: Parsertime, v3, Overwatch 2 scrim
// analytics, Workshop log, CSR, TSR, Matchmaker, AI Analyst.
export const SITE_DESCRIPTION =
  'The reference for Parsertime v3. Overwatch 2 scrim analytics: Workshop log uploads, CSR + TSR ratings, the Matchmaker, and the AI Analyst.';

// Used for OG image body copy where layout has a bit more room.
export const SITE_SHORT_DESCRIPTION =
  'Reference for Parsertime v3. Workshop log uploads to dashboards, CSR + TSR ratings, Matchmaker, AI Analyst.';
