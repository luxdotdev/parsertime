"use client";

import { createContext, use } from "react";

type BrandThemeContextValue = {
  /** Whether the current user may select the Disguised brand theme. */
  canUseDisguised: boolean;
};

const BrandThemeContext = createContext<BrandThemeContextValue>({
  canUseDisguised: false,
});

export function BrandThemeProvider({
  children,
  canUseDisguised,
}: {
  children: React.ReactNode;
  canUseDisguised: boolean;
}) {
  return (
    <BrandThemeContext value={{ canUseDisguised }}>
      {children}
    </BrandThemeContext>
  );
}

export function useCanUseDisguised(): boolean {
  return use(BrandThemeContext).canUseDisguised;
}
