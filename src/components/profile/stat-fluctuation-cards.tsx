"use client";

import type { Timeframe } from "@/components/stats/player/range-picker";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { CalculatedStatType } from "@prisma/client";
import { ChartBar } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, XAxis } from "recharts";

type CalculatedStat = {
  id: number;
  stat: CalculatedStatType;
  value: number;
  createdAt: Date;
  playerName: string;
  hero: string;
};

type StatFluctuationCardsProps = {
  calculatedStats: CalculatedStat[];
  className?: string;
  timeframe: Timeframe;
};

type StatConfig = {
  name: string;
  label: string;
  formatValue: (value: number) => string;
  color: string;
  aggregation: "sum" | "average";
};

const STAT_ORDER: CalculatedStatType[] = [
  "MVP_SCORE",
  "MAP_MVP_COUNT",
  "FLETA_DEADLIFT_PERCENTAGE",
  "FIRST_PICK_PERCENTAGE",
  "FIRST_PICK_COUNT",
  "FIRST_DEATH_PERCENTAGE",
  "FIRST_DEATH_COUNT",
  "FIGHT_REVERSAL_PERCENTAGE",
  "AVERAGE_DROUGHT_TIME",
  "AVERAGE_ULT_CHARGE_TIME",
  "AVERAGE_TIME_TO_USE_ULT",
  "KILLS_PER_ULTIMATE",
  "AJAX_COUNT",
];

const STAT_CONFIGS: Record<string, StatConfig> = {
  MVP_SCORE: {
    name: "MVP_SCORE",
    label: "MVP Score",
    formatValue: (value) => value.toFixed(1),
    color: "hsl(217.2 91.2% 59.8%)",
    aggregation: "average",
  },
  MAP_MVP_COUNT: {
    name: "MAP_MVP_COUNT",
    label: "Total Map MVPs",
    formatValue: (value) => value.toFixed(0),
    color: "hsl(217.2 91.2% 59.8%)",
    aggregation: "sum",
  },
  FLETA_DEADLIFT_PERCENTAGE: {
    name: "FLETA_DEADLIFT_PERCENTAGE",
    label: "Fleta Deadlift %",
    formatValue: (value) => `${value.toFixed(1)}%`,
    color: "hsl(142.1 76.2% 36.3%)",
    aggregation: "average",
  },
  FIRST_PICK_PERCENTAGE: {
    name: "FIRST_PICK_PERCENTAGE",
    label: "First Pick %",
    formatValue: (value) => `${value.toFixed(1)}%`,
    color: "hsl(142.1 76.2% 36.3%)",
    aggregation: "average",
  },
  FIRST_PICK_COUNT: {
    name: "FIRST_PICK_COUNT",
    label: "Total First Picks",
    formatValue: (value) => value.toFixed(0),
    color: "hsl(142.1 76.2% 36.3%)",
    aggregation: "sum",
  },
  FIRST_DEATH_PERCENTAGE: {
    name: "FIRST_DEATH_PERCENTAGE",
    label: "First Death %",
    formatValue: (value) => `${value.toFixed(1)}%`,
    color: "hsl(0 72.2% 50.6%)",
    aggregation: "average",
  },
  FIRST_DEATH_COUNT: {
    name: "FIRST_DEATH_COUNT",
    label: "Total First Deaths",
    formatValue: (value) => value.toFixed(0),
    color: "hsl(0 72.2% 50.6%)",
    aggregation: "sum",
  },
  FIGHT_REVERSAL_PERCENTAGE: {
    name: "FIGHT_REVERSAL_PERCENTAGE",
    label: "Fight Reversal %",
    formatValue: (value) => `${value.toFixed(1)}%`,
    color: "hsl(142.1 76.2% 36.3%)",
    aggregation: "average",
  },
  AVERAGE_DROUGHT_TIME: {
    name: "AVERAGE_DROUGHT_TIME",
    label: "Drought Time",
    formatValue: (value) => `${value.toFixed(1)}s`,
    color: "hsl(0 72.2% 50.6%)",
    aggregation: "average",
  },
  AVERAGE_ULT_CHARGE_TIME: {
    name: "AVERAGE_ULT_CHARGE_TIME",
    label: "Avg Ult Charge Time",
    formatValue: (value) => `${value.toFixed(1)}s`,
    color: "hsl(217.2 91.2% 59.8%)",
    aggregation: "average",
  },
  AVERAGE_TIME_TO_USE_ULT: {
    name: "AVERAGE_TIME_TO_USE_ULT",
    label: "Avg Time to Use Ult",
    formatValue: (value) => `${value.toFixed(1)}s`,
    color: "hsl(217.2 91.2% 59.8%)",
    aggregation: "average",
  },
  KILLS_PER_ULTIMATE: {
    name: "KILLS_PER_ULTIMATE",
    label: "Kills per Ultimate",
    formatValue: (value) => value.toFixed(2),
    color: "hsl(142.1 76.2% 36.3%)",
    aggregation: "average",
  },
  AJAX_COUNT: {
    name: "AJAX_COUNT",
    label: "Ajax Count",
    formatValue: (value) => value.toFixed(1),
    color: "hsl(217.2 91.2% 59.8%)",
    aggregation: "sum",
  },
};

function sanitizeName(name: string) {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .toLowerCase();
}

function groupStatsByType(stats: CalculatedStat[]) {
  const grouped = new Map<CalculatedStatType, CalculatedStat[]>();

  for (const stat of stats) {
    if (!grouped.has(stat.stat)) {
      grouped.set(stat.stat, []);
    }
    grouped.get(stat.stat)!.push(stat);
  }

  return grouped;
}

function prepareChartData(stats: CalculatedStat[], statName: string) {
  const sorted = [...stats].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return sorted.map((stat) => ({
    date: new Date(stat.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    [statName]: stat.value,
  }));
}

function calculateChange(stats: CalculatedStat[]) {
  if (stats.length < 2) return { change: 0, percentageChange: 0 };

  const sorted = [...stats].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const oldest = sorted[0].value;
  const newest = sorted[sorted.length - 1].value;
  const change = newest - oldest;
  const percentageChange = oldest !== 0 ? (change / oldest) * 100 : 0;

  return { change, percentageChange };
}

const TIMEFRAME_MAP: Record<Timeframe, number> = {
  "one-week": 1,
  "two-weeks": 2,
  "one-month": 1,
  "three-months": 3,
  "six-months": 6,
  "one-year": 12,
  "all-time": 0,
  custom: 0,
};

export function StatFluctuationCards({
  calculatedStats,
  className,
  timeframe,
}: StatFluctuationCardsProps) {
  const timeframeAgo = new Date();

  if (
    timeframe !== "all-time" &&
    timeframe !== "one-week" &&
    timeframe !== "two-weeks"
  ) {
    timeframeAgo.setMonth(timeframeAgo.getMonth() - TIMEFRAME_MAP[timeframe]);
  } else if (timeframe === "one-week") {
    timeframeAgo.setDate(timeframeAgo.getDate() - 7);
  } else if (timeframe === "two-weeks") {
    timeframeAgo.setDate(timeframeAgo.getDate() - 14);
  }

  const recentStats = calculatedStats.filter(
    (stat) =>
      new Date(stat.createdAt) >= timeframeAgo && timeframe !== "all-time"
  );

  const groupedStats = groupStatsByType(
    timeframe === "all-time" ? calculatedStats : recentStats
  );
  const summary = Array.from(groupedStats.entries())
    .filter(([statType]) => STAT_CONFIGS[statType])
    .map(([statType, stats]) => {
      const config = STAT_CONFIGS[statType];

      const calculatedValue =
        config.aggregation === "sum"
          ? stats.reduce((sum, stat) => sum + stat.value, 0)
          : stats.reduce((sum, stat) => sum + stat.value, 0) / stats.length;

      const { change, percentageChange } = calculateChange(stats);
      const changeType = change >= 0 ? "positive" : "negative";

      return {
        name: config.label,
        statType,
        value: config.formatValue(calculatedValue),
        change: config.formatValue(Math.abs(change)),
        percentageChange: `${percentageChange >= 0 ? "+" : ""}${percentageChange.toFixed(1)}%`,
        changeType,
        color: config.color,
        data: prepareChartData(stats, config.label),
        aggregation: config.aggregation,
      };
    })
    .sort((a, b) => {
      const indexA = STAT_ORDER.indexOf(a.statType);
      const indexB = STAT_ORDER.indexOf(b.statType);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  if (summary.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartBar />
          </EmptyMedia>
          <EmptyTitle>No data available</EmptyTitle>
          <EmptyDescription>
            No data available for this player in the selected timeframe.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn("flex w-full items-center justify-center", className)}>
      <dl className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((item) => {
          const sanitizedName = sanitizeName(item.name);
          const gradientId = `gradient-${sanitizedName}`;

          const isGoodStat =
            !item.statType.includes("DEATH") &&
            !item.statType.includes("DROUGHT");
          const displayChangeType = isGoodStat
            ? item.changeType
            : item.changeType === "positive"
              ? "negative"
              : "positive";

          const color =
            displayChangeType === "positive"
              ? "hsl(142.1 76.2% 36.3%)"
              : "hsl(0 72.2% 50.6%)";

          return (
            <Card key={item.name} className="p-0">
              <CardContent className="p-4 pb-0">
                <div>
                  <dt className="text-foreground text-sm font-medium">
                    {item.name}
                  </dt>
                  <div className="flex items-baseline justify-between">
                    <dd className="text-lg font-semibold">{item.value}</dd>
                    <dd className="flex items-center space-x-1 text-sm">
                      <span className="text-foreground font-medium">
                        {item.change}
                      </span>
                      <span
                        className={cn(
                          displayChangeType === "positive"
                            ? "text-green-600 dark:text-green-500"
                            : "text-red-600 dark:text-red-500"
                        )}
                      >
                        ({item.percentageChange})
                      </span>
                    </dd>
                  </div>
                </div>

                <div className="mt-2 h-16 overflow-hidden">
                  <ChartContainer
                    className="h-full w-full"
                    config={{
                      [item.name]: {
                        label: item.name,
                        color,
                      },
                    }}
                  >
                    {item.aggregation === "sum" ? (
                      <BarChart data={item.data}>
                        <XAxis dataKey="date" hide={true} />
                        <Bar
                          dataKey={item.name}
                          fill={color}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart data={item.data}>
                        <defs>
                          <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={color}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor={color}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide={true} />
                        <Area
                          dataKey={item.name}
                          stroke={color}
                          fill={`url(#${gradientId})`}
                          fillOpacity={0.4}
                          strokeWidth={1.5}
                          type="monotone"
                        />
                      </AreaChart>
                    )}
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </dl>
    </div>
  );
}
