"use client";

import {
  type PlayerScatterStats,
  type ScatterStatKey,
  computeCorrelation,
  computeScatterPoints,
} from "@/lib/team-scatter-stats";
import { round } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type Props = {
  data: PlayerScatterStats[];
  xStat: ScatterStatKey;
  yStat: ScatterStatKey;
  xLabel: string;
  yLabel: string;
  selectedHeroes: HeroName[];
  showRegression: boolean;
  title: string;
};

const DOT_COLOR = "var(--chart-1)";

function renderDot(props: { cx?: number; cy?: number }) {
  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={5}
      fill={DOT_COLOR}
      stroke="var(--background)"
      strokeWidth={1}
    />
  );
}

function CustomTooltip({
  active,
  payload,
  xLabel,
  yLabel,
}: TooltipProps<ValueType, NameType> & { xLabel: string; yLabel: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as {
    playerName: string;
    x: number;
    y: number;
  };
  return (
    <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
      <h3 className="text-sm font-bold">{point.playerName}</h3>
      <p className="font-mono tabular-nums">
        {xLabel}: {round(point.x)}
      </p>
      <p className="font-mono tabular-nums">
        {yLabel}: {round(point.y)}
      </p>
    </div>
  );
}

export function CorrelationScatter({
  data,
  xStat,
  yStat,
  xLabel,
  yLabel,
  selectedHeroes,
  showRegression,
  title,
}: Props) {
  const t = useTranslations("teamStatsPage.charts");

  const points = useMemo(
    () => computeScatterPoints(data, xStat, yStat, selectedHeroes),
    [data, xStat, yStat, selectedHeroes]
  );

  const correlation = useMemo(
    () => (showRegression ? computeCorrelation(points) : null),
    [points, showRegression]
  );

  const renderTooltip = useCallback(
    (props: TooltipProps<ValueType, NameType>) => (
      <CustomTooltip {...props} xLabel={xLabel} yLabel={yLabel} />
    ),
    [xLabel, yLabel]
  );

  const regressionSegment = useMemo(() => {
    if (!correlation || points.length < 2) return null;
    const xs = points.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    return [
      { x: minX, y: correlation.slope * minX + correlation.intercept },
      { x: maxX, y: correlation.slope * maxX + correlation.intercept },
    ];
  }, [correlation, points]);

  return (
    <div className="border-border space-y-3 border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {correlation ? (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {t("correlation", { value: correlation.r.toFixed(2) })}
          </span>
        ) : null}
      </div>

      {points.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t("noData")}
        </p>
      ) : (
        <ResponsiveContainer width="100%" aspect={1}>
          <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 24 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              label={{
                value: xLabel,
                position: "insideBottom",
                offset: -12,
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={renderTooltip} />
            <Scatter
              data={points}
              fill={DOT_COLOR}
              isAnimationActive={false}
              shape={renderDot}
            >
              <LabelList
                dataKey="playerName"
                position="top"
                offset={8}
                style={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
            </Scatter>
            {regressionSegment ? (
              <ReferenceLine
                stroke="var(--primary)"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                segment={regressionSegment}
              />
            ) : null}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
