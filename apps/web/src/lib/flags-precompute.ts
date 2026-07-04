import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  faceitScouting,
  mapComparison,
  overviewCard,
  positionalData,
  queryBuilder,
  scoutingTool,
  simulationTool,
  tempoChart,
  tournament,
  ultimateImpactTool,
} from "@/lib/flags";

/**
 * Request header carrying the precomputed flags code from `proxy.ts` to
 * render code. Read via `getFlag`/`getAllFlags` in `flags-helpers.ts`.
 *
 * These live outside `flags.ts` on purpose: the Flags Explorer discovery
 * endpoint (`.well-known/vercel/flags`) treats every export of that module
 * as a flag definition.
 */
export const FLAGS_CODE_HEADER = "x-flags-code";

/**
 * Every flag, in a FIXED order (the order is part of the precompute
 * encoding). `proxy.ts` evaluates this group once per page request; render
 * code decodes the result instead of evaluating live. Live evaluation can
 * fall back to `defaultValue` on a transient error in only one of PPR's two
 * prerender passes, which desyncs the passes' `use cache` calls and causes
 * HANGING_PROMISE_REJECTION. Add new flags to the END of this array.
 */
export const pageFlags = [
  mapComparison,
  overviewCard,
  scoutingTool,
  faceitScouting,
  dataLabeling,
  simulationTool,
  ultimateImpactTool,
  tempoChart,
  positionalData,
  aiChat,
  tournament,
  coachingCanvas,
  queryBuilder,
] as const;
