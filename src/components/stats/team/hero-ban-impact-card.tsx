"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  HeroBanImpact,
  TeamBanImpactAnalysis,
} from "@/data/team-ban-impact-dto";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import { AlertTriangle, ShieldOff } from "lucide-react";
import Image from "next/image";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type HeroBanImpactCardProps = {
  analysis: TeamBanImpactAnalysis;
};

const MAX_BARS = 10;

const banRateConfig: ChartConfig = {
  banRate: {
    label: "Ban Rate",
    color: "var(--chart-1)",
  },
};

export function HeroBanImpactCard({ analysis }: HeroBanImpactCardProps) {
  const heroNames = useHeroNames();

  if (analysis.totalMapsAnalyzed === 0 || analysis.mostBanned.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hero Ban Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No hero ban data available for the selected time period.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = analysis.mostBanned.slice(0, MAX_BARS).map((impact) => ({
    hero: heroNames.get(toHero(impact.hero)) ?? impact.hero,
    rawHero: impact.hero,
    banRate: parseFloat((impact.banRate * 100).toFixed(1)),
    isWeakPoint: analysis.weakPoints.some((wp) => wp.hero === impact.hero),
    winRateDelta: impact.winRateDelta,
  }));

  const chartHeight = Math.max(200, chartData.length * 40);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Most Banned Heroes
          </CardTitle>
          <CardDescription>
            Heroes most frequently banned against your team across{" "}
            {analysis.totalMapsAnalyzed} maps. Red bars indicate ban weak points
            where your win rate drops significantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={banRateConfig}
            className="w-full"
            style={{ height: chartHeight }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 32 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="hero"
                type="category"
                tickLine={false}
                axisLine={false}
                width={120}
                tick={{ fontSize: 12 }}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, props) => {
                      const item = props.payload as {
                        isWeakPoint: boolean;
                        winRateDelta: number;
                      };
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">
                            {value}% ban rate
                          </span>
                          {item?.isWeakPoint && (
                            <span className="text-destructive text-xs">
                              Win rate drops{" "}
                              {(item.winRateDelta * 100).toFixed(1)}% when
                              banned
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="banRate" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.rawHero}
                    fill={
                      entry.isWeakPoint
                        ? "var(--color-destructive, hsl(0 72% 51%))"
                        : entry.winRateDelta > 0.05
                          ? "hsl(38 92% 50%)"
                          : "var(--color-banRate)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <LegendDot color="var(--chart-1)" label="Low impact" />
            <LegendDot color="hsl(38 92% 50%)" label="Moderate impact" />
            <LegendDot
              color="var(--color-destructive, hsl(0 72% 51%))"
              label="Weak point (win rate drops ≥15%)"
            />
          </div>
        </CardContent>
      </Card>

      <WeakPointsSection
        weakPoints={analysis.weakPoints}
        heroNames={heroNames}
      />
    </div>
  );
}

type WeakPointsSectionProps = {
  weakPoints: HeroBanImpact[];
  heroNames: Map<string, string>;
};

function WeakPointsSection({ weakPoints, heroNames }: WeakPointsSectionProps) {
  if (weakPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Ban Weak Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No significant ban-dependent weak points detected. Your team
            performs consistently regardless of hero bans.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Ban Weak Points
        </CardTitle>
        <CardDescription>
          When these heroes are banned, your team&apos;s win rate drops by 15%
          or more. Consider developing deeper hero pools or alternative
          strategies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {weakPoints.map((impact) => (
            <WeakPointRow
              key={impact.hero}
              impact={impact}
              heroNames={heroNames}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type WeakPointRowProps = {
  impact: HeroBanImpact;
  heroNames: Map<string, string>;
};

function WeakPointRow({ impact, heroNames }: WeakPointRowProps) {
  const heroSlug = toHero(impact.hero);
  const displayName = heroNames.get(heroSlug) ?? impact.hero;
  const deltaPercent = (impact.winRateDelta * 100).toFixed(1);
  const winRateWithPercent = (impact.winRateWithHero * 100).toFixed(1);
  const winRateWithoutPercent = (impact.winRateWithoutHero * 100).toFixed(1);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        "border-l-4 border-l-red-500"
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
        <Image
          src={`/heroes/${heroSlug}.png`}
          alt={displayName}
          fill
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold">{displayName}</p>
        <p className="text-muted-foreground text-xs">
          When banned, your win rate drops by{" "}
          <span className="font-semibold text-red-500">{deltaPercent}%</span>
        </p>
        <div
          className="mt-1 flex items-center gap-2 tabular-nums"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <span className="text-muted-foreground text-xs">
            Available: {winRateWithPercent}%
          </span>
          <span className="text-muted-foreground text-xs">→</span>
          <span className="text-xs font-medium text-red-500">
            Banned: {winRateWithoutPercent}%
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge className="bg-red-500 font-bold text-white">
          -{deltaPercent}%
        </Badge>
        <span className="text-muted-foreground text-xs">
          {impact.mapsBanned} ban{impact.mapsBanned !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

type LegendDotProps = {
  color: string;
  label: string;
};

function LegendDot({ color, label }: LegendDotProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
