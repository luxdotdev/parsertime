"use client";

import type { FightEntry, WpPoint } from "@/lib/win-probability/timeline";
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
}: TooltipProps<ValueType, NameType> & { team1: string }) {
  if (!active || !payload?.length) return null;
  const wp = payload[0].value;
  if (typeof wp !== "number") return null;
  return (
    <div className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 font-mono text-xs">
      <div>{formatClock(label as number)}</div>
      <div className="tabular-nums">
        {team1}: {(wp * 100).toFixed(0)}%
      </div>
    </div>
  );
}

const TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

export function WpTimelineChart({
  points,
  fights,
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
  roundMarkers: number[];
  teams: { team1: string; team2: string };
  team1Color: string;
  team2Color: string;
  numberedFights: Set<number>;
  focusFight: number | null;
  onFocusFight: (index: number | null) => void;
}) {
  const t = useTranslations("mapPage.matchStory.chart");

  // Break the line between rounds: each round is its own arc that ends on
  // its outcome dot, instead of a needle connecting 0/1 to the next round.
  const chartData = useMemo(() => {
    const data: { t: number; wp: number | null }[] = [];
    let nextMarker = 1;
    for (const point of points) {
      if (
        nextMarker < roundMarkers.length &&
        point.t >= roundMarkers[nextMarker]
      ) {
        data.push({ t: (data[data.length - 1]?.t ?? point.t) + 0.01, wp: null });
        nextMarker++;
      }
      data.push(point);
    }
    return data;
  }, [points, roundMarkers]);

  // Round outcome dots, colored by who took the round.
  const outcomes = useMemo(() => {
    const ends: { t: number; wp: number }[] = [];
    for (let i = 0; i < points.length; i++) {
      const isLast = i === points.length - 1;
      const isRoundEnd =
        !isLast &&
        roundMarkers.some(
          (m, idx) => idx > 0 && points[i + 1].t >= m && points[i].t < m
        );
      if ((isLast || isRoundEnd) && (points[i].wp === 0 || points[i].wp === 1)) {
        ends.push(points[i]);
      }
    }
    return ends;
  }, [points, roundMarkers]);

  const focused = focusFight === null ? null : fights[focusFight];

  return (
    <div className="relative h-72 w-full" onMouseLeave={() => onFocusFight(null)}>
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
            content={<WpTooltip team1={teams.team1} />}
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
