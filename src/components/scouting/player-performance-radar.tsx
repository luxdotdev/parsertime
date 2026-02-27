"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ScoutingHeroPerformance } from "@/data/player-scouting-analytics-dto";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type PlayerPerformanceRadarProps = {
  heroes: ScoutingHeroPerformance[];
};

const STAT_LABELS: Record<string, string> = {
  eliminations: "Eliminations",
  deaths: "Deaths",
  hero_damage_dealt: "Hero Damage",
  healing_dealt: "Healing",
  damage_blocked: "Dmg Blocked",
};

const ROLE_COLORS: Record<string, string> = {
  Tank: "var(--chart-1)",
  Damage: "var(--chart-4)",
  Support: "var(--chart-2)",
};

function RadarTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    const data = payload[0];
    const item = data.payload as {
      stat: string;
      value: number;
      per10: number;
      avgPer10: number;
    };
    const zScore = item.value;
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 text-sm font-semibold">{item.stat}</p>
        <p className="text-muted-foreground">
          Z-Score:{" "}
          <span className="text-foreground font-medium tabular-nums">
            {zScore >= 0 ? "+" : ""}
            {zScore.toFixed(2)}σ
          </span>
        </p>
        <p className="text-muted-foreground tabular-nums">
          {item.per10.toFixed(0)}/10 vs avg {item.avgPer10.toFixed(0)}/10
        </p>
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            zScore > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {zScore > 0 ? "Above average" : "Below average"}
        </p>
      </div>
    );
  }
  return null;
}

export function PlayerPerformanceRadar({
  heroes,
}: PlayerPerformanceRadarProps) {
  const t = useTranslations("scoutingPage.player.analytics.performanceRadar");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedHero = heroes[selectedIndex];

  const radarData = useMemo(() => {
    if (!selectedHero) return [];
    return selectedHero.stats
      .filter((s) => {
        if (selectedHero.role === "Support" && s.stat === "damage_blocked")
          return false;
        if (selectedHero.role === "Damage" && s.stat === "damage_blocked")
          return false;
        if (selectedHero.role === "Damage" && s.stat === "healing_dealt")
          return false;
        if (selectedHero.role === "Tank" && s.stat === "healing_dealt")
          return false;
        return true;
      })
      .map((s) => ({
        stat: STAT_LABELS[s.stat] ?? s.stat,
        value: s.zScore ?? 0,
        per10: s.per10,
        avgPer10: s.heroAvgPer10,
        fullMark: 3,
      }));
  }, [selectedHero]);

  if (heroes.length === 0) {
    return null;
  }

  const fillColor = ROLE_COLORS[selectedHero?.role ?? "Damage"];

  return (
    <section aria-labelledby="performance-radar-heading">
      <Card>
        <CardHeader>
          <CardTitle id="performance-radar-heading">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {heroes.length > 1 && (
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Hero selector"
            >
              {heroes.map((hero, i) => (
                <button
                  key={hero.hero}
                  role="tab"
                  aria-selected={i === selectedIndex}
                  onClick={() => setSelectedIndex(i)}
                  className={cn(
                    "min-h-[44px] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    i === selectedIndex
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {hero.hero}
                </button>
              ))}
            </div>
          )}

          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fontSize: 11 }}
                className="tabular-nums"
              />
              <PolarRadiusAxis angle={90} domain={[-3, 3]} tick={false} />
              <Radar
                name={selectedHero?.hero ?? ""}
                dataKey="value"
                stroke={fillColor}
                fill={fillColor}
                fillOpacity={0.4}
              />
              <Tooltip content={<RadarTooltip />} />
            </RadarChart>
          </ResponsiveContainer>

          {selectedHero && (
            <div className="mt-3 text-center">
              <p className="text-muted-foreground text-sm">
                Composite:{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {selectedHero.compositeZScore >= 0 ? "+" : ""}
                  {selectedHero.compositeZScore.toFixed(2)}σ
                </span>
                <span className="text-muted-foreground ml-2 text-xs">
                  (
                  {selectedHero.compositeZScore > 0
                    ? t("aboveAverage")
                    : t("belowAverage")}
                  )
                </span>
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">{t("methodology")}</p>
        </CardFooter>
      </Card>
    </section>
  );
}
