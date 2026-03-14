"use client";

import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer } from "@/components/ui/chart";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { PlayerMapPerformance } from "@/data/scrim-overview-dto";
import { Logger } from "@/lib/logger";
import type { HeroName } from "@/types/heroes";
import { heroRoleMapping } from "@/types/heroes";
import Image from "next/image";
import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type ChartDataPoint = {
  map: string;
  kd: number;
  elims: number;
  thirdStat: number;
  firstDeath: number;
  teamFirstDeath: number;
  rawKd: number;
  rawElims: number;
  rawThirdStat: number;
  rawFirstDeath: number;
  rawTeamFirstDeath: number;
};

type ChartModel = {
  thirdStatLabel: string;
  avgFirstDeath: number;
  avgTeamFirstDeath: number;
  chartData: ChartDataPoint[];
  chartConfig: ChartConfig;
};

type Props = {
  playerName: string;
  primaryHero: HeroName;
  heroLabel: string;
  heroImageSlug: string;
  heroCount: number;
  perMapPerformance: PlayerMapPerformance[];
};

type ChartErrorBoundaryProps = {
  fallback: React.ReactNode;
  children: React.ReactNode;
};

type ChartErrorBoundaryState = {
  hasError: boolean;
};

class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  public constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidUpdate(prevProps: ChartErrorBoundaryProps): void {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function formatRawValue(
  dataKey: string | number | undefined,
  point: ChartDataPoint
): string {
  if (dataKey === "kd") return point.rawKd.toFixed(2);
  if (dataKey === "elims") return point.rawElims.toFixed(1);
  if (dataKey === "firstDeath") return `${point.rawFirstDeath.toFixed(1)}%`;
  if (dataKey === "teamFirstDeath")
    return `${point.rawTeamFirstDeath.toFixed(1)}%`;
  return Math.round(point.rawThirdStat).toLocaleString();
}

function PerformanceTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover text-popover-foreground border-border/50 rounded-lg border p-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => {
        const point = entry.payload as ChartDataPoint;
        return (
          <div
            key={String(entry.dataKey)}
            className="flex items-center gap-1.5"
          >
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums">
              {formatRawValue(entry.dataKey, point)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildChartModel(
  primaryHero: HeroName,
  perMapPerformance: PlayerMapPerformance[]
): ChartModel {
  const role = heroRoleMapping[primaryHero];
  const isSupport = role === "Support";
  const thirdStatLabel = isSupport ? "Healing/10" : "Dmg/10";

  const len = perMapPerformance.length;
  const avgKd = perMapPerformance.reduce((sum, m) => sum + m.kdRatio, 0) / len;
  const avgElims =
    perMapPerformance.reduce((sum, m) => sum + m.eliminationsPer10, 0) / len;
  const avgThirdStat = isSupport
    ? perMapPerformance.reduce((sum, m) => sum + m.healingDealtPer10, 0) / len
    : perMapPerformance.reduce((sum, m) => sum + m.heroDamagePer10, 0) / len;
  const avgFirstDeath =
    perMapPerformance.reduce((sum, m) => sum + m.firstDeathRate, 0) / len;
  const avgTeamFirstDeath =
    perMapPerformance.reduce((sum, m) => sum + m.teamFirstDeathRate, 0) / len;

  const chartData = perMapPerformance.map((m) => ({
    map: m.mapName,
    kd: avgKd > 0 ? (m.kdRatio / avgKd) * 100 : 0,
    elims: avgElims > 0 ? (m.eliminationsPer10 / avgElims) * 100 : 0,
    thirdStat:
      avgThirdStat > 0
        ? ((isSupport ? m.healingDealtPer10 : m.heroDamagePer10) /
            avgThirdStat) *
          100
        : 0,
    firstDeath:
      avgFirstDeath > 0 ? (m.firstDeathRate / avgFirstDeath) * 100 : 0,
    teamFirstDeath:
      avgTeamFirstDeath > 0
        ? (m.teamFirstDeathRate / avgTeamFirstDeath) * 100
        : 0,
    rawKd: m.kdRatio,
    rawElims: m.eliminationsPer10,
    rawThirdStat: isSupport ? m.healingDealtPer10 : m.heroDamagePer10,
    rawFirstDeath: m.firstDeathRate,
    rawTeamFirstDeath: m.teamFirstDeathRate,
  }));

  const chartConfig = {
    kd: { label: "K/D", color: "#3b82f6" },
    elims: { label: "Elims/10", color: "#10b981" },
    thirdStat: { label: thirdStatLabel, color: "#f59e0b" },
    firstDeath: { label: "1st Death %", color: "#f43f5e" },
    teamFirstDeath: { label: "Team 1st Death %", color: "#8b5cf6" },
  } satisfies ChartConfig;

  return {
    thirdStatLabel,
    avgFirstDeath,
    avgTeamFirstDeath,
    chartData,
    chartConfig,
  };
}

export function PlayerPerformanceHoverChart({
  playerName,
  primaryHero,
  heroLabel,
  heroImageSlug,
  heroCount,
  perMapPerformance,
}: Props) {
  const identity = (
    <div className="flex items-center gap-2">
      <div className="bg-muted relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
        <Image
          src={`/heroes/${heroImageSlug}.png`}
          alt={heroLabel}
          fill
          className="object-cover"
          sizes="28px"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{playerName}</p>
        <p className="text-muted-foreground truncate text-xs">
          {heroLabel}
          {heroCount > 1 && <span> +{heroCount - 1}</span>}
        </p>
      </div>
    </div>
  );

  const [focusedStat, setFocusedStat] = React.useState<string | null>(null);

  function getOpacity(key: string) {
    return focusedStat === null || focusedStat === key ? 1 : 0.15;
  }

  if (perMapPerformance.length < 2) {
    return identity;
  }

  let model: ChartModel;
  try {
    model = buildChartModel(primaryHero, perMapPerformance);
  } catch (error) {
    Logger.error("[scrim-overview] player hover chart model failed", {
      playerName,
      primaryHero,
      perMapPerformance,
      error,
    });
    return identity;
  }

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="w-full cursor-pointer text-left"
          aria-label={`Show ${playerName} performance trend chart`}
        >
          {identity}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-full p-4" side="right" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{playerName}</p>
            <p className="text-muted-foreground text-xs">
              Performance across maps (% of avg) &middot; Click a stat to focus
            </p>
          </div>
          <ChartErrorBoundary
            fallback={
              <p className="text-muted-foreground text-xs">
                Performance chart unavailable for this player.
              </p>
            }
          >
            <ChartContainer
              config={model.chartConfig}
              className="h-[300px] w-full"
            >
              <LineChart
                data={model.chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="map"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 10", "dataMax + 10"]}
                  tickFormatter={(value: number) => `${Math.round(value)}%`}
                />
                <ReferenceLine
                  y={100}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                />
                <Tooltip content={<PerformanceTooltip />} />
                <Line
                  type="monotone"
                  name="K/D"
                  dataKey="kd"
                  stroke="var(--color-kd)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity("kd")}
                  dot={{
                    r: 3,
                    fillOpacity: getOpacity("kd"),
                    strokeOpacity: getOpacity("kd"),
                  }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  name="Elims/10"
                  dataKey="elims"
                  stroke="var(--color-elims)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity("elims")}
                  dot={{
                    r: 3,
                    fillOpacity: getOpacity("elims"),
                    strokeOpacity: getOpacity("elims"),
                  }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  name={model.thirdStatLabel}
                  dataKey="thirdStat"
                  stroke="var(--color-thirdStat)"
                  strokeWidth={2}
                  strokeOpacity={getOpacity("thirdStat")}
                  dot={{
                    r: 3,
                    fillOpacity: getOpacity("thirdStat"),
                    strokeOpacity: getOpacity("thirdStat"),
                  }}
                  activeDot={{ r: 4 }}
                />
                {model.avgFirstDeath > 0 && (
                  <Line
                    type="monotone"
                    name="1st Death %"
                    dataKey="firstDeath"
                    stroke="var(--color-firstDeath)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    strokeOpacity={getOpacity("firstDeath")}
                    dot={{
                      r: 3,
                      fillOpacity: getOpacity("firstDeath"),
                      strokeOpacity: getOpacity("firstDeath"),
                    }}
                    activeDot={{ r: 4 }}
                  />
                )}
                {model.avgTeamFirstDeath > 0 && (
                  <Line
                    type="monotone"
                    name="Team 1st Death %"
                    dataKey="teamFirstDeath"
                    stroke="var(--color-teamFirstDeath)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    strokeOpacity={getOpacity("teamFirstDeath")}
                    dot={{
                      r: 3,
                      fillOpacity: getOpacity("teamFirstDeath"),
                      strokeOpacity: getOpacity("teamFirstDeath"),
                    }}
                    activeDot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-3">
              {Object.entries(model.chartConfig).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className="flex cursor-pointer items-center gap-1"
                  onClick={() =>
                    setFocusedStat((prev) => (prev === key ? null : key))
                  }
                >
                  <div
                    className="h-2 w-2 rounded-full transition-opacity"
                    style={{
                      backgroundColor: config.color,
                      opacity: getOpacity(key),
                    }}
                  />
                  <span
                    className="text-muted-foreground text-[10px] transition-opacity"
                    style={{ opacity: getOpacity(key) }}
                  >
                    {typeof config.label === "string" ? config.label : ""}
                  </span>
                </button>
              ))}
            </div>
          </ChartErrorBoundary>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
