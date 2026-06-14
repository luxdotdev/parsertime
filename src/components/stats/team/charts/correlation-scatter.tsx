"use client";

import {
  type PlayerScatterStats,
  type ScatterStatKey,
  computeCorrelation,
  computeScatterPoints,
} from "@/lib/team-scatter-stats";
import { format, round } from "@/lib/utils";
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
      strokeWidth={1.5}
    />
  );
}

/**
 * Player-name labels sit on top of gridlines and can crowd neighbouring dots,
 * so each name carries a background-coloured halo (paint-order: stroke) to stay
 * legible wherever it lands.
 */
function renderPlayerLabel(props: {
  x?: number | string;
  y?: number | string;
  value?: string | number;
}) {
  const { x, y, value } = props;
  if (x == null || y == null) return null;
  const cx = Number(x);
  const cy = Number(y);
  return (
    <text
      x={cx}
      y={cy - 10}
      textAnchor="middle"
      fontSize={11}
      fill="var(--muted-foreground)"
      stroke="var(--background)"
      strokeWidth={3}
      paintOrder="stroke"
      strokeLinejoin="round"
    >
      {value}
    </text>
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
    <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-2 text-xs shadow-md">
      <h3 className="text-sm font-bold">{point.playerName}</h3>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        <dt className="text-muted-foreground">{xLabel}</dt>
        <dd className="text-right font-mono tabular-nums">
          {format(round(point.x))}
        </dd>
        <dt className="text-muted-foreground">{yLabel}</dt>
        <dd className="text-right font-mono tabular-nums">
          {format(round(point.y))}
        </dd>
      </dl>
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
    if (!correlation) return null;
    const xs = points.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    return [
      { x: minX, y: correlation.slope * minX + correlation.intercept },
      { x: maxX, y: correlation.slope * maxX + correlation.intercept },
    ];
  }, [correlation, points]);

  // When the trend is requested but undefined (fewer than two players), say so
  // rather than leaving an unexplained empty corner.
  const trendUnavailable = showRegression && !correlation && points.length > 0;

  return (
    <div className="border-border space-y-3 rounded-md border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {correlation ? (
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {t("correlation", { value: correlation.r.toFixed(2) })}
          </span>
        ) : trendUnavailable ? (
          <span className="text-muted-foreground/70 shrink-0 text-xs">
            {t("trendUnavailable")}
          </span>
        ) : null}
      </div>

      {points.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t("noData")}
        </p>
      ) : (
        <div
          role="img"
          aria-label={t("chartAlt", {
            x: xLabel,
            y: yLabel,
            count: points.length,
          })}
        >
          <ResponsiveContainer width="100%" aspect={3 / 2}>
            <ScatterChart margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name={xLabel}
                height={48}
                stroke="var(--border)"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value: number) => format(round(value))}
                label={{
                  value: xLabel,
                  position: "insideBottom",
                  offset: 6,
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yLabel}
                width={60}
                stroke="var(--border)"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value: number) => format(round(value))}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  style: { textAnchor: "middle" },
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                content={renderTooltip}
              />
              <Scatter
                data={points}
                fill={DOT_COLOR}
                isAnimationActive={false}
                shape={renderDot}
              >
                <LabelList dataKey="playerName" content={renderPlayerLabel} />
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
        </div>
      )}
    </div>
  );
}
