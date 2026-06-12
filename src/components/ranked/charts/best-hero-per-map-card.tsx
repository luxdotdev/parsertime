"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HERO_MAP_MIN_GAMES } from "@/lib/ranked-stats";
import type { HeroMapSynergyResult } from "@/lib/ranked-stats";
import { Info } from "lucide-react";

type BestHeroPerMapCardProps = {
  result: HeroMapSynergyResult;
};

const ROLE_COLORS: Record<string, string> = {
  Tank: "bg-primary/15 text-primary",
  Damage: "bg-muted text-foreground",
  Support: "bg-muted/50 text-muted-foreground",
};

const MAP_TYPE_COLORS: Record<string, string> = {
  Control: "bg-muted text-foreground",
  Escort: "bg-muted text-foreground",
  Hybrid: "bg-muted text-foreground",
  Push: "bg-muted text-foreground",
  Flashpoint: "bg-muted text-foreground",
  Clash: "bg-muted text-foreground",
};

export function BestHeroPerMapCard({ result }: BestHeroPerMapCardProps) {
  const { bestHeroPerMap } = result;

  if (bestHeroPerMap.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Hero × map"
          title="Best Hero per Map"
          description={`Play at least ${HERO_MAP_MIN_GAMES} games with a hero on a map to see your best picks`}
        />
        <p className="text-muted-foreground py-8 text-center text-sm">
          No qualifying data yet
        </p>
      </section>
    );
  }

  const description = `Your highest-winrate hero on each map (min ${HERO_MAP_MIN_GAMES} games) with 95% confidence intervals`;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Hero × map"
        title="Best Hero per Map"
        description={description}
        rightSlot={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="About confidence intervals"
                >
                  <Info className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-56">
                <p className="text-xs">
                  Wilson score intervals account for sample size. A wide range
                  (e.g. 40%–90%) means the estimate is unreliable — play more
                  games to narrow it.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />
      <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Best hero per map">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground pb-2 text-left text-xs font-medium">
                  Map
                </th>
                <th className="text-muted-foreground pb-2 text-left text-xs font-medium">
                  Type
                </th>
                <th className="text-muted-foreground pb-2 text-left text-xs font-medium">
                  Best Hero
                </th>
                <th className="text-muted-foreground pb-2 text-right text-xs font-medium">
                  Winrate
                </th>
                <th className="text-muted-foreground pb-2 text-right text-xs font-medium">
                  95% CI
                </th>
                <th className="text-muted-foreground pb-2 text-right text-xs font-medium">
                  Games
                </th>
              </tr>
            </thead>
            <tbody>
              {bestHeroPerMap.map((entry) => {
                const roleColor =
                  ROLE_COLORS[entry.role] ??
                  "bg-muted/50 text-muted-foreground";
                const mapTypeColor =
                  MAP_TYPE_COLORS[entry.mapType] ??
                  "bg-muted/50 text-muted-foreground";
                const ciWidth = entry.confidenceHigh - entry.confidenceLow;
                const isNarrow = ciWidth <= 20;

                return (
                  <tr
                    key={entry.map}
                    className="border-border border-b last:border-0"
                  >
                    <td className="py-2 pr-3 font-medium">{entry.map}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${mapTypeColor}`}
                      >
                        {entry.mapType}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span>{entry.hero}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${roleColor}`}
                        >
                          {entry.role}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-medium tabular-nums">
                      {entry.winrate}%
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`font-mono text-xs tabular-nums ${
                                isNarrow
                                  ? "text-muted-foreground"
                                  : "text-primary"
                              }`}
                            >
                              {entry.confidenceLow}%–{entry.confidenceHigh}%
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {isNarrow
                                ? "Narrow interval — reliable estimate"
                                : "Wide interval — more games needed for a reliable estimate"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-xs text-muted-foreground">
                      {entry.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      <p className="text-muted-foreground text-xs">
        Highlighted intervals are wide — the true winrate could vary
        significantly. Play more games to increase confidence.
      </p>
    </section>
  );
}
