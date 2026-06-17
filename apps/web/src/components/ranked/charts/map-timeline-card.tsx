"use client";

import { useState } from "react";
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
import type { MapTimelineResult } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type MapTimelineCardProps = {
  result: MapTimelineResult;
};

function ResultBadge({
  result,
  index,
  t,
}: {
  result: "win" | "loss" | "draw";
  index: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const colors = {
    win: "bg-primary text-primary-foreground",
    loss: "bg-destructive text-white",
    draw: "bg-muted text-muted-foreground",
  } as const;

  const resultLabel = t(`result.${result}`);

  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-[10px] font-bold ${colors[result]}`}
      title={t("badgeTitle", { index: index + 1, result: resultLabel })}
      aria-label={t("badgeTitle", { index: index + 1, result: resultLabel })}
    >
      {result === "win"
        ? t("resultShort.win")
        : result === "loss"
          ? t("resultShort.loss")
          : t("resultShort.draw")}
    </div>
  );
}

export function MapTimelineCard({ result }: MapTimelineCardProps) {
  const t = useTranslations("ranked.charts.mapTimeline");
  const { maps } = result;

  const chartConfig = {
    winrate: {
      label: t("legendCumulative"),
      color: "var(--chart-win)",
    },
  } satisfies ChartConfig;

  const [selectedMap, setSelectedMap] = useState<string>(maps[0]?.map ?? "");

  if (maps.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("emptyDescription")}
        />
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("emptyState")}
        </p>
      </section>
    );
  }

  const mapData = maps.find((m) => m.map === selectedMap) ?? maps[0];

  if (!mapData) return null;

  const { history, lastPlayedDaysAgo, rotationGapDays } = mapData;

  const sparklineData = history.map((entry, i) => {
    const slice = history.slice(0, i + 1);
    const wins = slice.filter((e) => e.result === "win").length;
    const winrate = Math.round((wins / slice.length) * 100);
    return {
      game: i + 1,
      winrate,
    };
  });

  const totalWins = history.filter((e) => e.result === "win").length;
  const totalGames = history.length;
  const overallWinrate =
    totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const lastPlayedText =
    lastPlayedDaysAgo === null
      ? ""
      : lastPlayedDaysAgo === 0
        ? ` — ${t("lastPlayedToday")}`
        : lastPlayedDaysAgo === 1
          ? ` — ${t("lastPlayedYesterday")}`
          : ` — ${t("lastPlayedDaysAgo", { days: lastPlayedDaysAgo })}`;

  const description = `${t("description", {
    count: history.length,
    map: mapData.map,
  })}${lastPlayedText}`;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Map mastery"
        title="Win/Loss Timeline"
        description={description}
        rightSlot={
          <Select value={selectedMap} onValueChange={setSelectedMap}>
            <SelectTrigger
              className="w-[180px] shrink-0"
              aria-label={t("selectMap")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {maps.map((m) => (
                <SelectItem key={m.map} value={m.map}>
                  {m.map}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="space-y-4">
        {/* Result icon row */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            {t("recentResults")}
          </p>
          <div
            className="flex flex-wrap gap-1"
            role="list"
            aria-label={t("recentResultsAria", { map: mapData.map })}
          >
            {[...history].reverse().map((entry, i) => (
              <div key={entry.playedAt.toISOString()} role="listitem">
                <ResultBadge
                  result={entry.result}
                  index={history.length - 1 - i}
                  t={t}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Cumulative winrate sparkline */}
        {sparklineData.length >= 2 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              {t("cumulativeWinrate")}
            </p>
            <ChartContainer config={chartConfig} className="h-[120px] w-full">
              <AreaChart
                data={sparklineData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="winrateGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--chart-win)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-win)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis
                  dataKey="game"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(v) => `G${v}`}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-mono tabular-nums">
                          {t("tooltipWinrate", { value: Number(value) })}
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="winrate"
                  stroke="var(--color-winrate)"
                  strokeWidth={2}
                  fill="url(#winrateGradient)"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {overallWinrate}%
            </p>
            <p className="text-muted-foreground text-xs">{t("statOverall")}</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {totalGames}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("statGamesTracked")}
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {rotationGapDays !== null ? `${rotationGapDays}d` : "—"}
            </p>
            <p className="text-muted-foreground text-xs">{t("statAvgGap")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
