"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { SwapTimingBucket, TeamHeroSwapStats } from "@/data/team/types";
import { cn, toHero } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type SwapPairsCardProps = {
  swapStats: TeamHeroSwapStats;
};

const HERO_IMAGE_SIZE = 20;
const Y_AXIS_WIDTH = 220;

function renderSwapPairTick(props: {
  x: number;
  y: number;
  payload: { value: string };
}) {
  const [fromHero, toHero_] = props.payload.value.split(" → ");
  const fromSlug = toHero(fromHero);
  const toSlug = toHero(toHero_);

  return (
    <g transform={`translate(${props.x},${props.y})`}>
      <image
        x={-Y_AXIS_WIDTH}
        y={-HERO_IMAGE_SIZE / 2}
        width={HERO_IMAGE_SIZE}
        height={HERO_IMAGE_SIZE}
        href={`/heroes/${fromSlug}.png`}
        clipPath="inset(0% round 3px)"
      />
      <text
        x={-Y_AXIS_WIDTH + HERO_IMAGE_SIZE + 4}
        y={0}
        dy={4}
        textAnchor="start"
        className="text-xs"
        style={{ fill: "var(--color-muted-foreground)" }}
      >
        {fromHero}
      </text>
      <text
        x={-Y_AXIS_WIDTH + HERO_IMAGE_SIZE + 4 + fromHero.length * 6.5 + 4}
        y={0}
        dy={4}
        textAnchor="start"
        className="text-xs"
        style={{ fill: "var(--color-muted-foreground)", opacity: 0.6 }}
      >
        →
      </text>
      <image
        x={-Y_AXIS_WIDTH + HERO_IMAGE_SIZE + 4 + fromHero.length * 6.5 + 4 + 14}
        y={-HERO_IMAGE_SIZE / 2}
        width={HERO_IMAGE_SIZE}
        height={HERO_IMAGE_SIZE}
        href={`/heroes/${toSlug}.png`}
        clipPath="inset(0% round 3px)"
      />
      <text
        x={
          -Y_AXIS_WIDTH +
          HERO_IMAGE_SIZE +
          4 +
          fromHero.length * 6.5 +
          4 +
          14 +
          HERO_IMAGE_SIZE +
          4
        }
        y={0}
        dy={4}
        textAnchor="start"
        className="text-xs"
        style={{ fill: "var(--color-muted-foreground)" }}
      >
        {toHero_}
      </text>
    </g>
  );
}

const chartConfig: ChartConfig = {
  count: {
    label: "Times",
    color: "var(--chart-2)",
  },
};

function MiniTimingChart({ buckets }: { buckets: SwapTimingBucket[] }) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="flex items-end gap-px" style={{ height: 40, width: 120 }}>
      {buckets.map((bucket) => {
        const heightPct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
        return (
          <div
            key={bucket.bucket}
            className="flex flex-1 flex-col items-center justify-end"
            style={{ height: "100%" }}
          >
            <div
              className={cn(
                "w-full rounded-t-[1px]",
                bucket.count > 0
                  ? "bg-[var(--chart-1)]"
                  : "bg-muted-foreground/20"
              )}
              style={{
                height: `${Math.max(heightPct, bucket.count > 0 ? 8 : 2)}%`,
                minHeight: bucket.count > 0 ? 3 : 1,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function SwapPairTooltip({
  active,
  payload,
  timingByPair,
}: {
  active?: boolean;
  payload?: {
    payload: { pair: string; count: number };
  }[];
  timingByPair: Map<string, SwapTimingBucket[]>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const timing = timingByPair.get(data.pair);
  const hasTimingData = timing?.some((b) => b.count > 0);

  return (
    <div className="bg-background border-border min-w-[160px] rounded-lg border px-3 py-2 shadow-md">
      <p className="text-foreground mb-1 text-sm font-semibold">{data.pair}</p>
      <p className="text-muted-foreground text-xs tabular-nums">
        {data.count} {data.count === 1 ? "time" : "times"}
      </p>
      {timing && hasTimingData && (
        <div className="mt-2 border-t pt-2">
          <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wide uppercase">
            When in match
          </p>
          <MiniTimingChart buckets={timing} />
          <div className="text-muted-foreground mt-1 flex justify-between text-[9px] tabular-nums">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function SwapPairsCard({ swapStats }: SwapPairsCardProps) {
  const t = useTranslations("teamStatsPage.swapsTab.pairs");

  if (swapStats.topSwapPairs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = swapStats.topSwapPairs.map((pair) => ({
    pair: `${pair.fromHero} → ${pair.toHero}`,
    count: pair.count,
  }));

  const timingByPair = new Map<string, SwapTimingBucket[]>();
  for (const pair of swapStats.topSwapPairs) {
    timingByPair.set(
      `${pair.fromHero} → ${pair.toHero}`,
      pair.timingDistribution
    );
  }

  const chartHeight = Math.max(200, chartData.length * 44);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: chartHeight }}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="pair"
              type="category"
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_WIDTH}
              tick={renderSwapPairTick}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <ChartTooltip
              content={<SwapPairTooltip timingByPair={timingByPair} />}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
