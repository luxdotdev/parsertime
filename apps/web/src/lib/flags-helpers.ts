import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  faceitScouting,
  mapComparison,
  newLandingPage,
  overviewCard,
  positionalData,
  queryBuilder,
  scoutingTool,
  simulationTool,
  tempoChart,
  tournament,
  ultimateImpactTool,
} from "@/lib/flags";
import { logger } from "@/lib/axiom/server";
import { FLAGS_CODE_HEADER, pageFlags } from "@/lib/flags-precompute";
import { getPrecomputed } from "flags/next";
import { headers } from "next/headers";

type PageFlag = (typeof pageFlags)[number];

async function getFlagsCode(): Promise<string | null> {
  return (await headers()).get(FLAGS_CODE_HEADER);
}

/**
 * Read one flag's value from the code precomputed in `proxy.ts`. This is the
 * only supported way to read a flag in render code (pages, layouts, server
 * components): decoding is pure computation, so PPR's cache-warming and final
 * prerender passes always agree. A missing code (proxy matcher gap, build
 * time) deterministically yields `false` — the same request never sees two
 * different values. Route handlers and server actions call flags live instead.
 */
export async function getFlag(f: PageFlag): Promise<boolean> {
  const code = await getFlagsCode();
  if (!code) {
    logger.warn(
      `flags: request has no precomputed flags code; "${f.key}" falls back to false`
    );
    return false;
  }
  return getPrecomputed(f, pageFlags, code);
}

/** Precomputed equivalent of `resolveAllFlags` for render code. */
export async function getAllFlags(): Promise<FeatureFlags> {
  const [
    mapComparisonEnabled,
    overviewCardEnabled,
    scoutingEnabled,
    faceitScoutingEnabled,
    dataLabelingEnabled,
    simulationToolEnabled,
    ultimateImpactToolEnabled,
    tempoChartEnabled,
    positionalDataEnabled,
    newLandingPageEnabled,
    aiChatEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
    queryBuilderEnabled,
  ] = await Promise.all(pageFlags.map((f) => getFlag(f)));

  return {
    scoutingEnabled,
    faceitScoutingEnabled,
    mapComparisonEnabled,
    overviewCardEnabled,
    dataLabelingEnabled,
    simulationToolEnabled,
    ultimateImpactToolEnabled,
    tempoChartEnabled,
    newLandingPageEnabled,
    aiChatEnabled,
    positionalDataEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
    queryBuilderEnabled,
  };
}

export type FeatureFlags = {
  scoutingEnabled: boolean;
  faceitScoutingEnabled: boolean;
  mapComparisonEnabled: boolean;
  overviewCardEnabled: boolean;
  dataLabelingEnabled: boolean;
  simulationToolEnabled: boolean;
  ultimateImpactToolEnabled: boolean;
  tempoChartEnabled: boolean;
  newLandingPageEnabled: boolean;
  aiChatEnabled: boolean;
  positionalDataEnabled: boolean;
  tournamentEnabled: boolean;
  coachingCanvasEnabled: boolean;
  queryBuilderEnabled: boolean;
};

/**
 * Live evaluation of every flag. ONLY for route handlers and server actions,
 * which are never prerendered. Render code must use `getAllFlags`/`getFlag`
 * instead — a live evaluation that transiently fails falls back to
 * `defaultValue` in one prerender pass but not the other, desyncing the
 * passes' `use cache` calls (HANGING_PROMISE_REJECTION).
 */
export async function resolveAllFlags(): Promise<FeatureFlags> {
  const [
    scoutingEnabled,
    faceitScoutingEnabled,
    mapComparisonEnabled,
    overviewCardEnabled,
    dataLabelingEnabled,
    simulationToolEnabled,
    ultimateImpactToolEnabled,
    tempoChartEnabled,
    newLandingPageEnabled,
    aiChatEnabled,
    positionalDataEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
    queryBuilderEnabled,
  ] = await Promise.all([
    scoutingTool(),
    faceitScouting(),
    mapComparison(),
    overviewCard(),
    dataLabeling(),
    simulationTool(),
    ultimateImpactTool(),
    tempoChart(),
    newLandingPage(),
    aiChat(),
    positionalData(),
    tournament(),
    coachingCanvas(),
    queryBuilder(),
  ]);

  return {
    scoutingEnabled,
    faceitScoutingEnabled,
    mapComparisonEnabled,
    overviewCardEnabled,
    dataLabelingEnabled,
    simulationToolEnabled,
    ultimateImpactToolEnabled,
    tempoChartEnabled,
    newLandingPageEnabled,
    aiChatEnabled,
    positionalDataEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
    queryBuilderEnabled,
  };
}

export function toFlagValues(flags: FeatureFlags): Record<string, boolean> {
  return {
    "scouting-tool": flags.scoutingEnabled,
    "faceit-scouting": flags.faceitScoutingEnabled,
    "map-comparison": flags.mapComparisonEnabled,
    "overview-card": flags.overviewCardEnabled,
    "data-labeling": flags.dataLabelingEnabled,
    "simulation-tool": flags.simulationToolEnabled,
    "ultimate-impact-tool": flags.ultimateImpactToolEnabled,
    "tempo-chart": flags.tempoChartEnabled,
    "new-landing-page": flags.newLandingPageEnabled,
    "ai-chat": flags.aiChatEnabled,
    "positional-data": flags.positionalDataEnabled,
    tournament: flags.tournamentEnabled,
    "coaching-canvas": flags.coachingCanvasEnabled,
    "query-builder": flags.queryBuilderEnabled,
  };
}
