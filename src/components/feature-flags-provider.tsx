"use client";

import { createContext, use, useMemo } from "react";

type FeatureFlags = {
  scoutingEnabled: boolean;
};

const FeatureFlagsContext = createContext<FeatureFlags>({
  scoutingEnabled: false,
});

export function FeatureFlagsProvider({
  children,
  scoutingEnabled,
}: {
  children: React.ReactNode;
  scoutingEnabled: boolean;
}) {
  const value = useMemo(() => ({ scoutingEnabled }), [scoutingEnabled]);

  return <FeatureFlagsContext value={value}>{children}</FeatureFlagsContext>;
}

export function useFeatureFlags() {
  return use(FeatureFlagsContext);
}
