"use client";

import { formatDelta } from "@/lib/tempo/classify";
import {
  classifyOpponentDelta,
  type OpponentTempoComparison,
} from "@/lib/tempo/opponent-benchmark";
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

type ChartRow = {
  name: string;
  delta: number; // real you-minus-opponent (drives the tooltip + sort)
  value: number; // display value: opponent-minus-you, so better (lower time) is positive
  oppMean: number;
  maps: number;
};

type ChartTooltipProps = TooltipProps<ValueType, NameType> & {
  avgLabel: string;
  mapsLabel: string;
  describeDelta: (delta: number) => string;
};

// Width reserved for the YAxis category labels — the legend pads by this much so
// its ends line up with the plotting area rather than the opponent names.
const Y_AXIS_WIDTH = 120;
const PLOT_MARGIN = 48;

function ChartTooltip({
  active,
  payload,
  avgLabel,
  mapsLabel,
  describeDelta,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold">{row.name}</p>
      <p className="text-muted-foreground font-mono text-xs tabular-nums">
        {avgLabel} {row.oppMean.toFixed(1)}s · {describeDelta(row.delta)} ·{" "}
        {row.maps} {mapsLabel}
      </p>
    </div>
  );
}

export function OpponentDeltaChart({
  comparison,
}: {
  comparison: OpponentTempoComparison;
}) {
  const t = useTranslations("teamStatsPage.ultimatesTab.overview.vsOpponents");

  function describeDelta(delta: number): string {
    const bucket = classifyOpponentDelta(delta);
    const abs = Math.abs(delta).toFixed(1);
    if (bucket === "faster") return t("youFaster", { delta: abs });
    if (bucket === "slower") return t("youSlower", { delta: abs });
    return t("youEven");
  }

  const rows: ChartRow[] = comparison.perOpponent
    .map((g) => ({
      name: g.name ?? t("unnamed"),
      delta: g.delta,
      // Negate so a lower time (better) reads as a positive value extending right.
      value: -g.delta,
      oppMean: g.mean,
      maps: g.maps,
    }))
    // Sort by the real delta so the best comparison (most-faster) is on top.
    .sort((a, b) => a.delta - b.delta);

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.value)), 1) * 1.35;
  const height = Math.max(160, rows.length * 30);

  return (
    <div className="space-y-1.5">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: PLOT_MARGIN, bottom: 0, left: PLOT_MARGIN }}
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
            width={Y_AXIS_WIDTH}
            tick={{
              fontSize: 10,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
            }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <ReferenceLine
            x={0}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
          />
          <Tooltip
            content={
              <ChartTooltip
                avgLabel={t("colAvg")}
                mapsLabel={t("colMaps")}
                describeDelta={describeDelta}
              />
            }
            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
          />
          <Bar
            dataKey="value"
            fill="var(--chart-1)"
            radius={2}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="right"
              fill="var(--foreground)"
              fontSize={10}
              className="font-mono tabular-nums"
              formatter={(value: number | string) =>
                Number(value) >= 0 ? `${formatDelta(Number(value))}s` : ""
              }
            />
            <LabelList
              dataKey="value"
              position="left"
              fill="var(--foreground)"
              fontSize={10}
              className="font-mono tabular-nums"
              formatter={(value: number | string) =>
                Number(value) < 0 ? `${formatDelta(Number(value))}s` : ""
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div
        className="text-muted-foreground flex items-center justify-between font-mono text-[10px] tracking-[0.14em] uppercase"
        style={{
          paddingLeft: Y_AXIS_WIDTH + PLOT_MARGIN,
          paddingRight: PLOT_MARGIN,
        }}
      >
        <span>← {t("worse")}</span>
        <span>{t("better")} →</span>
      </div>
    </div>
  );
}
