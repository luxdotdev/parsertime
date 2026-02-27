"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { CompetitiveMapWinrates } from "@/data/player-scouting-analytics-dto";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type PlayerMapWinratesProps = {
  competitiveMapWinrates: CompetitiveMapWinrates;
};

export function PlayerMapWinrates({
  competitiveMapWinrates,
}: PlayerMapWinratesProps) {
  const t = useTranslations("scoutingPage.player.analytics.mapWinrates");

  const mapTypeData = competitiveMapWinrates.byMapType.map((entry) => ({
    mode: entry.mapType,
    winRate: Math.round(entry.winRate * 10) / 10,
    played: entry.played,
  }));

  const chartConfig: ChartConfig = {
    winRate: {
      label: t("byMapType"),
      color: "var(--chart-1)",
    },
  };

  const hasMapTypeData = mapTypeData.length > 0;
  const hasMapData = competitiveMapWinrates.byMap.length > 0;

  if (!hasMapTypeData && !hasMapData) {
    return null;
  }

  return (
    <section aria-labelledby="map-winrates-heading" className="space-y-4">
      {hasMapTypeData && (
        <Card>
          <CardHeader>
            <CardTitle id="map-winrates-heading">{t("byMapType")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={mapTypeData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="mode"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value)}%`}
                    />
                  }
                />
                <Bar
                  dataKey="winRate"
                  fill="var(--color-winRate)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              {t("methodologyMapType")}
            </p>
          </CardFooter>
        </Card>
      )}

      {hasMapData && (
        <Card>
          <CardHeader>
            <CardTitle>{t("byMap")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {competitiveMapWinrates.byMap.map((map) => (
                <MapCard key={map.mapName} map={map} />
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              {t("methodologyByMap")}
            </p>
          </CardFooter>
        </Card>
      )}
    </section>
  );
}

function MapCard({ map }: { map: CompetitiveMapWinrates["byMap"][number] }) {
  const t = useTranslations("scoutingPage.player.analytics.mapWinrates");
  const wr = map.winRate;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        wr >= 60
          ? "border-emerald-500/30 bg-emerald-500/5"
          : wr <= 40
            ? "border-red-500/30 bg-red-500/5"
            : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{map.mapName}</span>
        <Badge
          variant={wr >= 50 ? "default" : "destructive"}
          className="tabular-nums"
        >
          {wr.toFixed(0)}%
        </Badge>
      </div>
      <div className="text-muted-foreground mt-1 flex gap-3 text-xs tabular-nums">
        <span>
          {t("played")}: {map.played}
        </span>
        <span>
          {t("won")}: {map.wins}
        </span>
      </div>
    </div>
  );
}
