"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Star } from "lucide-react";
import type { MapDetailedResult } from "@/lib/ranked-stats";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type MapVolatilityCardProps = {
  result: MapDetailedResult;
};

const chartConfig = {
  volatility: {
    label: "Volatility",
  },
} satisfies ChartConfig;

function ConfidenceStars({ count }: { count: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span
      className="flex shrink-0 items-center gap-0.5"
      aria-label={`${count} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-2.5 ${
            i < count
              ? "fill-primary text-primary"
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
  volatility: number;
  winrate: number;
  total: number;
  confidenceStars: 1 | 2 | 3 | 4 | 5;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TooltipPayload }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const volatilityLabel =
    d.volatility >= 80
      ? "Extremely unpredictable"
      : d.volatility >= 60
        ? "Highly volatile"
        : d.volatility >= 40
          ? "Moderately volatile"
          : d.volatility >= 20
            ? "Fairly consistent"
            : "Very consistent";

  return (
    <div className="bg-background border-border rounded-lg border p-3 shadow-lg">
      <p className="text-sm font-semibold">{d.name}</p>
      <p className="text-muted-foreground mb-2 text-xs">{d.mapType}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Volatility</span>
          <span className="font-mono font-medium tabular-nums">
            {d.volatility}/100
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Assessment</span>
          <span className="font-medium">{volatilityLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Winrate</span>
          <span className="font-mono tabular-nums">{d.winrate}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Confidence</span>
          <ConfidenceStars count={d.confidenceStars} />
        </div>
        <p className="text-muted-foreground/70 mt-1 border-t pt-1">
          {d.total} game{d.total !== 1 ? "s" : ""} played
        </p>
      </div>
    </div>
  );
}

export function MapVolatilityCard({ result }: MapVolatilityCardProps) {
  const { data, insight } = result;

  const chartData = [...data]
    .filter((d) => d.total >= 2)
    .sort((a, b) => b.volatility - a.volatility)
    .slice(0, 15);

  const description = insight.mostVolatile
    ? `${insight.mostVolatile} is your most unpredictable map — results vary widely`
    : "How consistent your results are on each map";

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Map performance"
        title="Map Volatility"
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
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
            <ChartTooltip content={<CustomTooltip />} />
            <Bar dataKey="volatility" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.volatility >= 70
                      ? "var(--chart-loss)"
                      : entry.volatility >= 45
                        ? "var(--muted-foreground)"
                        : "var(--chart-win)"
                  }
                  opacity={entry.hasEnoughData ? 1 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      <p className="text-muted-foreground text-xs">
        High volatility means your results swing dramatically — these are your
        &ldquo;coin-flip&rdquo; maps
      </p>
    </section>
  );
}
