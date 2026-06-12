"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RollingWinrateEntry, RollingWinrateResult } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type WinrateTrendChartProps = {
  result: RollingWinrateResult;
};

const chartConfig = {
  rollingWinrate: {
    label: "Rolling Winrate",
    color: "var(--chart-win)",
  },
} satisfies ChartConfig;

export function WinrateTrendChart({ result }: WinrateTrendChartProps) {
  const t = useTranslations("ranked.charts.winrateTrend");
  const { data, insight } = result;

  if (data.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("emptyDescription")}
        />
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </div>
      </section>
    );
  }

  const description =
    insight.trend === "improving"
      ? t("trendImproving", {
          window: insight.window,
          current: insight.currentWinrate,
        })
      : insight.trend === "declining"
        ? t("trendDeclining", {
            peak: insight.peakWinrate,
            current: insight.currentWinrate,
          })
        : t("trendStable", { current: insight.currentWinrate });

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
          >
            <defs>
              <linearGradient id="winrateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-win)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--chart-win)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="gameIndex"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `#${v}`}
              interval="preserveStartEnd"
              fontSize={12}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              fontSize={12}
            />
            <ReferenceLine
              y={50}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const payload = item.payload as RollingWinrateEntry;
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {t("tooltipLabel")}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {t("tooltipMeta", {
                            game: payload.gameIndex,
                            date: payload.date,
                          })}
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Line
              type="monotone"
              dataKey="rollingWinrate"
              stroke="var(--chart-win)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ChartContainer>
      <p className="text-muted-foreground text-xs">
        {t("footer", {
          window: insight.window,
          total: data.length,
          peak: insight.peakWinrate,
        })}
      </p>
    </section>
  );
}
