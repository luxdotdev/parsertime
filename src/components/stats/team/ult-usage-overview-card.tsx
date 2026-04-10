"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { TeamUltStats } from "@/data/team/types";
import { cn, toHero } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type UltUsageOverviewCardProps = {
  ultStats: TeamUltStats;
};

function getInitiationColor(rate: number): string {
  if (rate >= 55) return "text-green-600 dark:text-green-400";
  if (rate >= 45) return "text-blue-600 dark:text-blue-400";
  if (rate >= 35) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getChargeTimeRating(seconds: number): string {
  if (seconds <= 90) return "chargeTimeFast";
  if (seconds <= 120) return "chargeTimeAverage";
  return "chargeTimeSlow";
}

function getHoldTimeRating(seconds: number): string {
  if (seconds <= 20) return "holdTimeGood";
  if (seconds <= 40) return "holdTimeAverage";
  return "holdTimeSlow";
}

const HERO_IMAGE_SIZE = 24;
const Y_AXIS_WIDTH = 140;

function renderHeroTick(props: {
  x: number;
  y: number;
  payload: { value: string };
}) {
  const heroSlug = toHero(props.payload.value);

  return (
    <g transform={`translate(${props.x},${props.y})`}>
      <image
        x={-Y_AXIS_WIDTH}
        y={-HERO_IMAGE_SIZE / 2}
        width={HERO_IMAGE_SIZE}
        height={HERO_IMAGE_SIZE}
        href={`/heroes/${heroSlug}.png`}
        clipPath="inset(0% round 4px)"
      />
      <text
        x={-Y_AXIS_WIDTH + HERO_IMAGE_SIZE + 6}
        y={0}
        dy={4}
        textAnchor="start"
        className="text-xs"
        style={{ fill: "var(--color-muted-foreground)" }}
      >
        {props.payload.value}
      </text>
    </g>
  );
}

const chartConfig: ChartConfig = {
  count: {
    label: "Fight openings",
    color: "var(--chart-1)",
  },
};

export function UltUsageOverviewCard({ ultStats }: UltUsageOverviewCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.overview");
  const [openersOpen, setOpenersOpen] = useState(false);

  if (ultStats.totalUltsUsed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const heroChartData = ultStats.topFightOpeningHeroes.map((h) => ({
    hero: h.hero,
    count: h.count,
  }));
  const chartHeight = Math.max(200, heroChartData.length * 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-muted-foreground text-sm">
          {t("description", { maps: ultStats.totalMaps })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("totalUltsUsed")}
            </h4>
            <p className="text-3xl font-bold tabular-nums">
              {ultStats.totalUltsUsed}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("ultsPerMap", {
                count: ultStats.ultsPerMap.toFixed(1),
              })}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("avgChargeTime")}
            </h4>
            {ultStats.avgChargeTime > 0 ? (
              <>
                <p className="text-3xl font-bold tabular-nums">
                  {ultStats.avgChargeTime.toFixed(1)}s
                </p>
                <p className="text-muted-foreground text-xs">
                  {t(getChargeTimeRating(ultStats.avgChargeTime))}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("avgHoldTime")}
            </h4>
            {ultStats.avgHoldTime > 0 ? (
              <>
                <p className="text-3xl font-bold tabular-nums">
                  {ultStats.avgHoldTime.toFixed(1)}s
                </p>
                <p className="text-muted-foreground text-xs">
                  {t(getHoldTimeRating(ultStats.avgHoldTime))}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">
              {t("fightInitiation")}
            </h4>
            {ultStats.totalFightsWithUlts > 0 ? (
              <>
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    getInitiationColor(ultStats.fightInitiationRate)
                  )}
                >
                  {ultStats.fightInitiationRate.toFixed(1)}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("fightInitiationDetail", {
                    count: ultStats.fightInitiationCount,
                    total: ultStats.totalFightsWithUlts,
                  })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </div>
        </div>

        {heroChartData.length > 0 && (
          <Collapsible
            open={openersOpen}
            onOpenChange={setOpenersOpen}
            className="mt-6"
          >
            <CollapsibleTrigger
              className={cn(
                "bg-muted hover:bg-muted/80 flex w-full items-center justify-between p-3 text-sm transition-colors",
                openersOpen ? "rounded-t-lg" : "rounded-lg"
              )}
            >
              <span>
                {t.rich("topOpenersLabel", {
                  span: (chunks) => (
                    <span className="font-semibold">{chunks}</span>
                  ),
                  top: ultStats.topFightOpeningHeroes[0]?.hero ?? "",
                  count: ultStats.topFightOpeningHeroes[0]?.count ?? 0,
                })}
              </span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200",
                  openersOpen && "rotate-180"
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
              <div className="rounded-b-lg border border-t-0 px-3 pt-4 pb-3">
                <ChartContainer
                  config={chartConfig}
                  className="w-full"
                  style={{ height: chartHeight }}
                >
                  <BarChart
                    accessibilityLayer
                    data={heroChartData}
                    layout="vertical"
                    margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="hero"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={Y_AXIS_WIDTH}
                      tick={renderHeroTick}
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label: string) => label}
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
