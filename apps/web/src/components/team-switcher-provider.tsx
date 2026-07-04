"use client";

import { parseAsInteger, useQueryState } from "nuqs";
import React, {
  createContext,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const TeamSwitcherContext = createContext({
  teamId: undefined as number | undefined,
  // oxlint-disable-next-line @typescript-eslint/no-unused-vars
  setTeamId: (teamId: number | undefined) => {
    // empty function
  },
});

/**
 * Holds the selected team in state and mirrors it to the `?team=` search
 * param via a Suspense-wrapped sync child. Reading the param directly here
 * (nuqs `useQueryState` → `useSearchParams`) would block PPR prerendering of
 * every layout child, since URL data only exists at request time. First paint
 * sees `teamId: undefined`; the param syncs in immediately after.
 */
export function TeamSwitcherProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [teamId, setTeamIdState] = useState<number | undefined>(undefined);
  const writeParam = useRef<((id: number | null) => void) | null>(null);

  const setTeamId = useCallback((id: number | undefined) => {
    // Optimistic: consumers update immediately, the URL follows.
    setTeamIdState(id);
    writeParam.current?.(id ?? null);
  }, []);

  const value = useMemo(() => ({ teamId, setTeamId }), [teamId, setTeamId]);

  return (
    <TeamSwitcherContext value={value}>
      <Suspense fallback={null}>
        <TeamQueryParamSync onChange={setTeamIdState} writeParam={writeParam} />
      </Suspense>
      {children}
    </TeamSwitcherContext>
  );
}

function TeamQueryParamSync({
  onChange,
  writeParam,
}: {
  onChange: (id: number | undefined) => void;
  writeParam: React.RefObject<((id: number | null) => void) | null>;
}) {
  const [param, setParam] = useQueryState("team", parseAsInteger);

  useEffect(() => {
    writeParam.current = (id) => void setParam(id);
  }, [setParam, writeParam]);

  useEffect(() => {
    onChange(param ?? undefined);
  }, [param, onChange]);

  return null;
}
