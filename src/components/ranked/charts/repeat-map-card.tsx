"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RepeatMapResult } from "@/lib/ranked-stats";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type RepeatMapCardProps = {
  result: RepeatMapResult;
};

export function RepeatMapCard({ result }: RepeatMapCardProps) {
  const t = useTranslations("ranked.charts.repeatMap");
  const {
    firstOccurrenceWinrate,
    repeatWinrate,
    firstOccurrenceTotal,
    repeatTotal,
    delta,
    hasEnoughData,
  } = result;

  const chartConfig = {
    winrate: {
      label: t("legendWinrate"),
    },
  } satisfies ChartConfig;

  const chartData = [
    {
      label: t("labelFirstTime"),
      winrate: firstOccurrenceWinrate,
      total: firstOccurrenceTotal,
    },
    {
      label: t("labelRepeat"),
      winrate: repeatWinrate,
      total: repeatTotal,
    },
  ];

  // Reconstructed insight (mirrors ranked-stats.ts): better/worse variants
  // keyed by delta sign, with the worse variant using the absolute delta.
  const insightText =
    Math.abs(delta) < 5
      ? t("insightNeutral")
      : delta > 0
        ? t("insightBetter", { delta })
        : t("insightWorse", { delta: Math.abs(delta) });

  const description = hasEnoughData
    ? delta > 5
      ? t("descriptionBetter", { delta })
      : delta < -5
        ? t("descriptionWorse", { delta })
        : t("descriptionNeutral")
    : t("descriptionEmpty");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <div className="space-y-4">
        {!hasEnoughData ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <AlertTriangle
              className="text-muted-foreground size-8"
              aria-hidden="true"
            />
            <p className="text-muted-foreground text-sm">
              {t("emptyInsight")}
            </p>
            <p className="text-muted-foreground/70 text-xs">
              {t("emptySubtext", { count: repeatTotal })}
            </p>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -8, bottom: 4 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  fontSize={11}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const d = item.payload as (typeof chartData)[number];
                        return (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-medium">{d.label}</span>
                            <span className="font-mono tabular-nums">
                              {t("tooltipWinrate", { value: Number(value) })}
                            </span>
                            <span className="text-muted-foreground">
                              {t("tooltipGames", { count: d.total })}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="winrate" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={
                        entry.winrate >= 55
                          ? "var(--chart-win)"
                          : entry.winrate >= 45
                            ? "var(--primary)"
                            : "var(--chart-loss)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {firstOccurrenceWinrate}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("statFirstTime")}
                </p>
                <p className="text-muted-foreground/70 text-xs">
                  {t("statGames", { count: firstOccurrenceTotal })}
                </p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {repeatWinrate}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("statRepeat")}
                </p>
                <p className="text-muted-foreground/70 text-xs">
                  {t("statGames", { count: repeatTotal })}
                </p>
              </div>
            </div>

            {Math.abs(delta) >= 5 && (
              <div
                className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                  delta > 0
                    ? "bg-primary/15 text-primary"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {delta > 0 ? (
                  <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <TrendingDown
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{insightText}</span>
              </div>
            )}
          </>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{t("footer")}</p>
    </section>
  );
}
