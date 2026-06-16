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
