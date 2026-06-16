"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { MAP_LEARNING_MIN_GAMES } from "@/lib/ranked-stats";
import type { MapLearningResult } from "@/lib/ranked-stats";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type MapLearningCurveCardProps = {
  result: MapLearningResult;
};

export function MapLearningCurveCard({ result }: MapLearningCurveCardProps) {
  const t = useTranslations("ranked.charts.mapLearningCurve");
  const { data, insight } = result;

  const chartConfig = {
    earlyWinrate: {
      label: t("legendEarly"),
      color: "var(--chart-3)",
    },
    lateWinrate: {
      label: t("legendRecent"),
      color: "var(--chart-win)",
    },
  } satisfies ChartConfig;

  const qualified = data.filter((d) => d.hasEnoughData);

  if (qualified.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("emptyDescription", {
            minGames: MAP_LEARNING_MIN_GAMES,
          })}
        />
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("emptyState", { minGames: MAP_LEARNING_MIN_GAMES })}
        </p>
      </section>
    );
  }

  const insightText =
    insight.mostImproved && insight.improvementDelta > 0
      ? t("insightImproved", {
          map: insight.mostImproved,
          delta: insight.improvementDelta,
        })
      : insight.mostDeclined && insight.declineDelta < 0
        ? t("insightDeclined", {
            map: insight.mostDeclined,
            delta: insight.declineDelta,
          })
        : t("insightNeutral");

  const description =
    insight.mostImproved && insight.improvementDelta > 0
      ? t("descriptionImproved", {
          map: insight.mostImproved,
          delta: insight.improvementDelta,
        })
      : t("descriptionDefault");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <BarChart
          data={qualified}
          margin={{ top: 4, right: 8, left: -8, bottom: 60 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="map"
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-40}
            textAnchor="end"
            height={80}
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            fontSize={11}
          />
          <ReferenceLine
            y={50}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const d = item.payload as (typeof qualified)[number];
                  if (name === "lateWinrate") {
                    const delta = d.lateWinrate - d.earlyWinrate;
                    return (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: "var(--chart-win)" }}
                          />
                          <span className="text-muted-foreground">
                            {t("tooltipRecent", { games: d.lateGames })}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="border-border border-t pt-1 text-xs">
                          {delta > 0 ? (
                            <span className="text-chart-win flex items-center gap-1">
                              <TrendingUp className="size-3" />
                              {t("tooltipImprovement", { delta })}
                            </span>
                          ) : delta < 0 ? (
                            <span className="text-chart-loss flex items-center gap-1">
                              <TrendingDown className="size-3" />
                              {t("tooltipDecline", { delta })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {t("tooltipNoChange")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: "var(--chart-3)" }}
                      />
                      <span className="text-muted-foreground">
                        {t("tooltipEarly", { games: d.earlyGames })}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {value}%
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="earlyWinrate"
            fill="var(--color-earlyWinrate)"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="lateWinrate"
            fill="var(--color-lateWinrate)"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">
        {t("footer", {
          minGames: MAP_LEARNING_MIN_GAMES,
          count: qualified.length,
        })}
        {insightText ? ` — ${insightText}` : ""}
      </p>
    </section>
  );
}
