"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
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
    className: "bg-primary/15 text-primary border-primary/30",
    headerClassName: "text-primary",
  },
  A: {
    label: "A",
    description: "Strong",
    className: "bg-primary/10 text-primary/90 border-primary/20",
    headerClassName: "text-primary/90",
  },
  B: {
    label: "B",
    description: "Solid",
    className: "bg-muted text-foreground border-border",
    headerClassName: "text-foreground",
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
    className: "bg-destructive/15 text-destructive border-destructive/30",
    headerClassName: "text-destructive",
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

  const description =
    totalMaps > 0
      ? `Your ${totalMaps} played maps ranked by winrate and confidence`
      : "Play more maps to generate a tier list";

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Map performance"
        title="Map Tier List"
        description={description}
      />
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
                                  className="size-2.5 text-primary"
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
                                <p className="text-primary">
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
    </section>
  );
}
