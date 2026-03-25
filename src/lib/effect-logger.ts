import { Logger } from "effect";

/**
 * Environment-aware logger layer for Effect services.
 *
 * In development: Uses Logger.pretty for color-coded, indented console logs
 * In production: Uses Logger.structured for machine-parseable JSON logs
 *
 * This layer should be provided to all Effect services alongside EffectTracingLive
 * to ensure consistent, environment-appropriate logging.
 */
export const EffectLoggerLive =
  process.env.NODE_ENV === "production" ? Logger.structured : Logger.pretty;
