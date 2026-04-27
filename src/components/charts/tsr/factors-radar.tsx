"use client";

import type { TsrBreakdownFactor } from "@/lib/tsr/breakdown";
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

type Props = {
  factors: TsrBreakdownFactor[];
};

function FactorTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TsrBreakdownFactor & { axis: string };
  return (
    <div className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 text-xs shadow-xs">
      <p className="text-foreground font-medium">{point.label}</p>
      <p className="text-muted-foreground mt-0.5 font-mono tabular-nums">
        {point.rawLabel}
      </p>
    </div>
  );
}

export function FactorsRadar({ factors }: Props) {
  const data = factors.map((f) => ({ ...f, axis: f.label }));
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--border)" strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: "var(--muted-foreground)",
              fontSize: 11,
              fontFamily: "var(--font-geist-mono, ui-monospace)",
            }}
          />
          <PolarRadiusAxis
            domain={[0, 1]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Factors"
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.25}
            strokeWidth={1.5}
          />
          <Tooltip content={<FactorTooltip />} cursor={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
