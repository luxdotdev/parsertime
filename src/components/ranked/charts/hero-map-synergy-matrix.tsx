"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAP_TYPES } from "@/lib/ranked-stats";
import type { HeroMapSynergyResult } from "@/lib/ranked-stats";
import { HERO_MAP_MIN_GAMES } from "@/lib/ranked-stats";
import { useState } from "react";

type HeroMapSynergyMatrixProps = {
  result: HeroMapSynergyResult;
};

type MapTypeFilter = (typeof MAP_TYPES)[number] | "All";

const MAP_TYPE_FILTERS: MapTypeFilter[] = ["All", ...MAP_TYPES];

function winrateToColor(
  winrate: number,
  hasData: boolean
): { bg: string; text: string } {
  if (!hasData) {
    return {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
    };
  }
  if (winrate >= 70) {
    return { bg: "oklch(0.40 0.14 160)", text: "oklch(0.95 0.05 160)" };
  }
  if (winrate >= 60) {
    return { bg: "oklch(0.52 0.16 160)", text: "oklch(0.97 0.02 160)" };
  }
  if (winrate >= 50) {
    return { bg: "oklch(0.65 0.15 160)", text: "oklch(0.15 0.03 160)" };
  }
  if (winrate >= 40) {
    return { bg: "oklch(0.72 0.15 50)", text: "oklch(0.20 0.05 50)" };
  }
  if (winrate >= 30) {
    return { bg: "oklch(0.62 0.18 25)", text: "oklch(0.97 0.02 25)" };
  }
  return { bg: "oklch(0.48 0.18 25)", text: "oklch(0.97 0.02 25)" };
}

export function HeroMapSynergyMatrix({ result }: HeroMapSynergyMatrixProps) {
  const { matrix, heroes, maps, bestHeroPerMap } = result;
  const [typeFilter, setTypeFilter] = useState<MapTypeFilter>("All");

  const displayMaps =
    typeFilter === "All"
      ? maps
      : maps.filter((mapName) => {
          const mapData = bestHeroPerMap.find((b) => b.map === mapName);
          return mapData ? mapData.mapType === typeFilter : false;
        });

  if (heroes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hero × Map Synergy</CardTitle>
          <CardDescription>
            Track enough matches to see which heroes work best on each map
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            No data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Hero × Map Synergy</CardTitle>
            <CardDescription>
              Which heroes win on which maps — cells with fewer than{" "}
              {HERO_MAP_MIN_GAMES} games are shown as —
            </CardDescription>
          </div>
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Filter by map type"
          >
            {MAP_TYPE_FILTERS.map((type) => (
              <Button
                key={type}
                variant={typeFilter === type ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setTypeFilter(type)}
                aria-pressed={typeFilter === type}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayMaps.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No {typeFilter} maps played yet
          </p>
        ) : (
          <>
        <div className="overflow-x-auto">
          <div
            role="grid"
            aria-label="Hero-map winrate matrix"
            style={{
              display: "grid",
              gridTemplateColumns: `minmax(90px, 120px) repeat(${displayMaps.length}, minmax(44px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div role="row" className="contents">
              <div
                role="columnheader"
                className="border-border bg-card sticky left-0 z-10 border-b px-2 pb-1.5 text-xs font-medium"
                aria-label="Hero / Map"
              >
                <span className="text-muted-foreground">Hero / Map</span>
              </div>
              {displayMaps.map((map) => (
                <TooltipProvider key={map}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        role="columnheader"
                        className="border-border border-b px-1 pb-1.5 text-center"
                      >
                        <span
                          className="text-muted-foreground block truncate text-[10px] leading-tight font-medium"
                          style={{
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            height: 72,
                            maxHeight: 72,
                          }}
                        >
                          {map}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{map}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Data rows */}
            {heroes.map((hero) => (
              <div key={hero} role="row" className="contents">
                <div
                  role="rowheader"
                  className="border-border bg-card sticky left-0 z-10 border-t px-2 py-1 text-xs font-medium"
                >
                  <span className="block truncate">{hero}</span>
                </div>
                {displayMaps.map((map) => {
                  const cell = matrix.find(
                    (c) => c.hero === hero && c.map === map
                  );
                  const hasData = !!cell?.hasEnoughData;
                  const winrate = cell?.winrate ?? 0;
                  const colors = winrateToColor(winrate, hasData);

                  return (
                    <TooltipProvider key={`${hero}-${map}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            role="gridcell"
                            className="border-border m-0.5 flex items-center justify-center rounded text-[11px] font-medium tabular-nums"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              height: 32,
                              minWidth: 32,
                            }}
                            aria-label={
                              hasData
                                ? `${hero} on ${map}: ${winrate}% winrate from ${cell?.total} games`
                                : `${hero} on ${map}: insufficient data`
                            }
                          >
                            {hasData ? `${winrate}%` : "—"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold">
                              {hero} on {map}
                            </p>
                            {hasData ? (
                              <>
                                <p>{winrate}% winrate</p>
                                <p className="text-muted-foreground">
                                  {cell?.wins}W /{" "}
                                  {(cell?.total ?? 0) - (cell?.wins ?? 0)}L
                                  &nbsp;({cell?.total} games)
                                </p>
                              </>
                            ) : (
                              <p className="text-muted-foreground">
                                {cell && cell.total > 0
                                  ? `Only ${cell.total} game${cell.total !== 1 ? "s" : ""} — need ${HERO_MAP_MIN_GAMES}+`
                                  : "No games played"}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Winrate:</span>
          {[
            {
              label: "≥70%",
              bg: "oklch(0.40 0.14 160)",
              text: "oklch(0.95 0.05 160)",
            },
            {
              label: "60–69%",
              bg: "oklch(0.52 0.16 160)",
              text: "oklch(0.97 0.02 160)",
            },
            {
              label: "50–59%",
              bg: "oklch(0.65 0.15 160)",
              text: "oklch(0.15 0.03 160)",
            },
            {
              label: "40–49%",
              bg: "oklch(0.72 0.15 50)",
              text: "oklch(0.20 0.05 50)",
            },
            {
              label: "30–39%",
              bg: "oklch(0.62 0.18 25)",
              text: "oklch(0.97 0.02 25)",
            },
            {
              label: "<30%",
              bg: "oklch(0.48 0.18 25)",
              text: "oklch(0.97 0.02 25)",
            },
          ].map(({ label, bg, text }) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="h-4 w-6 rounded text-center text-[9px] leading-4 font-medium"
                style={{ backgroundColor: bg, color: text }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground text-[11px]">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div
              className="h-4 w-6 rounded"
              style={{ backgroundColor: "var(--muted)" }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground text-[11px]">
              &lt;{HERO_MAP_MIN_GAMES} games
            </span>
          </div>
        </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Showing top {heroes.length} heroes by play frequency across{" "}
          {displayMaps.length} maps
          {typeFilter !== "All" ? ` (${typeFilter} only)` : ""}
        </p>
      </CardFooter>
    </Card>
  );
}
