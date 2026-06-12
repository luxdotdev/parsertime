"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAP_TYPES } from "@/lib/ranked-stats";
import type { HeroMapSynergyResult } from "@/lib/ranked-stats";
import { HERO_MAP_MIN_GAMES } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
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
    return { bg: "var(--chart-win)", text: "var(--primary-foreground)" };
  }
  if (winrate >= 60) {
    return {
      bg: "color-mix(in oklch, var(--chart-win) 70%, var(--muted))",
      text: "var(--primary-foreground)",
    };
  }
  if (winrate >= 50) {
    return {
      bg: "color-mix(in oklch, var(--chart-win) 35%, var(--muted))",
      text: "var(--foreground)",
    };
  }
  if (winrate >= 40) {
    return {
      bg: "color-mix(in oklch, var(--chart-loss) 35%, var(--muted))",
      text: "var(--foreground)",
    };
  }
  if (winrate >= 30) {
    return {
      bg: "color-mix(in oklch, var(--chart-loss) 70%, var(--muted))",
      text: "var(--primary-foreground)",
    };
  }
  return { bg: "var(--chart-loss)", text: "var(--primary-foreground)" };
}

export function HeroMapSynergyMatrix({ result }: HeroMapSynergyMatrixProps) {
  const t = useTranslations("ranked.charts.heroMapSynergy");
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
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("descriptionEmptyHeader")}
        />
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("noData")}
        </p>
      </section>
    );
  }

  const description = t("description", { min: HERO_MAP_MIN_GAMES });

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
        rightSlot={
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label={t("filterGroupLabel")}
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
                {type === "All" ? t("filterAll") : type}
              </Button>
            ))}
          </div>
        }
      />
      <div>
        {displayMaps.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t("noMapsOfType", { type: typeFilter })}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div
                role="grid"
                aria-label={t("matrixLabel")}
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
                    aria-label={t("heroMapHeader")}
                  >
                    <span className="text-muted-foreground">
                      {t("heroMapHeader")}
                    </span>
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
                                    ? t("cellLabel", {
                                        hero,
                                        map,
                                        winrate,
                                        games: cell?.total ?? 0,
                                      })
                                    : t("cellLabelInsufficient", { hero, map })
                                }
                              >
                                {hasData ? `${winrate}%` : "—"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="space-y-1 text-xs">
                                <p className="font-semibold">
                                  {t("cellTitle", { hero, map })}
                                </p>
                                {hasData ? (
                                  <>
                                    <p>{t("cellWinrate", { winrate })}</p>
                                    <p className="text-muted-foreground">
                                      {t("cellRecord", {
                                        wins: cell?.wins ?? 0,
                                        losses:
                                          (cell?.total ?? 0) -
                                          (cell?.wins ?? 0),
                                        games: cell?.total ?? 0,
                                      })}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-muted-foreground">
                                    {cell && cell.total > 0
                                      ? t("cellInsufficient", {
                                          count: cell.total,
                                          min: HERO_MAP_MIN_GAMES,
                                        })
                                      : t("cellNoGames")}
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
              <span className="text-muted-foreground text-xs">
                {t("legendWinrate")}
              </span>
              {[
                {
                  label: "≥70%",
                  bg: "var(--chart-win)",
                  text: "var(--primary-foreground)",
                },
                {
                  label: "60–69%",
                  bg: "color-mix(in oklch, var(--chart-win) 70%, var(--muted))",
                  text: "var(--primary-foreground)",
                },
                {
                  label: "50–59%",
                  bg: "color-mix(in oklch, var(--chart-win) 35%, var(--muted))",
                  text: "var(--foreground)",
                },
                {
                  label: "40–49%",
                  bg: "color-mix(in oklch, var(--chart-loss) 35%, var(--muted))",
                  text: "var(--foreground)",
                },
                {
                  label: "30–39%",
                  bg: "color-mix(in oklch, var(--chart-loss) 70%, var(--muted))",
                  text: "var(--primary-foreground)",
                },
                {
                  label: "<30%",
                  bg: "var(--chart-loss)",
                  text: "var(--primary-foreground)",
                },
              ].map(({ label, bg, text }) => (
                <div key={label} className="flex items-center gap-1">
                  <div
                    className="h-4 w-6 rounded text-center text-[9px] leading-4 font-medium"
                    style={{ backgroundColor: bg, color: text }}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground text-[11px]">
                    {label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div
                  className="h-4 w-6 rounded"
                  style={{ backgroundColor: "var(--muted)" }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground text-[11px]">
                  {t("legendLowGames", { min: HERO_MAP_MIN_GAMES })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {typeFilter === "All"
          ? t("footer", {
              heroes: heroes.length,
              maps: displayMaps.length,
            })
          : t("footerFiltered", {
              heroes: heroes.length,
              maps: displayMaps.length,
              type: typeFilter,
            })}
      </p>
    </section>
  );
}
