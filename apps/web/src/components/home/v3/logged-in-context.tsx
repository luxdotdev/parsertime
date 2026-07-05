"use client";

import { createContext, use, useEffect, useState } from "react";

const LoggedInContext = createContext(false);
const LoggedInSetterContext = createContext<(value: boolean) => void>(
  () => undefined
);

/**
 * Login state for the landing page CTAs. Defaults to logged-out so the whole
 * marketing page prerenders into the static shell (an `auth()` read would
 * force it dynamic); `LoggedInHydrator` streams the real value in and flips
 * the CTAs to "Dashboard" for signed-in visitors after first paint.
 */
export function LoggedInProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <LoggedInSetterContext value={setIsLoggedIn}>
      <LoggedInContext value={isLoggedIn}>{children}</LoggedInContext>
    </LoggedInSetterContext>
  );
}

/** Rendered by the landing page's request-time island. */
export function LoggedInHydrator({ isLoggedIn }: { isLoggedIn: boolean }) {
  const setIsLoggedIn = use(LoggedInSetterContext);

  useEffect(() => {
    setIsLoggedIn(isLoggedIn);
  }, [isLoggedIn, setIsLoggedIn]);

  return null;
}

export function useIsLoggedIn(): boolean {
  return use(LoggedInContext);
}
