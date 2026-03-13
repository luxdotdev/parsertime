import {
  dataLabeling,
  mapComparison,
  newLandingPage,
  overviewCard,
  scoutingTool,
  simulationTool,
} from "@/lib/flags";

export type FeatureFlags = {
  scoutingEnabled: boolean;
  mapComparisonEnabled: boolean;
  overviewCardEnabled: boolean;
  dataLabelingEnabled: boolean;
  simulationToolEnabled: boolean;
  newLandingPageEnabled: boolean;
};

export async function resolveAllFlags(): Promise<FeatureFlags> {
  const [
    scoutingEnabled,
    mapComparisonEnabled,
    overviewCardEnabled,
    dataLabelingEnabled,
    simulationToolEnabled,
    newLandingPageEnabled,
  ] = await Promise.all([
    scoutingTool(),
    mapComparison(),
    overviewCard(),
    dataLabeling(),
    simulationTool(),
    newLandingPage(),
  ]);

  return {
    scoutingEnabled,
    mapComparisonEnabled,
    overviewCardEnabled,
    dataLabelingEnabled,
    simulationToolEnabled,
    newLandingPageEnabled,
  };
}

export function toFlagValues(flags: FeatureFlags): Record<string, boolean> {
  return {
    "scouting-tool": flags.scoutingEnabled,
    "map-comparison": flags.mapComparisonEnabled,
    "overview-card": flags.overviewCardEnabled,
    "data-labeling": flags.dataLabelingEnabled,
    "simulation-tool": flags.simulationToolEnabled,
    "new-landing-page": flags.newLandingPageEnabled,
  };
}
