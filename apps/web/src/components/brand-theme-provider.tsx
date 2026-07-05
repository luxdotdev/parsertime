"use client";

import { createContext, use, useEffect, useState } from "react";

type BrandThemeContextValue = {
  /** Whether the current user may select the Disguised brand theme. */
  canUseDisguised: boolean;
};

const BrandThemeContext = createContext<BrandThemeContextValue>({
  canUseDisguised: false,
});
const BrandThemeSetterContext = createContext<(value: boolean) => void>(
  () => undefined
);

/**
 * Stateful so the provider can sit in the static shell: children render
 * immediately with `canUseDisguised: false` and `BrandThemeHydrator`
 * (streamed from the root layout's request-time island) flips it for DSG
 * members. The only consumer is the Disguised item in the theme dropdown,
 * which appears once the value resolves.
 */
export function BrandThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [canUseDisguised, setCanUseDisguised] = useState(false);

  return (
    <BrandThemeSetterContext value={setCanUseDisguised}>
      <BrandThemeContext value={{ canUseDisguised }}>
        {children}
      </BrandThemeContext>
    </BrandThemeSetterContext>
  );
}

/** Rendered by the request-time island; enables the theme for DSG members. */
export function BrandThemeHydrator({
  canUseDisguised,
}: {
  canUseDisguised: boolean;
}) {
  const setCanUseDisguised = use(BrandThemeSetterContext);

  useEffect(() => {
    setCanUseDisguised(canUseDisguised);
  }, [canUseDisguised, setCanUseDisguised]);

  return null;
}

export function useCanUseDisguised(): boolean {
  return use(BrandThemeContext).canUseDisguised;
}
