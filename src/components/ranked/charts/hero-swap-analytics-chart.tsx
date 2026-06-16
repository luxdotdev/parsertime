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
  SWAP_MIN_PERCENTAGE,
  type HeroSwapEntry,
  type HeroSwapResult,
} from "@/lib/ranked-stats";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type HeroSwapAnalyticsChartProps = {
  result: HeroSwapResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

const SWAP_COLOR = "var(--chart-1)";
const STAY_COLOR = "var(--chart-2)";

export function HeroSwapAnalyticsChart({
  result,
}: HeroSwapAnalyticsChartProps) {
  const t = useTranslations("ranked.charts.heroSwap");
  const { data, delta, swapTotal, noSwapTotal } = result;
  const hasEnoughData = swapTotal >= 3 && noSwapTotal >= 3;

  const swapsWin = delta > 0;
  const deltaAbs = Math.abs(delta);

  const description = !hasEnoughData
    ? t("descriptionTrackMore")
    : deltaAbs < 2
      ? t("descriptionNoImpact")
      : swapsWin
        ? t("descriptionSwapBoost", { delta: deltaAbs })
        : t("descriptionStayAdvantage", { delta: deltaAbs });

  const deltaLabel =
    deltaAbs < 2
      ? t("deltaNoDifference")
      : swapsWin
        ? t("deltaSwapping", { delta: deltaAbs })
        : t("deltaStaying", { delta: deltaAbs });

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      {hasEnoughData ? (
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 56, left: 8, bottom: 4 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={64}
            />
            <ReferenceLine
              x={50}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const payload = item.payload as HeroSwapEntry;
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
                          {t("winsTotal", {
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
              <LabelList
                dataKey="winrate"
                position="right"
                formatter={(v: number) => `${v}%`}
                className="fill-muted-foreground text-xs tabular-nums"
                fontSize={12}
              />
              {data.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={entry.label === "Swapped" ? SWAP_COLOR : STAY_COLOR}
                  opacity={
                    deltaAbs < 2
                      ? 0.7
                      : (entry.label === "Swapped") === swapsWin
                        ? 1
                        : 0.5
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="flex h-[220px] items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasEnoughData && (
          <p className="text-sm font-medium tabular-nums">{deltaLabel}</p>
        )}
        <p className="text-muted-foreground text-xs">
          {t("footerRule", { pct: SWAP_MIN_PERCENTAGE })}
          {hasEnoughData && (
            <>
              {" "}
              &middot;{" "}
              {t("footerCounts", { swaps: swapTotal, single: noSwapTotal })}
            </>
          )}
        </p>
      </div>
    </section>
  );
}
