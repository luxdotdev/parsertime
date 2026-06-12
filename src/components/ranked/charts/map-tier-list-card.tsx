"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MapDetailedResult } from "@/lib/ranked-stats";
import { AlertTriangle } from "lucide-react";

type MapTierListCardProps = {
  result: MapDetailedResult;
};

const TIER_CONFIG = {
  S: {
    label: "S",
    description: "Dominant",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
    headerClassName: "text-amber-600 dark:text-amber-400",
  },
  A: {
    label: "A",
    description: "Strong",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    headerClassName: "text-emerald-600 dark:text-emerald-400",
  },
  B: {
    label: "B",
    description: "Solid",
    className: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
    headerClassName: "text-blue-600 dark:text-blue-400",
  },
  C: {
    label: "C",
    description: "Neutral",
    className: "bg-muted/50 text-muted-foreground border-border",
    headerClassName: "text-muted-foreground",
  },
  D: {
    label: "D",
    description: "Struggling",
    className: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
    headerClassName: "text-red-600 dark:text-red-400",
  },
} as const;

const TIERS = ["S", "A", "B", "C", "D"] as const;

export function MapTierListCard({ result }: MapTierListCardProps) {
  const { data } = result;

  const tierGroups = TIERS.reduce<
    Record<string, typeof data>
  >((acc, tier) => {
    acc[tier] = data.filter((d) => d.tier === tier && d.total > 0);
    return acc;
  }, {});

  const totalMaps = data.filter((d) => d.total > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Tier List</CardTitle>
        <CardDescription>
          {totalMaps > 0
            ? `Your ${totalMaps} played maps ranked by winrate and confidence`
            : "Play more maps to generate a tier list"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-2" role="list" aria-label="Map tier list">
            {TIERS.map((tier) => {
              const maps = tierGroups[tier] ?? [];
              const config = TIER_CONFIG[tier];

              return (
                <div
                  key={tier}
                  className="flex items-start gap-3 min-h-[40px]"
                  role="listitem"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-bold"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    aria-label={`Tier ${tier}: ${config.description}`}
                  >
                    <span className={config.headerClassName}>{tier}</span>
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5 py-1.5">
                    {maps.length === 0 ? (
                      <span className="text-muted-foreground/50 text-xs italic">
                        —
                      </span>
                    ) : (
                      maps.map((map) => (
                        <Tooltip key={map.name}>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex cursor-default items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${config.className}`}
                            >
                              {map.name}
                              {!map.hasEnoughData && (
                                <AlertTriangle
                                  className="size-2.5 text-amber-500"
                                  aria-label="Low sample size"
                                />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="space-y-1 text-xs">
                              <p className="font-semibold">{map.name}</p>
                              <p className="text-muted-foreground">
                                {map.mapType}
                              </p>
                              <p>
                                {map.winrate}% winrate ({map.wins}W / {map.losses}L
                                {map.draws > 0 ? ` / ${map.draws}D` : ""})
                              </p>
                              {!map.hasEnoughData && (
                                <p className="text-amber-500">
                                  Low confidence — only {map.total} game
                                  {map.total !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
