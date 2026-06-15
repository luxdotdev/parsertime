"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DotMatrixLoader } from "./dot-matrix-loader";
import { useRangeTransition } from "./range-transition-context";

/**
 * Wraps the per-tab page content so it dims and goes non-interactive while a
 * timeframe change is in flight, with a terminal dot-matrix loader floated front
 * and center over the stale numbers. Pairs with the range picker, which drives
 * the shared transition. Without it, a search-param-only change never re-fires
 * loading.tsx, so there is no sign the input registered.
 */
export function TeamStatsContent({ children }: { children: ReactNode }) {
  const { isPending } = useRangeTransition();
  const t = useTranslations("teamStatsPage.rangePicker");

  return (
    <div className="relative">
      <div
        aria-busy={isPending}
        className={cn(
          "transition-opacity duration-200",
          isPending && "pointer-events-none opacity-40"
        )}
      >
        {children}
      </div>
      {isPending ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-12">
          <DotMatrixLoader label={t("loading")} />
        </div>
      ) : null}
    </div>
  );
}
