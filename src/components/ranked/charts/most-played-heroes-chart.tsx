"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/stats/team/section-header";
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
  const t = useTranslations("ranked.charts.mostPlayedHeroes");
  const [modeFilter, setModeFilter] = useState<string>("all");

  const { data, insight } = useMemo(() => {
    if (modeFilter === "all") return initialResult;
    return getMostPlayedHeroes(matches, modeFilter as MapType);
  }, [modeFilter, matches, initialResult]);

  const description = insight.topHero
    ? modeFilter === "all"
      ? t("descriptionAllModes", {
          hero: insight.topHero,
          count: insight.topCount,
        })
      : t("descriptionMode", {
          hero: insight.topHero,
          mode: modeFilter,
          count: insight.topCount,
        })
    : t("descriptionEmpty");

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
        rightSlot={
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger size="sm" aria-label={t("filterAriaLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allModes")}</SelectItem>
              {MAP_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
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
                          <span className="text-muted-foreground">{t("matches")}</span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {t("roleLabel", { role: payload.role })}
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
      <div className="flex flex-wrap justify-center gap-3">
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <div key={role} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{t(`roles.${role}`)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
