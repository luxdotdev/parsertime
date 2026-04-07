import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  mapComparison,
  newLandingPage,
  overviewCard,
  positionalData,
  scoutingTool,
  simulationTool,
  tempoChart,
  tournament,
  ultimateImpactTool,
} from "@/lib/flags";

export type FeatureFlags = {
  scoutingEnabled: boolean;
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
};

export async function resolveAllFlags(): Promise<FeatureFlags> {
  const [
    scoutingEnabled,
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
  ] = await Promise.all([
    scoutingTool(),
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
  ]);

  return {
    scoutingEnabled,
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
  };
}

export function toFlagValues(flags: FeatureFlags): Record<string, boolean> {
  return {
    "scouting-tool": flags.scoutingEnabled,
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
  };
}
