"use client";

import {
  calculateMean,
  calculateStandardDeviation,
  generateBellCurveData,
  getSRRange,
} from "@/lib/distribution-utils";
import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type LeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  percentile: string;
};

type Props = {
  leaderboardData: LeaderboardPlayer[];
  selectedPlayer: LeaderboardPlayer;
  showOtherPlayers?: boolean;
  showPlayerAsLine?: boolean;
};

type PlayerPointData = {
  sr: number;
  value: number;
  player_name: string;
  rank: number;
  percentile: string;
  isSelected: boolean;
};

type BellCurvePointData = {
  sr: number;
  frequency: number;
};

type TooltipPayloadData = PlayerPointData | BellCurvePointData;

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    const data = payload[0].payload as TooltipPayloadData;

    if ("player_name" in data) {
      return (
        <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 text-xs shadow-xl">
          <p className="mb-1 text-sm font-semibold">{data.player_name}</p>
          <div className="text-muted-foreground space-y-0.5">
            <p>
              SR: <span className="text-foreground font-medium">{data.sr}</span>
            </p>
            <p>
              Rank:{" "}
              <span className="text-foreground font-medium">#{data.rank}</span>
            </p>
            <p>
              Percentile:{" "}
              <span className="text-foreground font-medium">
                {parseFloat(data.percentile).toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-xl">
        <p>
          SR: <span className="font-medium">{data.sr}</span>
        </p>
      </div>
    );
  }
  return null;
}

export function SRDistributionChart({
  leaderboardData,
  selectedPlayer,
  showOtherPlayers = true,
  showPlayerAsLine = false,
}: Props) {
  const chartData = useMemo(() => {
    const srValues = leaderboardData.map((p) => p.composite_sr);
    const mean = calculateMean(srValues);
    const stdDev = calculateStandardDeviation(srValues, mean);
    const { min, max } = getSRRange(mean, stdDev);

    const bellCurveData = generateBellCurveData(mean, stdDev, min, max, 100);

    const normalizedBellCurve = bellCurveData.map((point) => ({
      sr: point.sr,
      frequency: point.frequency * 1000,
    }));

    const maxFrequency = Math.max(
      ...normalizedBellCurve.map((d) => d.frequency)
    );

    const playerPoints = leaderboardData.map((player) => ({
      sr: player.composite_sr,
      value: maxFrequency * 0.05,
      player_name: player.player_name,
      rank: player.rank,
      percentile: player.percentile,
      isSelected: player.player_name === selectedPlayer.player_name,
    }));

    const playerSR = selectedPlayer.composite_sr;
    const playerPercent = Math.max(
      0,
      Math.min(100, ((playerSR - min) / (max - min)) * 100)
    );

    return {
      bellCurveData: normalizedBellCurve,
      playerPoints,
      mean,
      stdDev,
      min,
      max,
      playerPercent,
    };
  }, [leaderboardData, selectedPlayer]);

  const selectedPoint = chartData.playerPoints.find((p) => p.isSelected);
  const otherPoints = chartData.playerPoints.filter((p) => !p.isSelected);

  if (leaderboardData.length < 3) {
    return (
      <div className="bg-muted rounded-lg p-6 text-center">
        <p className="text-muted-foreground">
          Not enough data to generate a meaningful distribution. At least 3
          players are needed.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="sr"
            type="number"
            domain={[chartData.min, chartData.max]}
            label={{
              value: "Skill Rating (SR)",
              position: "insideBottom",
              offset: -15,
            }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "24px" }} />

          <defs>
            <linearGradient id="colorFrequency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorSplitFill" x1="0" y1="0" x2="1" y2="0">
              <stop
                offset={`${chartData.playerPercent}%`}
                stopColor="var(--chart-1)"
                stopOpacity={0.5}
              />
              <stop
                offset={`${chartData.playerPercent}%`}
                stopColor="var(--muted-foreground)"
                stopOpacity={0.15}
              />
            </linearGradient>
            <linearGradient id="colorSplitStroke" x1="0" y1="0" x2="1" y2="0">
              <stop
                offset={`${chartData.playerPercent}%`}
                stopColor="var(--chart-1)"
                stopOpacity={1}
              />
              <stop
                offset={`${chartData.playerPercent}%`}
                stopColor="var(--muted-foreground)"
                stopOpacity={0.45}
              />
            </linearGradient>
          </defs>

          <Area
            data={chartData.bellCurveData}
            type="monotone"
            dataKey="frequency"
            stroke={
              showPlayerAsLine ? "url(#colorSplitStroke)" : "var(--chart-1)"
            }
            fill={
              showPlayerAsLine ? "url(#colorSplitFill)" : "url(#colorFrequency)"
            }
            name={showPlayerAsLine ? "Achieved · Potential" : "Distribution"}
            isAnimationActive={false}
          />

          <ReferenceLine
            x={chartData.mean}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={{
              value: `Mean (${Math.round(chartData.mean)})`,
              position: "top",
            }}
          />

          {showPlayerAsLine && (
            <ReferenceLine
              x={selectedPlayer.composite_sr}
              stroke="var(--primary)"
              strokeWidth={2}
              label={{
                value: `${selectedPlayer.player_name} (${selectedPlayer.composite_sr})`,
                position: "insideTopRight",
                fill: "var(--primary)",
                fontSize: 12,
                offset: 24,
              }}
            />
          )}

          {showOtherPlayers && (
            <Scatter
              data={otherPoints}
              dataKey="value"
              fill="var(--chart-2)"
              name="Other Players"
              shape="circle"
            />
          )}

          {!showPlayerAsLine && (
            <Scatter
              data={selectedPoint ? [selectedPoint] : []}
              dataKey="value"
              fill="var(--chart-5)"
              name="Selected Player"
              shape="circle"
              r={8}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Mean SR</p>
          <p className="text-lg font-semibold">{Math.round(chartData.mean)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Standard Deviation</p>
          <p className="text-lg font-semibold">
            ±{Math.round(chartData.stdDev)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Selected Player SR</p>
          <p className="text-lg font-semibold">{selectedPlayer.composite_sr}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Percentile</p>
          <p className="text-lg font-semibold">
            {parseFloat(selectedPlayer.percentile).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
