"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import type { CalculatedStatType } from "@prisma/client";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

type CalculatedStat = {
  stat: CalculatedStatType;
  value: number;
};

type PlayStyleIndicatorProps = {
  calculatedStats: CalculatedStat[];
};

type PlayStyleMetric = {
  attribute: string;
  value: number;
  fullMark: number;
};

function calculatePlayStyleMetrics(
  calculatedStats: CalculatedStat[]
): PlayStyleMetric[] {
  const statsMap = new Map<CalculatedStatType, number[]>();

  calculatedStats.forEach((stat) => {
    if (!statsMap.has(stat.stat)) {
      statsMap.set(stat.stat, []);
    }
    statsMap.get(stat.stat)!.push(stat.value);
  });

  const getAverage = (statType: CalculatedStatType): number => {
    const values = statsMap.get(statType);
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const firstPickPct = getAverage("FIRST_PICK_PERCENTAGE");
  const firstDeathPct = getAverage("FIRST_DEATH_PERCENTAGE");
  const fletaDeadliftPct = getAverage("FLETA_DEADLIFT_PERCENTAGE");
  const fightReversalPct = getAverage("FIGHT_REVERSAL_PERCENTAGE");
  const mvpScore = getAverage("MVP_SCORE");

  const aggression = Math.min(100, firstPickPct);

  const survivability = Math.min(100, Math.max(0, 100 - firstDeathPct));

  const impact = Math.min(100, fletaDeadliftPct);

  const clutch = Math.min(100, fightReversalPct);

  const performance = Math.min(100, (mvpScore / 15) * 100);

  return [
    {
      attribute: "Aggression",
      value: Math.round(aggression),
      fullMark: 100,
    },
    {
      attribute: "Survivability",
      value: Math.round(survivability),
      fullMark: 100,
    },
    {
      attribute: "Impact",
      value: Math.round(impact),
      fullMark: 100,
    },
    {
      attribute: "Clutch",
      value: Math.round(clutch),
      fullMark: 100,
    },
    {
      attribute: "Performance",
      value: Math.round(performance),
      fullMark: 100,
    },
  ];
}

export function PlayStyleIndicator({
  calculatedStats,
}: PlayStyleIndicatorProps) {
  const playStyleData = calculatePlayStyleMetrics(calculatedStats);

  const hasData = playStyleData.some((metric) => metric.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Play Style</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer
            className="mx-auto aspect-square h-[350px]"
            config={{
              value: {
                label: "Score",
                color: "var(--chart-2)",
              },
            }}
          >
            <RadarChart
              data={playStyleData}
              margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
              outerRadius="70%"
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="attribute" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Play Style"
                dataKey="value"
                stroke="var(--chart-2)"
                fill="var(--chart-2)"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground flex h-[350px] items-center justify-center text-sm">
            Not enough data to display play style
          </div>
        )}
        <div className="mt-4 space-y-2 text-sm">
          {playStyleData.map((metric) => (
            <div key={metric.attribute} className="flex justify-between">
              <span className="text-muted-foreground">{metric.attribute}</span>
              <span className="font-semibold">{metric.value}/100</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
