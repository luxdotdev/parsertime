"use client";

import { useMemo } from "react";
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

type LeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  role: string;
  elims_per10?: number;
  fb_per10?: number;
  deaths_per10: number;
  damage_per10: number;
  healing_per10?: number;
  blocked_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
};

type Props = {
  player: LeaderboardPlayer;
  leaderboardData: LeaderboardPlayer[];
};

type RadarDataPoint = {
  stat: string;
  value: number;
  fullMark: number;
};

function calculateZScore(
  value: number,
  values: number[],
  invert = false
): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  const zScore = (value - mean) / stdDev;
  return invert ? -zScore : zScore;
}

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    const data = payload[0];
    const payloadData = data.payload as RadarDataPoint;
    const zScore = data.value as number;
    return (
      <div className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 text-xs shadow-xs">
        <p className="text-foreground font-medium">{payloadData.stat}</p>
        <p className="text-muted-foreground mt-0.5 font-mono tabular-nums">
          Z-score <span className="text-foreground">{zScore.toFixed(2)}</span>
        </p>
      </div>
    );
  }
  return null;
}

export function PlayerStatsRadarChart({ player, leaderboardData }: Props) {
  const radarData = useMemo(() => {
    const role = player.role;
    const data: RadarDataPoint[] = [];

    if (player.elims_per10 !== undefined) {
      const values = leaderboardData
        .map((p) => p.elims_per10)
        .filter((v): v is number => v !== undefined);
      const zScore = calculateZScore(player.elims_per10, values);
      data.push({
        stat: "Eliminations",
        value: zScore,
        fullMark: 3,
      });
    }

    if (player.deaths_per10 !== undefined) {
      const values = leaderboardData.map((p) => p.deaths_per10);
      const zScore = calculateZScore(player.deaths_per10, values, true);
      data.push({
        stat: "Deaths",
        value: zScore,
        fullMark: 3,
      });
    }

    if (player.damage_per10 !== undefined) {
      const values = leaderboardData.map((p) => p.damage_per10);
      const zScore = calculateZScore(player.damage_per10, values);
      data.push({
        stat: "Damage",
        value: zScore,
        fullMark: 3,
      });
    }

    if (role === "Support" && player.healing_per10 !== undefined) {
      const values = leaderboardData
        .map((p) => p.healing_per10)
        .filter((v): v is number => v !== undefined);
      if (values.length > 0) {
        const zScore = calculateZScore(player.healing_per10, values);
        data.push({
          stat: "Healing",
          value: zScore,
          fullMark: 3,
        });
      }
    }

    if (role === "Tank" && player.blocked_per10 !== undefined) {
      const values = leaderboardData
        .map((p) => p.blocked_per10)
        .filter((v): v is number => v !== undefined);
      if (values.length > 0) {
        const zScore = calculateZScore(player.blocked_per10, values);
        data.push({
          stat: "Damage Blocked",
          value: zScore,
          fullMark: 3,
        });
      }
    }

    if (player.fb_per10 !== undefined) {
      const values = leaderboardData
        .map((p) => p.fb_per10)
        .filter((v): v is number => v !== undefined);
      if (values.length > 0) {
        const zScore = calculateZScore(player.fb_per10, values);
        data.push({
          stat: "Final Blows",
          value: zScore,
          fullMark: 3,
        });
      }
    }

    if (player.solo_per10 !== undefined) {
      const values = leaderboardData
        .map((p) => p.solo_per10)
        .filter((v): v is number => v !== undefined);
      if (values.length > 0) {
        const zScore = calculateZScore(player.solo_per10, values);
        data.push({
          stat: "Solo Kills",
          value: zScore,
          fullMark: 3,
        });
      }
    }

    return data;
  }, [player, leaderboardData]);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={radarData} outerRadius="70%">
          <PolarGrid stroke="var(--border)" strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="stat"
            tick={{
              fill: "var(--muted-foreground)",
              fontSize: 11,
              fontFamily: "var(--font-geist-mono, ui-monospace)",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[-3, 3]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name={player.player_name}
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.25}
            strokeWidth={1.5}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
