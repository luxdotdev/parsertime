"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { GroupSizeResult } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type GroupSizeBreakdownChartProps = {
  result: GroupSizeResult;
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

type DescriptionResult = { key: string; args?: Record<string, number> };

function buildDescription(result: GroupSizeResult): DescriptionResult {
  const { data } = result;
  if (data.length === 0) return { key: "descriptionEmpty" };

  const total = data.reduce((sum, e) => sum + e.total, 0);
  if (total === 0) return { key: "descriptionEmpty" };

  const soloEntry = data.find((e) => e.groupSize === 1);
  const soloGames = soloEntry?.total ?? 0;
  const groupedGames = total - soloGames;

  if (soloGames === 0) {
    return { key: "descriptionAllGrouped", args: { total } };
  }
  if (groupedGames === 0) {
    return { key: "descriptionAllSolo", args: { total } };
  }

  const soloPct = Math.round((soloGames / total) * 100);
  return {
    key: "descriptionMixed",
    args: { soloPct, total, groupedPct: 100 - soloPct },
  };
}

export function GroupSizeBreakdownChart({
  result,
}: GroupSizeBreakdownChartProps) {
  const t = useTranslations("ranked.charts.groupSizeBreakdown");
  const { data } = result;

  const descriptionResult = buildDescription(result);
  const description = t(descriptionResult.key, descriptionResult.args);
  const totalGames = data.reduce((sum, e) => sum + e.total, 0);

  if (data.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("descriptionEmpty")}
        />
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            fontSize={12}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const payload = item.payload as (typeof data)[number];
                  const { wins, draws, total, winrate } = payload;

                  if (name === "losses") {
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: "var(--chart-loss)" }}
                          />
                          <span className="text-muted-foreground">
                            {t("losses")}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}
                          </span>
                        </div>
                        {draws > 0 && (
                          <div className="text-muted-foreground text-xs">
                            {t("draws", { count: draws })}
                          </div>
                        )}
                        <div className="border-border border-t pt-1 text-xs">
                          {t.rich("winrateOverGames", {
                            winrate,
                            total,
                            b: (chunks) => (
                              <span className="font-medium tabular-nums">
                                {chunks}
                              </span>
                            ),
                          })}
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
                      <span className="text-muted-foreground">{t("wins")}</span>
                      <span className="font-mono font-medium tabular-nums">
                        {wins}
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
        {t("footer", { count: totalGames, sizes: data.length })}
      </p>
    </section>
  );
}
