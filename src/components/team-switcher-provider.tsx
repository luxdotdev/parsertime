"use client";

import React, { createContext } from "react";

export const TeamSwitcherContext = createContext({
  teamId: undefined as number | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setTeamId: (teamId: number | undefined) => {
    // empty function
  },
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
