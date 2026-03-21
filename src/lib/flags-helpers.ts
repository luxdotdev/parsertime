import {
  aiChat,
  dataLabeling,
  mapComparison,
  newLandingPage,
  overviewCard,
  scoutingTool,
  simulationTool,
  tempoChart,
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
  };
}
