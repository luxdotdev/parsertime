"use client";

import type {
  FightEntry,
  ObjectiveMarker,
  WpPoint,
} from "@/lib/win-probability/timeline";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { TooltipProps } from "recharts";
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function WpTooltip({
  active,
  payload,
  label,
  team1,
  scoreLabel,
  objectiveLabel,
}: TooltipProps<ValueType, NameType> & {
  team1: string;
  scoreLabel: string;
  objectiveLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const wp = payload[0].value;
  if (typeof wp !== "number") return null;
  const point = payload[0].payload as WpPoint;
  return (
    <div className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 font-mono text-xs">
      <div className="text-muted-foreground">
        {formatClock(label as number)}
      </div>
      <div className="tabular-nums">
        {team1}: {(wp * 100).toFixed(0)}%
      </div>
      {point.scoreDiff !== undefined ? (
        <div className="text-muted-foreground tabular-nums">
          {scoreLabel} {point.scoreDiff >= 0 ? "+" : ""}
          {point.scoreDiff}
          {point.objOwn !== undefined &&
          (point.objOwn > 0 || (point.objEnemy ?? 0) > 0)
            ? ` · ${objectiveLabel} ${Math.round((point.objOwn > 0 ? point.objOwn : (point.objEnemy ?? 0)) * 100)}%`
            : ""}
        </div>
      ) : null}
    </div>
  );
}

const TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

export function WpTimelineChart({
  points,
  fights,
  objectiveMarkers,
  roundMarkers,
  teams,
  team1Color,
  team2Color,
  numberedFights,
  focusFight,
  onFocusFight,
}: {
  points: WpPoint[];
  fights: FightEntry[];
  objectiveMarkers: ObjectiveMarker[];
  roundMarkers: number[];
  teams: { team1: string; team2: string };
  team1Color: string;
  team2Color: string;
  numberedFights: Set<number>;
  focusFight: number | null;
  onFocusFight: (index: number | null) => void;
}) {
  const t = useTranslations("mapPage.matchStory.chart");

  // Break the line between rounds, and keep snap points (round outcomes)
  // out of the line entirely — they render as floating outcome dots, not
  // needles connecting 0/1 to the neighbouring samples.
  const chartData = useMemo(() => {
    const data: (Omit<WpPoint, "wp"> & { wp: number | null })[] = [];
    let nextMarker = 1;
    for (const point of points) {
      if (
        nextMarker < roundMarkers.length &&
        point.t >= roundMarkers[nextMarker]
      ) {
        data.push({
          t: (data[data.length - 1]?.t ?? point.t) + 0.01,
          wp: null,
        });
        nextMarker++;
      }
      data.push(point.snap ? { ...point, wp: null } : point);
    }
    return data;
  }, [points, roundMarkers]);

  // Round outcome dots, colored by who took the round.
  const outcomes = useMemo(() => points.filter((p) => p.snap), [points]);

  // Pin each capture marker to the curve's height at that moment.
  const captureDots = useMemo(
    () =>
      objectiveMarkers.flatMap((marker) => {
        let wp: number | null = null;
        for (const p of points) {
          if (p.t > marker.t) break;
          if (!p.snap) wp = p.wp;
        }
        return wp === null ? [] : [{ ...marker, wp }];
      }),
    [objectiveMarkers, points]
  );

  const focused = focusFight === null ? null : fights[focusFight];

  return (
    <div
      className="relative h-72 w-full"
      onMouseLeave={() => onFocusFight(null)}
    >
      <span
        className="absolute top-1 left-14 font-mono text-[10px] tracking-[0.08em] uppercase"
        style={{ color: team1Color }}
      >
        {teams.team1} ▲
      </span>
      <span
        className="absolute bottom-9 left-14 font-mono text-[10px] tracking-[0.08em] uppercase"
        style={{ color: team2Color }}
      >
        {teams.team2} ▼
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
        >
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatClock}
            tick={TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tickFormatter={(v: number) => `${v * 100}%`}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            content={
              <WpTooltip
                team1={teams.team1}
                scoreLabel={t("score")}
                objectiveLabel={t("objective")}
              />
            }
            cursor={{ stroke: "var(--border)" }}
          />
          <ReferenceLine y={0.5} stroke="var(--border)" strokeDasharray="4 4" />
          {roundMarkers.slice(1).map((m, i) => (
            <ReferenceLine
              key={`round-${m}`}
              x={m}
              stroke="var(--border)"
              label={{
                value: t("round", { round: i + 2 }),
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 10,
              }}
            />
          ))}
          {focused !== null ? (
            <ReferenceArea
              x1={focused.start}
              x2={Math.max(focused.end, focused.start + 1)}
              fill="var(--primary)"
              fillOpacity={0.14}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="wp"
            stroke="var(--primary)"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          {outcomes.map((o) => (
            <ReferenceDot
              key={`outcome-${o.t}`}
              x={o.t}
              y={o.wp}
              r={4}
              fill={o.wp === 1 ? team1Color : team2Color}
              stroke="var(--background)"
              isFront
            />
          ))}
          {captureDots.map((c) => {
            // Floor, never round: a flip happens below 100% (reaching 100
            // ends the round), so rounding 99.x up to 100% would falsely read
            // as a round win that didn't happen.
            const p1 = Math.floor(c.progress1);
            const p2 = Math.floor(c.progress2);
            // Keep the two-line label toward the chart interior: below the
            // diamond when it sits high on the curve, above it when low.
            const below = c.wp > 0.5;
            const y1 = below ? 14 : -23;
            const y2 = below ? 25 : -12;
            return (
              <ReferenceDot
                key={`capture-${c.t}-${c.team}`}
                x={c.t}
                y={c.wp}
                isFront
                shape={(props: { cx?: number; cy?: number }) => {
                  const cx = props.cx ?? 0;
                  const cy = props.cy ?? 0;
                  return (
                    <g>
                      <rect
                        x={cx - 3.5}
                        y={cy - 3.5}
                        width={7}
                        height={7}
                        transform={`rotate(45 ${cx} ${cy})`}
                        fill={c.team === teams.team1 ? team1Color : team2Color}
                        stroke="var(--background)"
                        strokeWidth={1}
                      >
                        <title>
                          {t("captureProgress", {
                            team: c.team,
                            t1: teams.team1,
                            t2: teams.team2,
                            p1,
                            p2,
                          })}
                        </title>
                      </rect>
                      <text
                        x={cx}
                        y={cy + y1}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fontFamily="var(--font-geist-mono, monospace)"
                        fill={team1Color}
                        stroke="var(--background)"
                        strokeWidth={3}
                        paintOrder="stroke"
                        style={{ pointerEvents: "none" }}
                      >
                        {p1}%
                      </text>
                      <text
                        x={cx}
                        y={cy + y2}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fontFamily="var(--font-geist-mono, monospace)"
                        fill={team2Color}
                        stroke="var(--background)"
                        strokeWidth={3}
                        paintOrder="stroke"
                        style={{ pointerEvents: "none" }}
                      >
                        {p2}%
                      </text>
                    </g>
                  );
                }}
              />
            );
          })}
          {fights.map((f) => {
            const numbered = numberedFights.has(f.index);
            const isFocus = focusFight === f.index;
            return (
              <ReferenceDot
                key={`fight-${f.index}`}
                x={(f.start + f.end) / 2}
                y={f.wpAfter}
                r={isFocus ? 9 : numbered ? 8 : 2.5}
                fill={
                  isFocus
                    ? "var(--primary)"
                    : numbered
                      ? "var(--card)"
                      : "var(--muted-foreground)"
                }
                stroke={numbered || isFocus ? "var(--primary)" : "none"}
                strokeWidth={1.5}
                isFront
                onMouseEnter={() => onFocusFight(f.index)}
                label={
                  numbered
                    ? {
                        value: String(f.index + 1),
                        fill: isFocus
                          ? "var(--primary-foreground)"
                          : "var(--primary)",
                        fontSize: 10,
                        fontFamily: "var(--font-geist-mono, monospace)",
                        position: "center",
                      }
                    : undefined
                }
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
