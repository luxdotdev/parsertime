"use client";

import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { FightAdvantage } from "@/data/team/ult-economy";
import type {
  UltAdvantageBucketKey,
  UltEconomyAnalysis,
} from "@/data/team/types";
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

type MapUltAdvantageCardProps = {
  timeline: FightAdvantage[];
  analysis: UltEconomyAnalysis;
  team1Name: string;
  team2Name: string;
  team1Color: string;
  team2Color: string;
};

type TooltipDatum = {
  fight: number;
  advantage: number;
  team1Bank: number;
  team2Bank: number;
  won: boolean;
};

export function MapUltAdvantageCard({
  timeline,
  analysis,
  team1Name,
  team2Name,
  team1Color,
  team2Color,
}: MapUltAdvantageCardProps) {
  const t = useTranslations("mapPage.charts.ultAdvantage");

  if (timeline.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noData")}</p>;
  }

  const data: TooltipDatum[] = timeline.map((f) => ({
    fight: f.fightNumber,
    advantage: f.advantage,
    team1Bank: f.ourBank,
    team2Bank: f.enemyBank,
    won: f.won,
  }));

  const chartConfig: ChartConfig = {
    advantage: { label: t("title") },
  };

  // perspective team is team1, so "ahead" buckets are team1 and "behind" team2.
  function bucketLabel(key: UltAdvantageBucketKey): string {
    switch (key) {
      case "ahead2":
        return t("teamAheadByMore", { team: team1Name, n: 2 });
      case "ahead1":
        return t("teamAheadBy", { team: team1Name, n: 1 });
      case "even":
        return t("even");
      case "behind1":
        return t("teamAheadBy", { team: team2Name, n: 1 });
      case "behind2":
        return t("teamAheadByMore", { team: team2Name, n: 2 });
    }
  }

  function bucketColor(key: UltAdvantageBucketKey): string {
    if (key === "ahead1" || key === "ahead2") return team1Color;
    if (key === "behind1" || key === "behind2") return team2Color;
    return "var(--muted-foreground)";
  }

  const maxBucket = Math.max(1, ...analysis.buckets.map((b) => b.fights));

  return (
    <div className="space-y-6">
      {/* Fight-by-fight advantage timeline */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span style={{ color: team1Color }}>
            {t("teamAhead", { team: team1Name })}
          </span>
          <span style={{ color: team2Color }}>
            {t("teamAhead", { team: team2Name })}
          </span>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="fight"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) => t("fight", { n: v })}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={28}
              allowDecimals={false}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as TooltipDatum;
                return (
                  <div className="border-border/50 bg-background grid min-w-[10rem] gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                    <div className="font-medium">
                      {t("fight", { n: d.fight })}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: team1Color }}
                        />
                        <span className="text-muted-foreground">
                          {team1Name}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {d.team1Bank}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: team2Color }}
                        />
                        <span className="text-muted-foreground">
                          {team2Name}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {d.team2Bank}
                      </span>
                    </div>
                    <div className="text-muted-foreground border-border/50 border-t pt-1">
                      {t("fightResult", {
                        team: d.won ? team1Name : team2Name,
                      })}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="advantage" radius={2}>
              {data.map((d) => (
                <Cell
                  key={d.fight}
                  fill={
                    d.advantage > 0
                      ? team1Color
                      : d.advantage < 0
                        ? team2Color
                        : "var(--muted-foreground)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      {/* Aggregate: fights by ult advantage for this map */}
      <div className="space-y-2.5">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("breakdownCaption")}
        </p>
        <ol className="space-y-0.5">
          {analysis.buckets.map((bucket) => (
            <li
              key={bucket.key}
              className="grid grid-cols-[minmax(7rem,11rem)_1fr] items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 sm:gap-x-4"
            >
              <span className="truncate text-sm">
                {bucketLabel(bucket.key)}
              </span>
              {bucket.fights === 0 ? (
                <span className="text-muted-foreground/60 text-xs">
                  {t("noFights")}
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full"
                    role="presentation"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(4, (bucket.fights / maxBucket) * 100)}%`,
                        backgroundColor: bucketColor(bucket.key),
                      }}
                    />
                  </div>
                  <div className="text-muted-foreground w-[6.5rem] shrink-0 text-right font-mono text-xs tabular-nums">
                    {t("fightsCount", { count: bucket.fights })}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
