"use client";

import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  HERO_WINRATE_MIN_MATCHES,
  type HeroWinrateResult,
} from "@/lib/ranked-stats";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type HeroWinrateChartProps = {
  result: HeroWinrateResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

function winrateColor(winrate: number): string {
  if (winrate >= 60) return "var(--chart-win)";
  if (winrate >= 50) return "var(--primary)";
  return "var(--chart-loss)";
}

export function HeroWinrateChart({ result }: HeroWinrateChartProps) {
  const t = useTranslations("ranked.charts.heroWinrate");
  const { data, insight } = result;

  const chartData = data.map((entry) => ({
    ...entry,
    label: `${entry.hero} (${entry.total})`,
  }));

  const description =
    insight.bestHero && insight.worstHero && insight.bestHero !== insight.worstHero
      ? t("descriptionBestWorst", {
          bestHero: insight.bestHero,
          bestWinrate: insight.bestWinrate,
          worstHero: insight.worstHero,
        })
      : insight.bestHero
        ? t("descriptionBest", {
            bestHero: insight.bestHero,
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
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
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
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={120}
              fontSize={12}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const payload = item.payload as typeof chartData[number];
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t("winrate")}</span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {t("winsTotal", { wins: payload.wins, total: payload.total })}
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Bar dataKey="winrate" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.hero}
                  fill={winrateColor(entry.winrate)}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      <p className="text-muted-foreground text-xs">
        {t("footer", {
          min: HERO_WINRATE_MIN_MATCHES,
          count: data.length,
        })}
      </p>
    </section>
  );
}
