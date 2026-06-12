"use client";

import { ChartContainer } from "@/components/ui/chart";
import type { CalculatedStatType } from "@/generated/prisma/browser";
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

  function getAverage(statType: CalculatedStatType) {
    const values = statsMap.get(statType);
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  const firstPickPct = getAverage("FIRST_PICK_PERCENTAGE");
  const firstDeathPct = getAverage("FIRST_DEATH_PERCENTAGE");
  const fletaDeadliftPct = getAverage("FLETA_DEADLIFT_PERCENTAGE");
  const fightReversalPct = getAverage("FIGHT_REVERSAL_PERCENTAGE");
  const mvpScore = getAverage("MVP_SCORE");

  const aggression = Math.min(100, firstPickPct);

  const survivability = Math.min(100, Math.max(0, 100 - firstDeathPct));

  const impact = Math.min(100, fletaDeadliftPct);

  const clutch = Math.min(100, fightReversalPct);

  // If the player has a negative MVP score, set it to 0
  const performance = Math.min(100, (Math.max(0, mvpScore) / 15) * 100);

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
    <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="bg-card flex flex-col px-5 py-5">
        <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          Radar
        </h3>
        {hasData ? (
          <ChartContainer
            className="mx-auto mt-2 aspect-square h-[320px] w-full"
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
                fillOpacity={0.55}
              />
            </RadarChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground flex h-[320px] items-center justify-center text-sm">
            Not enough data to display play style
          </div>
        )}
      </div>
      <div className="bg-card flex flex-col px-5 py-5">
        <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          Scores
        </h3>
        <ul className="mt-4 flex flex-col divide-y divide-[var(--border)]">
          {playStyleData.map((metric) => (
            <li
              key={metric.attribute}
              className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-sm">{metric.attribute}</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {metric.value}
                <span className="text-muted-foreground/70">/100</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
