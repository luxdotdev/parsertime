"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MapWinLossResult } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type MapWinLossChartProps = {
  result: MapWinLossResult;
};

const chartConfig = {
  wins: {
    label: "Wins",
    color: "var(--chart-win)",
  },
  losses: {
    label: "Losses",
    color: "var(--chart-loss)",
  },
} satisfies ChartConfig;

export function MapWinLossChart({ result }: MapWinLossChartProps) {
  const t = useTranslations("ranked.charts.mapWinLoss");
  const { data, insight } = result;

  const totalGames = data.reduce((sum, d) => sum + d.wins + d.losses, 0);

  const description =
    insight.worstMap !== insight.bestMap
      ? t("descriptionWithWorst", {
          bestMap: insight.bestMap,
          bestWinrate: insight.bestWinrate,
          worstMap: insight.worstMap,
          worstWinrate: insight.worstWinrate,
        })
      : t("description", {
          bestMap: insight.bestMap,
          bestWinrate: insight.bestWinrate,
        });

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 60 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const payload = item.payload as typeof data[number];
                    const { wins, losses } = payload;
                    const total = wins + losses;
                    const winrate =
                      total > 0 ? Math.round((wins / total) * 100) : 0;

                    if (name === "losses") {
                      return (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{
                                backgroundColor: "var(--chart-loss)",
                              }}
                            />
                            <span className="text-muted-foreground">
                              {t("losses")}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {value}
                            </span>
                          </div>
                          <div className="border-border border-t pt-1 text-xs">
                            {t("winrateLabel")}{" "}
                            <span className="font-medium tabular-nums">
                              {winrate}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: "var(--chart-win)" }}
                        />
                        <span className="text-muted-foreground">
                          {t("wins")}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {value}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="wins"
              stackId="stack"
              fill="var(--color-wins)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="losses"
              stackId="stack"
              fill="var(--color-losses)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">
        {t("footer", { count: totalGames, maps: data.length })}
      </p>
    </section>
  );
}
