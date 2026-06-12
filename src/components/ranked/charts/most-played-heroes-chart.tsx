"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import { MAP_TYPES, type MapType } from "@/lib/ranked-stats";
import { getMostPlayedHeroes, type MatchData } from "@/lib/ranked-stats";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type MostPlayedHeroesChartProps = {
  result: ReturnType<typeof getMostPlayedHeroes>;
  matches: MatchData[];
};

const ROLE_COLORS: Record<string, string> = {
  Tank: "var(--chart-2)",
  Damage: "var(--chart-4)",
  Support: "var(--chart-win)",
};

const chartConfig = {
  count: {
    label: "Matches",
  },
} satisfies ChartConfig;

export function MostPlayedHeroesChart({
  result: initialResult,
  matches,
}: MostPlayedHeroesChartProps) {
  const [modeFilter, setModeFilter] = useState<string>("all");

  const { data, insight } = useMemo(() => {
    if (modeFilter === "all") return initialResult;
    return getMostPlayedHeroes(matches, modeFilter as MapType);
  }, [modeFilter, matches, initialResult]);

  const filterLabel =
    modeFilter === "all" ? "across all modes" : `in ${modeFilter}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who do you play most?</CardTitle>
        <CardDescription>
          {insight.topHero
            ? `${insight.topHero} is your go-to ${filterLabel} with ${insight.topCount} games`
            : "Play more matches to see hero stats"}
        </CardDescription>
        <CardAction>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger size="sm" aria-label="Filter by game mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              {MAP_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 60 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hero"
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
                  formatter={(value, _name, item) => {
                    const payload = item.payload as typeof data[number];
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Matches</span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Role: {payload.role}
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.hero}
                  fill={ROLE_COLORS[entry.role] ?? "var(--chart-3)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-3">
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <div key={role} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{role}</span>
          </div>
        ))}
      </CardFooter>
    </Card>
  );
}
