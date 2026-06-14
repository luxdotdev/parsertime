"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  type PlayerScatterStats,
  type ScatterPoint,
  type ScatterStatKey,
  computeCorrelation,
  computeScatterPoints,
} from "@/lib/team-scatter-stats";
import { format, round } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import { Expand } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Range = [number, number];
type Segment = { x: number; y: number }[];

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
  return (
    <text
      x={Number(x)}
      y={Number(y) - 10}
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
    <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 z-50 overflow-hidden rounded-md border px-3 py-2 text-xs shadow-md">
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

/** The chart surface, shared by the compact card and the expanded inspector. */
function ChartCanvas({
  points,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  regressionSegment,
  ariaLabel,
  aspect,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xDomain: Range;
  yDomain: Range;
  regressionSegment: Segment | null;
  ariaLabel: string;
  aspect: number;
}) {
  const renderTooltip = useCallback(
    (props: TooltipProps<ValueType, NameType>) => (
      <CustomTooltip {...props} xLabel={xLabel} yLabel={yLabel} />
    ),
    [xLabel, yLabel]
  );

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" aspect={aspect}>
        <ScatterChart margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            domain={xDomain}
            allowDataOverflow
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
            domain={yDomain}
            allowDataOverflow
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
            cursor={{
              stroke: "var(--muted-foreground)",
              strokeDasharray: "3 3",
            }}
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
              ifOverflow="hidden"
              segment={regressionSegment}
            />
          ) : null}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function AxisZoom({
  marker,
  ariaLabel,
  domain,
  bound,
  step,
  onChange,
}: {
  marker: string;
  ariaLabel: string;
  domain: Range;
  bound: number;
  step: number;
  onChange: (range: Range) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-3 shrink-0 font-mono text-[10px] uppercase">
        {marker}
      </span>
      <Slider
        className="flex-1"
        min={0}
        max={bound}
        step={step}
        value={domain}
        minStepsBetweenThumbs={1}
        aria-label={ariaLabel}
        onValueChange={(v) => onChange([v[0], v[1]])}
      />
      <span className="text-muted-foreground w-28 shrink-0 text-right font-mono text-[10px] tabular-nums">
        {format(round(domain[0]))}–{format(round(domain[1]))}
      </span>
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

  // Upper bound for each axis (all stats are >= 0), padded so dots don't sit on
  // the edge. These define the full range of the zoom sliders.
  const boundX = useMemo(() => {
    const max = points.length ? Math.max(...points.map((p) => p.x)) : 0;
    return max > 0 ? max * 1.05 : 1;
  }, [points]);
  const boundY = useMemo(() => {
    const max = points.length ? Math.max(...points.map((p) => p.y)) : 0;
    return max > 0 ? max * 1.05 : 1;
  }, [points]);

  const [open, setOpen] = useState(false);
  // null = full view. A window narrows the visible domain to inspect clusters.
  const [xRange, setXRange] = useState<Range | null>(null);
  const [yRange, setYRange] = useState<Range | null>(null);

  // Reset the zoom whenever the underlying data (and thus the bounds) changes,
  // e.g. when the hero filter is adjusted.
  useEffect(() => {
    setXRange(null);
    setYRange(null);
  }, [boundX, boundY]);

  const fullDomainX: Range = [0, boundX];
  const fullDomainY: Range = [0, boundY];
  const zoomDomainX: Range = xRange ?? fullDomainX;
  const zoomDomainY: Range = yRange ?? fullDomainY;
  const isZoomed = xRange !== null || yRange !== null;

  const segmentFor = useCallback(
    (domainX: Range): Segment | null =>
      correlation
        ? [
            {
              x: domainX[0],
              y: correlation.slope * domainX[0] + correlation.intercept,
            },
            {
              x: domainX[1],
              y: correlation.slope * domainX[1] + correlation.intercept,
            },
          ]
        : null,
    [correlation]
  );

  const zoomedPoints = useMemo(
    () =>
      points.filter(
        (p) =>
          p.x >= zoomDomainX[0] &&
          p.x <= zoomDomainX[1] &&
          p.y >= zoomDomainY[0] &&
          p.y <= zoomDomainY[1]
      ),
    [points, zoomDomainX, zoomDomainY]
  );

  // When the trend is requested but undefined (fewer than two players), say so
  // rather than leaving an unexplained empty corner.
  const trendUnavailable = showRegression && !correlation && points.length > 0;

  function resetZoom() {
    setXRange(null);
    setYRange(null);
  }

  const rValue = correlation ? (
    <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
      {t("correlation", { value: correlation.r.toFixed(2) })}
    </span>
  ) : trendUnavailable ? (
    <span className="text-muted-foreground/70 shrink-0 text-xs">
      {t("trendUnavailable")}
    </span>
  ) : null;

  return (
    <div className="border-border space-y-3 rounded-md border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {rValue}
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) resetZoom();
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={points.length === 0}
                aria-label={t("expand")}
              >
                <Expand />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{t("description")}</DialogDescription>
              </DialogHeader>

              <ChartCanvas
                points={zoomedPoints}
                xLabel={xLabel}
                yLabel={yLabel}
                xDomain={zoomDomainX}
                yDomain={zoomDomainY}
                regressionSegment={segmentFor(zoomDomainX)}
                ariaLabel={t("chartAlt", {
                  x: xLabel,
                  y: yLabel,
                  count: zoomedPoints.length,
                })}
                aspect={16 / 10}
              />

              {points.length >= 2 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                      {t("zoom")}
                    </span>
                    {isZoomed ? (
                      <button
                        type="button"
                        onClick={resetZoom}
                        className="text-muted-foreground hover:text-foreground text-[11px] underline-offset-2 hover:underline"
                      >
                        {t("resetZoom")}
                      </button>
                    ) : null}
                  </div>
                  <AxisZoom
                    marker="X"
                    ariaLabel={t("zoomLabel", { axis: xLabel })}
                    domain={zoomDomainX}
                    bound={boundX}
                    step={boundX / 200}
                    onChange={(r) => setXRange(r)}
                  />
                  <AxisZoom
                    marker="Y"
                    ariaLabel={t("zoomLabel", { axis: yLabel })}
                    domain={zoomDomainY}
                    bound={boundY}
                    step={boundY / 200}
                    onChange={(r) => setYRange(r)}
                  />
                </div>
              ) : null}

              <dl className="border-border grid gap-x-6 gap-y-2 border-t pt-4 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DOT_COLOR }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">
                    {t("playersShown", {
                      shown: zoomedPoints.length,
                      total: points.length,
                    })}
                  </span>
                </div>
                {correlation ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-0 w-5 shrink-0 border-t-2 border-dashed"
                      style={{ borderColor: "var(--primary)" }}
                      aria-hidden
                    />
                    <span className="text-muted-foreground">
                      {t("legendTrend")} ·{" "}
                      <span className="text-foreground font-mono tabular-nums">
                        {t("correlation", { value: correlation.r.toFixed(2) })}
                      </span>
                    </span>
                  </div>
                ) : null}
              </dl>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t("noData")}
        </p>
      ) : (
        <ChartCanvas
          points={points}
          xLabel={xLabel}
          yLabel={yLabel}
          xDomain={fullDomainX}
          yDomain={fullDomainY}
          regressionSegment={segmentFor(fullDomainX)}
          ariaLabel={t("chartAlt", {
            x: xLabel,
            y: yLabel,
            count: points.length,
          })}
          aspect={3 / 2}
        />
      )}
    </div>
  );
}
