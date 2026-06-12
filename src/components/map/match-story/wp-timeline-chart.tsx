"use client";

import type { FightEntry, WpPoint } from "@/lib/win-probability/timeline";
import { useTranslations } from "next-intl";
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
  const wp = payload[0].value as number;
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
  team1,
}: {
  points: WpPoint[];
  fights: FightEntry[];
  roundMarkers: number[];
  team1: string;
}) {
  const t = useTranslations("mapPage.matchStory.chart");
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
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
            content={<WpTooltip team1={team1} />}
            cursor={{ stroke: "var(--border)" }}
          />
          <ReferenceLine y={0.5} stroke="var(--border)" strokeDasharray="4 4" />
          {roundMarkers.map((m, i) => (
            <ReferenceLine
              key={`round-${m}`}
              x={m}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              label={{
                value: t("round", { round: i + 1 }),
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 10,
              }}
            />
          ))}
          {fights.map((f) => (
            <ReferenceArea
              key={`fight-${f.index}`}
              x1={f.start}
              x2={Math.max(f.end, f.start + 1)}
              fill="var(--primary)"
              fillOpacity={0.08}
            />
          ))}
          <Line
            type="monotone"
            dataKey="wp"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {fights.map((f) => (
            <ReferenceDot
              key={`dot-${f.index}`}
              x={f.end}
              y={f.wpAfter}
              r={Math.min(8, 3 + Math.abs(f.swing) * 12)}
              fill="var(--primary)"
              stroke="var(--background)"
              isFront
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
