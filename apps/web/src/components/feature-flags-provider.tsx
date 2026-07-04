"use client";

import type { FeatureFlags } from "@/lib/flags-helpers";
import { createContext, use, useEffect, useState } from "react";

const defaultFlags: FeatureFlags = {
  scoutingEnabled: false,
  faceitScoutingEnabled: false,
  mapComparisonEnabled: false,
  overviewCardEnabled: false,
  dataLabelingEnabled: false,
  simulationToolEnabled: false,
  ultimateImpactToolEnabled: false,
  newLandingPageEnabled: false,
  tempoChartEnabled: false,
  aiChatEnabled: false,
  positionalDataEnabled: false,
  tournamentEnabled: false,
  coachingCanvasEnabled: false,
  queryBuilderEnabled: false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags);
const FeatureFlagsSetterContext = createContext<(flags: FeatureFlags) => void>(
  () => undefined
);

/**
 * Stateful so the provider can sit in the static shell: children render
 * immediately with all-false defaults and `FeatureFlagsHydrator` (streamed
 * from the root layout's request-time island) fills in the real values.
 * Flag-gated client UI may appear a beat after first paint; anything that
 * must not pop in should be gated server-side instead.
 */
export function FeatureFlagsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  return (
    <FeatureFlagsSetterContext value={setFlags}>
      <FeatureFlagsContext value={flags}>{children}</FeatureFlagsContext>
    </FeatureFlagsSetterContext>
  );
}

/** Rendered by the request-time island; pushes real flag values into state. */
export function FeatureFlagsHydrator({ flags }: { flags: FeatureFlags }) {
  const setFlags = use(FeatureFlagsSetterContext);

  useEffect(() => {
    setFlags(flags);
  }, [flags, setFlags]);

  return null;
}

export function useFeatureFlags() {
  return use(FeatureFlagsContext);
}
