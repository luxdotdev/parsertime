"use client";

import { parseAsInteger, useQueryState } from "nuqs";
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
  const [teamId, setTeamIdRaw] = useQueryState("team", parseAsInteger);

  const setTeamId = React.useCallback(
    (id: number | undefined) => {
      void setTeamIdRaw(id ?? null);
    },
    [setTeamIdRaw]
  );

  const value = React.useMemo(
    () => ({ teamId: teamId ?? undefined, setTeamId }),
    [teamId, setTeamId]
  );

  return <TeamSwitcherContext value={value}>{children}</TeamSwitcherContext>;
}
