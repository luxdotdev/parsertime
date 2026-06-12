"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MapTimelineResult } from "@/lib/ranked-stats";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type MapTimelineCardProps = {
  result: MapTimelineResult;
};

const chartConfig = {
  winrate: {
    label: "Cumulative winrate",
    color: "var(--chart-win)",
  },
} satisfies ChartConfig;

function ResultBadge({
  result,
  index,
}: {
  result: "win" | "loss" | "draw";
  index: number;
}) {
  const colors = {
    win: "bg-emerald-500 text-white",
    loss: "bg-red-500 text-white",
    draw: "bg-muted text-muted-foreground",
  } as const;

  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-[10px] font-bold ${colors[result]}`}
      title={`Game ${index + 1}: ${result}`}
      aria-label={`Game ${index + 1}: ${result}`}
    >
      {result === "win" ? "W" : result === "loss" ? "L" : "D"}
    </div>
  );
}

export function MapTimelineCard({ result }: MapTimelineCardProps) {
  const { maps } = result;

  const [selectedMap, setSelectedMap] = useState<string>(
    maps[0]?.map ?? ""
  );

  if (maps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Win/Loss Timeline</CardTitle>
          <CardDescription>
            Track your recent performance on each map
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            No map data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const mapData = maps.find((m) => m.map === selectedMap) ?? maps[0];

  if (!mapData) return null;

  const { history, lastPlayedDaysAgo, rotationGapDays } = mapData;

  const sparklineData = history.map((entry, i) => {
    const slice = history.slice(0, i + 1);
    const wins = slice.filter((e) => e.result === "win").length;
    const winrate = Math.round((wins / slice.length) * 100);
    return {
      game: i + 1,
      winrate,
    };
  });

  const totalWins = history.filter((e) => e.result === "win").length;
  const totalGames = history.length;
  const overallWinrate =
    totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Win/Loss Timeline</CardTitle>
            <CardDescription>
              Last {history.length} game{history.length !== 1 ? "s" : ""} on{" "}
              {mapData.map}
              {lastPlayedDaysAgo !== null && (
                <>
                  {" "}
                  &mdash;{" "}
                  {lastPlayedDaysAgo === 0
                    ? "played today"
                    : lastPlayedDaysAgo === 1
                      ? "played yesterday"
                      : `last played ${lastPlayedDaysAgo} days ago`}
                </>
              )}
            </CardDescription>
          </div>
          <Select value={selectedMap} onValueChange={setSelectedMap}>
            <SelectTrigger
              className="w-[180px] shrink-0"
              aria-label="Select map"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {maps.map((m) => (
                <SelectItem key={m.map} value={m.map}>
                  {m.map}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Result icon row */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Recent results (oldest → newest)
          </p>
          <div
            className="flex flex-wrap gap-1"
            role="list"
            aria-label={`Recent results on ${mapData.map}`}
          >
            {[...history].reverse().map((entry, i) => (
              <div key={entry.playedAt.toISOString()} role="listitem">
                <ResultBadge result={entry.result} index={history.length - 1 - i} />
              </div>
            ))}
          </div>
        </div>

        {/* Cumulative winrate sparkline */}
        {sparklineData.length >= 2 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              Cumulative winrate over time
            </p>
            <ChartContainer config={chartConfig} className="h-[120px] w-full">
              <AreaChart
                data={sparklineData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="winrateGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--chart-win)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-win)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis
                  dataKey="game"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(v) => `G${v}`}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-mono tabular-nums">
                          {value}% winrate
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="winrate"
                  stroke="var(--color-winrate)"
                  strokeWidth={2}
                  fill="url(#winrateGradient)"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {overallWinrate}%
            </p>
            <p className="text-muted-foreground text-xs">Overall</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {totalGames}
            </p>
            <p className="text-muted-foreground text-xs">Games tracked</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {rotationGapDays !== null ? `${rotationGapDays}d` : "—"}
            </p>
            <p className="text-muted-foreground text-xs">Avg gap</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
