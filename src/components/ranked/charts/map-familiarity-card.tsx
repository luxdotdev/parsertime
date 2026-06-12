"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MapFamiliarityResult } from "@/lib/ranked-stats";
import { AlertTriangle, Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type MapFamiliarityCardProps = {
  result: MapFamiliarityResult;
};

const chartConfig = {
  gamesPlayed: {
    label: "Games played",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function VarietyMeter({ score }: { score: number }) {
  const label =
    score >= 75
      ? "Diverse"
      : score >= 50
        ? "Moderate"
        : score >= 25
          ? "Focused"
          : "Concentrated";

  const colorClass =
    score >= 75
      ? "bg-primary"
      : score >= 50
        ? "bg-primary/70"
        : score >= 25
          ? "bg-primary/40"
          : "bg-destructive";

  return (
    <div className="flex items-center gap-2">
      <div
        className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Map variety score: ${score}/100 — ${label}`}
      >
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums">
        {score}/100
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

export function MapFamiliarityCard({ result }: MapFamiliarityCardProps) {
  const {
    data,
    varietyScore,
    avoidedMaps,
    totalMapsPlayed,
    totalMapsAvailable,
  } = result;

  const totalGames = data.reduce((sum, d) => sum + d.gamesPlayed, 0);
  const top15 = data.slice(0, 15);

  const description = `${totalMapsPlayed} of ${totalMapsAvailable} maps played${
    avoidedMaps.length > 0 ? ` — ${avoidedMaps.length} never encountered` : ""
  }`;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Map mastery"
        title="Map Familiarity"
        description={description}
        rightSlot={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                  aria-label="About variety score"
                >
                  <Info className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-56">
                <p className="text-xs">
                  Variety score (0–100) measures how evenly your games are
                  distributed across all available maps. 100 means perfectly
                  equal time on every map.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />
      <div>
        <p className="text-muted-foreground mb-1.5 text-xs font-medium">
          Map variety score
        </p>
        <VarietyMeter score={varietyScore} />
      </div>
      <div className="space-y-4">
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <BarChart
            data={top15}
            margin={{ top: 4, right: 8, left: -8, bottom: 60 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={80}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              fontSize={11}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const d = item.payload as (typeof top15)[number];
                    return (
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium">{d.name}</span>
                        <span className="text-muted-foreground">
                          {d.mapType}
                        </span>
                        <span>
                          {value} game{Number(value) !== 1 ? "s" : ""} (
                          {d.pctOfTotal}% of total)
                        </span>
                        {d.lastResults.length > 0 && (
                          <span className="text-muted-foreground">
                            Last {d.lastResults.length}:{" "}
                            {d.lastResults
                              .map((r) =>
                                r === "win" ? "W" : r === "loss" ? "L" : "D"
                              )
                              .join(" ")}
                          </span>
                        )}
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="gamesPlayed" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {top15.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill="var(--primary)"
                  fillOpacity={Math.max(0.35, 1 - i * 0.05)}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Avoided maps section */}
        {avoidedMaps.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
              <AlertTriangle className="size-3 text-primary" aria-hidden="true" />
              Maps you&apos;ve never played ({avoidedMaps.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {avoidedMaps.map((m) => (
                <TooltipProvider key={m.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="bg-muted text-muted-foreground cursor-default rounded border px-2 py-0.5 text-xs">
                        {m.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{m.mapType}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {totalGames} total games — showing top {top15.length} most-played maps
      </p>
    </section>
  );
}
