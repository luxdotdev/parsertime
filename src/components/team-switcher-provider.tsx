"use client";

import React from "react";
import { createContext } from "react";

export const TeamSwitcherContext = createContext({
  teamId: undefined as number | undefined,
  setTeamId: (teamId: number | undefined) => {},
});

export function TeamSwitcherProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [teamId, setTeamId] = React.useState<number | undefined>(undefined);

  const value = React.useMemo(
    () => ({ teamId, setTeamId }),
    [teamId, setTeamId]
  );

  return (
    <TeamSwitcherContext.Provider value={value}>
      {children}
    </TeamSwitcherContext.Provider>
  );
}
