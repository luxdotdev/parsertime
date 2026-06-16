"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from "react";

type RangeTransitionContextValue = {
  isPending: boolean;
  startRangeTransition: (callback: () => void) => void;
};

const RangeTransitionContext = createContext<RangeTransitionContextValue>({
  isPending: false,
  startRangeTransition: (callback) => callback(),
});

/**
 * Shares the pending state of a timeframe change across the team-stats shell.
 * The range picker wraps its router.replace in startRangeTransition, which keeps
 * isPending true for the whole (soft) navigation, and the content wrapper reads
 * it to dim the stale data while the new server render streams in. Without this,
 * a search-param-only change never re-triggers loading.tsx, so there is no sign
 * the input registered.
 */
export function RangeTransitionProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const startRangeTransition = useCallback(
    (callback: () => void) => startTransition(callback),
    []
  );
  const value = useMemo(
    () => ({ isPending, startRangeTransition }),
    [isPending, startRangeTransition]
  );
  return (
    <RangeTransitionContext.Provider value={value}>
      {children}
    </RangeTransitionContext.Provider>
  );
}

export function useRangeTransition() {
  return useContext(RangeTransitionContext);
}
