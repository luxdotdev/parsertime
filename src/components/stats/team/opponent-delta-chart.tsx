"use client";

import { formatDelta } from "@/lib/tempo/classify";
import type { OpponentTempoComparison } from "@/lib/tempo/opponent-benchmark";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type ChartRow = { name: string; delta: number; oppMean: number; maps: number };

type ChartTooltipProps = TooltipProps<ValueType, NameType> & {
  labels: { avg: string; delta: string; maps: string };
};

function ChartTooltip({ active, payload, labels }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold">{row.name}</p>
      <p className="text-muted-foreground font-mono text-xs tabular-nums">
        {labels.avg} {row.oppMean.toFixed(1)}s · {labels.delta}{" "}
        {formatDelta(row.delta)}s · {row.maps} {labels.maps}
      </p>
    </div>
  );
}

type DeltaLabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
};

/** Signed-delta label just outside each bar end (left for faster, right for slower). */
function DeltaLabel(props: DeltaLabelProps) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const value = Number(props.value ?? 0);
  const cx = value >= 0 ? x + width + 4 : x - 4;
  const anchor = value >= 0 ? "start" : "end";
  return (
    <text
      x={cx}
      y={y + height / 2}
      dy={3}
      textAnchor={anchor}
      fontSize={10}
      fontFamily="var(--font-mono)"
      fill="var(--muted-foreground)"
    >
      {`${formatDelta(value)}s`}
    </text>
  );
}

export function OpponentDeltaChart({
  comparison,
}: {
  comparison: OpponentTempoComparison;
}) {
  const t = useTranslations("teamStatsPage.ultimatesTab.overview.vsOpponents");

  const rows: ChartRow[] = comparison.perOpponent
    .map((g) => ({
      name: g.name ?? t("unnamed"),
      delta: g.delta,
      oppMean: g.mean,
      maps: g.maps,
    }))
    .sort((a, b) => a.delta - b.delta);

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)), 1) * 1.35;
  const height = Math.max(160, rows.length * 30);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
      >
        <XAxis
          type="number"
          domain={[-maxAbs, maxAbs]}
          tick={{
            fontSize: 10,
            fill: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
          tickFormatter={(v) => `${formatDelta(Number(v))}s`}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{
            fontSize: 10,
            fill: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeWidth={1} />
        <Tooltip
          content={
            <ChartTooltip
              labels={{
                avg: t("colAvg"),
                delta: t("colDelta"),
                maps: t("colMaps"),
              }}
            />
          }
          cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
        />
        <Bar
          dataKey="delta"
          fill="var(--chart-1)"
          radius={2}
          isAnimationActive={false}
        >
          <LabelList dataKey="delta" content={DeltaLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
