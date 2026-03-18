"use client";

import type { FeatureFlags } from "@/lib/flags-helpers";
import { createContext, use, useMemo } from "react";

const defaultFlags: FeatureFlags = {
  scoutingEnabled: false,
  mapComparisonEnabled: false,
  overviewCardEnabled: false,
  dataLabelingEnabled: false,
  simulationToolEnabled: false,
  ultimateImpactToolEnabled: false,
  newLandingPageEnabled: false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags);

export function FeatureFlagsProvider({
  children,
  flags,
}: {
  children: React.ReactNode;
  flags: FeatureFlags | null;
}) {
  const value = useMemo(() => ({ ...(flags ?? defaultFlags) }), [flags]);

  return <FeatureFlagsContext value={value}>{children}</FeatureFlagsContext>;
}

export function useFeatureFlags() {
  return use(FeatureFlagsContext);
}
