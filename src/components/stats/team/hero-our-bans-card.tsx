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
  OurBanImpact,
  TeamOurBanAnalysis,
} from "@/data/team/types";
import { cn, toHero, useHeroNames } from "@/lib/utils";
import { Swords, TrendingUp } from "lucide-react";
import Image from "next/image";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type HeroOurBansCardProps = {
  outgoing: TeamOurBanAnalysis;
};

const MAX_BARS = 10;

const ourBanConfig: ChartConfig = {
  banRate: {
    label: "Ban Rate",
    color: "var(--chart-2)",
  },
};

export function HeroOurBansCard({ outgoing }: HeroOurBansCardProps) {
  const heroNames = useHeroNames();

  if (
    outgoing.totalMapsAnalyzed === 0 ||
    outgoing.mostBannedByUs.length === 0
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Our Ban Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No outgoing ban data available for the selected time period.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = outgoing.mostBannedByUs
    .slice(0, MAX_BARS)
    .map((impact) => ({
      hero: heroNames.get(toHero(impact.hero)) ?? impact.hero,
      rawHero: impact.hero,
      banRate: parseFloat((impact.banRate * 100).toFixed(1)),
      isStrongBan: outgoing.strongBans.some((sb) => sb.hero === impact.hero),
      winRateDelta: impact.winRateDelta,
    }));

  const chartHeight = Math.max(200, chartData.length * 40);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Our Ban Strategy
          </CardTitle>
          <CardDescription>
            Heroes your team bans most frequently across{" "}
            {outgoing.totalMapsAnalyzed} maps. Green bars indicate effective
            bans where your win rate is higher when you ban that hero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={ourBanConfig}
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
                        isStrongBan: boolean;
                        winRateDelta: number;
                      };
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">
                            {value}% ban rate
                          </span>
                          {item?.isStrongBan && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Win rate up {(item.winRateDelta * 100).toFixed(1)}
                              % when banned
                            </span>
                          )}
                          {!item?.isStrongBan && item?.winRateDelta < 0 && (
                            <span className="text-muted-foreground text-xs">
                              Win rate {(item.winRateDelta * 100).toFixed(1)}%
                              when banned
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
                      entry.isStrongBan
                        ? "hsl(142 71% 45%)"
                        : entry.winRateDelta < -0.05
                          ? "var(--color-destructive, hsl(0 72% 51%))"
                          : "var(--color-banRate)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <LegendDot color="var(--chart-2)" label="Neutral impact" />
            <LegendDot
              color="hsl(142 71% 45%)"
              label="Strong ban (win rate improves ≥10%)"
            />
            <LegendDot
              color="var(--color-destructive, hsl(0 72% 51%))"
              label="Questionable ban (win rate drops)"
            />
          </div>
        </CardContent>
      </Card>

      <StrongBansSection
        strongBans={outgoing.strongBans}
        heroNames={heroNames}
      />
    </div>
  );
}

type StrongBansSectionProps = {
  strongBans: OurBanImpact[];
  heroNames: Map<string, string>;
};

function StrongBansSection({ strongBans, heroNames }: StrongBansSectionProps) {
  if (strongBans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            High-Value Bans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No consistently effective bans detected yet. Keep playing to uncover
            which hero removals most improve your win rate.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          High-Value Bans
        </CardTitle>
        <CardDescription>
          When your team bans these heroes, your win rate improves by 10% or
          more. These represent your most impactful ban choices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {strongBans.map((impact) => (
            <StrongBanRow
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

type StrongBanRowProps = {
  impact: OurBanImpact;
  heroNames: Map<string, string>;
};

function StrongBanRow({ impact, heroNames }: StrongBanRowProps) {
  const heroSlug = toHero(impact.hero);
  const displayName = heroNames.get(heroSlug) ?? impact.hero;
  const deltaPercent = (impact.winRateDelta * 100).toFixed(1);
  const winRateWhenBannedPercent = (impact.winRateWhenBanned * 100).toFixed(1);
  const winRateWhenNotBannedPercent = (
    impact.winRateWhenNotBanned * 100
  ).toFixed(1);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        "border-l-4 border-l-green-500"
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
          When you ban this hero, win rate improves by{" "}
          <span className="font-semibold text-green-600 dark:text-green-400">
            +{deltaPercent}%
          </span>
        </p>
        <div
          className="mt-1 flex items-center gap-2"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <span className="text-muted-foreground text-xs">
            Without ban: {winRateWhenNotBannedPercent}%
          </span>
          <span className="text-muted-foreground text-xs">→</span>
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            With ban: {winRateWhenBannedPercent}%
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge className="bg-green-500 font-bold text-white">
          +{deltaPercent}%
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
