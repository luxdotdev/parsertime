"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { MAP_DETAILED_MIN_GAMES } from "@/lib/ranked-stats";
import type { MapDetailedResult } from "@/lib/ranked-stats";
import { AlertTriangle, Star } from "lucide-react";
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

type MapWinrateRankingChartProps = {
  result: MapDetailedResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

function ConfidenceStars({ count }: { count: 1 | 2 | 3 | 4 | 5 }) {
  const t = useTranslations("ranked.charts.mapWinrateRanking");
  return (
    <span
      className="flex shrink-0 items-center gap-0.5"
      aria-label={t("confidenceStarsLabel", { count })}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-2.5 ${
            i < count ? "fill-primary text-primary" : "fill-muted text-muted"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

type TooltipPayload = {
  name: string;
  mapType: string;
  winrate: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  deviation: number;
  confidenceStars: 1 | 2 | 3 | 4 | 5;
  hasEnoughData: boolean;
};

function CustomTooltip({
  active,
  payload,
  overallWinrate,
}: {
  active?: boolean;
  payload?: { payload: TooltipPayload }[];
  overallWinrate: number;
}) {
  const t = useTranslations("ranked.charts.mapWinrateRanking");
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const deviationLabel =
    d.deviation > 0
      ? t("deviationAbove", { deviation: d.deviation })
      : d.deviation < 0
        ? t("deviationBelow", { deviation: d.deviation })
        : t("deviationAt");

  return (
    <div className="bg-background border-border rounded-lg border p-3 shadow-lg">
      <p className="text-sm font-semibold">{d.name}</p>
      <p className="text-muted-foreground mb-2 text-xs">{d.mapType}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{t("winrate")}</span>
          <span className="font-mono font-medium tabular-nums">
            {d.winrate}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{t("wld")}</span>
          <span className="font-mono tabular-nums">
            {d.wins} / {d.losses} / {d.draws}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            {t("vsAvg", { overallWinrate })}
          </span>
          <span
            className={`font-mono font-medium tabular-nums ${
              d.deviation > 0
                ? "text-primary"
                : d.deviation < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {deviationLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t("confidence")}</span>
          <ConfidenceStars count={d.confidenceStars} />
        </div>
        {!d.hasEnoughData && (
          <p className="text-primary mt-1 flex items-center gap-1">
            <AlertTriangle className="size-3" aria-hidden="true" />
            {t("lowSample", { count: d.total })}
          </p>
        )}
      </div>
    </div>
  );
}

export function MapWinrateRankingChart({
  result,
}: MapWinrateRankingChartProps) {
  const t = useTranslations("ranked.charts.mapWinrateRanking");
  const { data, overallWinrate, insight } = result;

  const totalGames = data.reduce((sum, d) => sum + d.total, 0);
  const mapsWithData = data.filter((d) => d.total > 0);

  const description = insight.bestMap
    ? t("insight", {
        bestMap: insight.bestMap,
        bestWinrate: insight.bestWinrate,
        worstMap: insight.worstMap,
        worstWinrate: insight.worstWinrate,
      })
    : t("insightEmpty");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <BarChart
          data={mapsWithData}
          layout="vertical"
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={120}
            fontSize={11}
          />
          <ReferenceLine
            x={overallWinrate}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 2"
            strokeOpacity={0.5}
            label={{
              value: t("avgLabel", { overallWinrate }),
              position: "insideTopRight",
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
          />
          <ChartTooltip
            content={<CustomTooltip overallWinrate={overallWinrate} />}
          />
          <Bar dataKey="winrate" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {mapsWithData.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.winrate >= 60
                    ? "var(--chart-win)"
                    : entry.winrate >= 50
                      ? "var(--primary)"
                      : entry.winrate >= 40
                        ? "var(--muted-foreground)"
                        : "var(--chart-loss)"
                }
                opacity={entry.hasEnoughData ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-muted-foreground text-xs">
          {t("footer", { count: totalGames, maps: mapsWithData.length })}
        </p>
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <AlertTriangle className="text-primary size-3" aria-hidden="true" />
          {t("fadedNote", { min: MAP_DETAILED_MIN_GAMES })}
        </p>
      </div>
    </section>
  );
}
