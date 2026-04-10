"use client";

import type {
  SwapTimingOutcome,
  SwapWinrateBucket,
} from "@/data/team/types";
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
  detail: string;
};

const FAVORABLE_COLOR = "#10b981";
const UNFAVORABLE_COLOR = "#f43f5e";

function fillForRate(rate: number) {
  return rate >= 50 ? FAVORABLE_COLOR : UNFAVORABLE_COLOR;
}

function SwapTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as ChartDatum;
  return (
    <div className="bg-primary text-primary-foreground z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums">{datum.winrate.toFixed(1)}% win rate</p>
      <p className="text-primary-foreground/70">{datum.detail}</p>
    </div>
  );
}

export function SwapWinRateChart({
  swapCountBuckets,
  timingBuckets,
}: {
  swapCountBuckets: SwapWinrateBucket[];
  timingBuckets: SwapTimingOutcome[];
}) {
  const data: ChartDatum[] = [];

  for (const bucket of swapCountBuckets) {
    if (bucket.totalMaps === 0) continue;
    data.push({
      label: bucket.label,
      winrate: bucket.winrate,
      fill: fillForRate(bucket.winrate),
      detail: `${bucket.wins}W\u2013${bucket.losses}L (${bucket.totalMaps} maps)`,
    });
  }

  for (const bucket of timingBuckets) {
    if (bucket.totalMaps === 0) continue;
    data.push({
      label: bucket.label,
      winrate: bucket.winrate,
      fill: fillForRate(bucket.winrate),
      detail: `${bucket.wins}W\u2013${bucket.losses}L (${bucket.totalMaps} maps)`,
    });
  }

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
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
        <Tooltip content={<SwapTooltip />} />
        <Bar dataKey="winrate" name="Win Rate" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
