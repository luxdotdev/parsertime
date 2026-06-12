"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { GameModeWinrateResult } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type GameModeWinrateChartProps = {
  result: GameModeWinrateResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

export function GameModeWinrateChart({ result }: GameModeWinrateChartProps) {
  const t = useTranslations("ranked.charts.gameModeWinrate");
  const { data, insight } = result;

  const description =
    insight.bestMode &&
    insight.worstMode &&
    insight.bestMode !== insight.worstMode
      ? t("descriptionBestWorst", {
          bestMode: insight.bestMode,
          bestWinrate: insight.bestWinrate,
          worstMode: insight.worstMode,
          worstWinrate: insight.worstWinrate,
        })
      : insight.bestMode
        ? t("descriptionBest", {
            bestMode: insight.bestMode,
            bestWinrate: insight.bestWinrate,
          })
        : t("descriptionEmpty");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="mode"
              tickLine={false}
              axisLine={false}
              width={80}
              fontSize={12}
            />
            <ReferenceLine
              x={50}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const payload = item.payload as typeof data[number];
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {t("winrate")}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {t("winsOverGames", {
                            wins: payload.wins,
                            total: payload.total,
                          })}
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Bar dataKey="winrate" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.mode}
                  fill={
                    entry.winrate >= 50
                      ? "var(--chart-win)"
                      : "var(--chart-loss)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">{t("footer")}</p>
    </section>
  );
}
