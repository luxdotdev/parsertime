"use client";

import type { ScrimFightAnalysis } from "@/data/scrim/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type ChartDatum = {
  label: string;
  winrate: number;
  fill: string;
};

const FAVORABLE_COLOR = "#10b981";
const UNFAVORABLE_COLOR = "#f43f5e";

function fillForRate(rate: number) {
  return rate >= 50 ? FAVORABLE_COLOR : UNFAVORABLE_COLOR;
}

function WinRateTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value as number;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums">{value.toFixed(1)}% win rate</p>
    </div>
  );
}

export function FightWinRateChart({
  analysis,
}: {
  analysis: ScrimFightAnalysis;
}) {
  const data: ChartDatum[] = [];

  data.push({
    label: "Overall",
    winrate: analysis.fightWinrate,
    fill: fillForRate(analysis.fightWinrate),
  });

  if (analysis.firstPickCount > 0) {
    data.push({
      label: "First Pick",
      winrate: analysis.firstPickWinrate,
      fill: fillForRate(analysis.firstPickWinrate),
    });
  }

  if (analysis.teamFirstDeathCount > 0) {
    data.push({
      label: "Died First",
      winrate: analysis.firstDeathWinrate,
      fill: fillForRate(analysis.firstDeathWinrate),
    });
  }

  if (analysis.firstUltCount > 0) {
    data.push({
      label: "Used Ult First",
      winrate: analysis.firstUltWinrate,
      fill: fillForRate(analysis.firstUltWinrate),
    });
  }

  if (analysis.opponentFirstUltCount > 0) {
    data.push({
      label: "Opp Ult First",
      winrate: analysis.opponentFirstUltWinrate,
      fill: fillForRate(analysis.opponentFirstUltWinrate),
    });
  }

  if (data.length <= 1) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          allowDecimals={false}
        />
        <ReferenceLine
          y={50}
          stroke="var(--border)"
          strokeDasharray="4 4"
          label={{
            value: "50%",
            position: "insideTopLeft",
            fontSize: 10,
            fill: "var(--muted-foreground)",
          }}
        />
        <Tooltip content={<WinRateTooltip />} />
        <Bar dataKey="winrate" name="Win Rate" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
