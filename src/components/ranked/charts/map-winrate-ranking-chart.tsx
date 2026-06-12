"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { MAP_DETAILED_MIN_GAMES } from "@/lib/ranked-stats";
import type { MapDetailedResult } from "@/lib/ranked-stats";
import { AlertTriangle, Star } from "lucide-react";
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
  return (
    <span
      className="flex shrink-0 items-center gap-0.5"
      aria-label={`Confidence: ${count} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-2.5 ${
            i < count
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
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
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const deviationLabel =
    d.deviation > 0
      ? `+${d.deviation}% above average`
      : d.deviation < 0
        ? `${d.deviation}% below average`
        : "At average";

  return (
    <div className="bg-background border-border rounded-lg border p-3 shadow-lg">
      <p className="text-sm font-semibold">{d.name}</p>
      <p className="text-muted-foreground mb-2 text-xs">{d.mapType}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Winrate</span>
          <span className="font-mono font-medium tabular-nums">
            {d.winrate}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">W / L / D</span>
          <span className="font-mono tabular-nums">
            {d.wins} / {d.losses} / {d.draws}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">vs. your avg ({overallWinrate}%)</span>
          <span
            className={`font-mono font-medium tabular-nums ${
              d.deviation > 0
                ? "text-emerald-500"
                : d.deviation < 0
                  ? "text-red-500"
                  : "text-muted-foreground"
            }`}
          >
            {deviationLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Confidence</span>
          <ConfidenceStars count={d.confidenceStars} />
        </div>
        {!d.hasEnoughData && (
          <p className="text-amber-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="size-3" aria-hidden="true" />
            Low sample — {d.total} game{d.total !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export function MapWinrateRankingChart({ result }: MapWinrateRankingChartProps) {
  const { data, overallWinrate, insight } = result;

  const totalGames = data.reduce((sum, d) => sum + d.total, 0);
  const mapsWithData = data.filter((d) => d.total > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Winrate Rankings</CardTitle>
        <CardDescription>
          {insight.bestMap
            ? `${insight.bestMap} is your strongest at ${insight.bestWinrate}% — ${insight.worstMap} is your toughest at ${insight.worstWinrate}%`
            : "No map data yet"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[400px] w-full"
        >
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
                value: `Avg ${overallWinrate}%`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--muted-foreground)",
              }}
            />
            <ChartTooltip
              content={
                <CustomTooltip overallWinrate={overallWinrate} />
              }
            />
            <Bar dataKey="winrate" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {mapsWithData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.winrate >= 60
                      ? "var(--chart-win)"
                      : entry.winrate >= 50
                        ? "oklch(0.72 0.15 160)"
                        : entry.winrate >= 40
                          ? "oklch(0.72 0.15 50)"
                          : "var(--chart-loss)"
                  }
                  opacity={entry.hasEnoughData ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-muted-foreground text-xs">
          {totalGames} games across {mapsWithData.length} maps
        </p>
        <p className="text-muted-foreground text-xs flex items-center gap-1">
          <AlertTriangle className="size-3 text-amber-500" aria-hidden="true" />
          Faded bars have fewer than {MAP_DETAILED_MIN_GAMES} games
        </p>
      </CardFooter>
    </Card>
  );
}
