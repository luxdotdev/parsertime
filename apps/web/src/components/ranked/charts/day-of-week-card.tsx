"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DayOfWeekEntry, DayOfWeekResult } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type DayOfWeekCardProps = {
  result: DayOfWeekResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

function dayBarColor(winrate: number, total: number): string {
  if (total === 0) return "var(--muted)";
  if (winrate >= 55) return "var(--chart-win)";
  if (winrate >= 45) return "oklch(0.72 0.15 50)";
  return "var(--chart-loss)";
}

function deltaBadgeClasses(delta: number): string {
  if (delta > 0) return "bg-primary/15 text-primary";
  if (delta < 0) return "bg-destructive/15 text-destructive";
  return "bg-muted text-muted-foreground";
}

export function DayOfWeekCard({ result }: DayOfWeekCardProps) {
  const t = useTranslations("ranked.charts.dayOfWeek");
  const { data, bestDay, worstDay, weekdayWinrate, weekendWinrate } = result;

  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("emptyDescription")}
        />
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-muted-foreground text-sm">{t("emptyTitle")}</p>
          <p className="text-muted-foreground/70 text-xs">{t("emptyHint")}</p>
        </div>
      </section>
    );
  }

  const delta = weekendWinrate - weekdayWinrate;

  const insight =
    weekdayWinrate === weekendWinrate
      ? t("insightStable", { winrate: weekdayWinrate, day: bestDay })
      : t("insightDelta", {
          delta: Math.abs(weekendWinrate - weekdayWinrate),
          when: weekendWinrate > weekdayWinrate ? "weekend" : "weekday",
          day: bestDay,
        });

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={insight}
      />
      <div className="space-y-4">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeOpacity={0.3} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="day"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={32}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(_value, _name, item) => {
                    const d = item.payload as DayOfWeekEntry;
                    if (d.total === 0) {
                      return (
                        <span className="text-muted-foreground text-xs">
                          {t("tooltipNoGames", { day: d.day })}
                        </span>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-mono font-medium tabular-nums">
                          {t("tooltipWinrate", { winrate: d.winrate })}
                        </span>
                        <span className="text-muted-foreground">
                          {d.draws > 0
                            ? t("tooltipRecordWithDraws", {
                                wins: d.wins,
                                losses: d.losses,
                                draws: d.draws,
                                total: d.total,
                              })
                            : t("tooltipRecord", {
                                wins: d.wins,
                                losses: d.losses,
                                total: d.total,
                              })}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="winrate" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {data.map((d) => (
                <Cell key={d.day} fill={dayBarColor(d.winrate, d.total)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {weekdayWinrate}%
            </p>
            <p className="text-muted-foreground text-xs">{t("weekdays")}</p>
            <p className="text-muted-foreground/70 text-xs">
              {t("weekdayRange")}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <p className="font-mono text-lg font-semibold tabular-nums">
                {weekendWinrate}%
              </p>
              {delta !== 0 && (
                <span
                  className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${deltaBadgeClasses(delta)}`}
                  aria-label={t("deltaLabel", {
                    delta: Math.abs(delta),
                    direction: delta > 0 ? "better" : "worse",
                  })}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}%
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">{t("weekends")}</p>
            <p className="text-muted-foreground/70 text-xs">
              {t("weekendRange")}
            </p>
          </div>
        </div>

        {bestDay && worstDay && bestDay !== worstDay && (
          <div className="grid grid-cols-2 gap-2">
            <div className="border-border bg-primary/15 rounded-md border p-2 text-center">
              <p className="text-primary text-sm font-semibold">{bestDay}</p>
              <p className="text-primary text-xs">{t("bestDay")}</p>
            </div>
            <div className="border-border bg-destructive/15 rounded-md border p-2 text-center">
              <p className="text-destructive text-sm font-semibold">
                {worstDay}
              </p>
              <p className="text-destructive text-xs">{t("toughestDay")}</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{t("footer")}</p>
    </section>
  );
}
