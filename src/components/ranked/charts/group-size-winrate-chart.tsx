"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  GROUP_SIZE_MIN_MATCHES,
  type GroupSizeEntry,
  type GroupSizeResult,
} from "@/lib/ranked-stats";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type GroupSizeWinrateChartProps = {
  result: GroupSizeResult;
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

function buildDescription(
  insight: GroupSizeResult["insight"],
  data: GroupSizeEntry[]
): string {
  if (!insight.hasEnoughData) {
    return "Play more matches across different group sizes to see your trends";
  }

  const optimalGames = data.find((e) => e.groupSize === insight.optimalSize);
  const base = `You win ${insight.optimalWinrate}% as ${insight.optimalLabel} \u2014 your best group configuration`;
  const withCount = optimalGames
    ? `${base} with ${optimalGames.total} games`
    : base;

  if (
    insight.soloWinrate !== null &&
    insight.optimalSize !== 1 &&
    insight.optimalWinrate > insight.soloWinrate
  ) {
    const diff = Math.round(
      (insight.optimalWinrate - insight.soloWinrate) * 10
    ) / 10;
    return `${withCount} (+${diff}% vs. solo)`;
  }

  return withCount;
}

export function GroupSizeWinrateChart({ result }: GroupSizeWinrateChartProps) {
  const { data, insight } = result;

  const qualifiedData = data.filter((e) => e.total >= GROUP_SIZE_MIN_MATCHES);

  if (qualifiedData.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Group size"
          title="Better together?"
          description="Play more matches across different group sizes to see your trends"
        />
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-muted-foreground text-sm">No data yet</p>
        </div>
      </section>
    );
  }

  const description = buildDescription(insight, data);

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Group size"
        title="Better together?"
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={qualifiedData}
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
                    const payload = item.payload as GroupSizeEntry;
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Winrate</span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {payload.wins}W / {payload.losses}L &middot;{" "}
                          {payload.total} games
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Bar dataKey="winrate" radius={[4, 4, 0, 0]}>
              {qualifiedData.map((entry) => (
                <Cell
                  key={entry.groupSize}
                  fill={winrateColor(entry.winrate)}
                  opacity={
                    entry.groupSize === insight.optimalSize ? 1 : 0.75
                  }
                />
              ))}
            </Bar>
          </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">
        Minimum {GROUP_SIZE_MIN_MATCHES} games required per group size &middot;
        showing {qualifiedData.length} sizes
      </p>
    </section>
  );
}
