"use client";

import type { SubroleUltTiming } from "@/data/scrim/types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
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

const INITIATION_COLOR = "#22c55e";
const MIDFIGHT_COLOR = "#eab308";
const LATE_COLOR = "#ef4444";

type TimingRow = {
  label: string;
  initiation: number;
  midfight: number;
  late: number;
  rawInitiation: number;
  rawMidfight: number;
  rawLate: number;
  total: number;
  isAggregate: boolean;
  teamIndex: number;
};

/**
 * Rounds three values to integer percentages that always sum to exactly 100,
 * using the largest-remainder method to distribute rounding error.
 */
function roundedPcts(a: number, b: number, c: number, total: number) {
  if (total === 0) return [0, 0, 0] as const;
  const raw = [(a / total) * 100, (b / total) * 100, (c / total) * 100];
  const floored = raw.map(Math.floor);
  let remainder = 100 - floored.reduce((s, v) => s + v, 0);
  const fracs = raw.map((v, i) => ({ i, frac: v - floored[i] }));
  fracs.sort((x, y) => y.frac - x.frac);
  for (const entry of fracs) {
    if (remainder <= 0) break;
    floored[entry.i]++;
    remainder--;
  }
  return floored as [number, number, number];
}

function aggregateTimings(timings: SubroleUltTiming[]) {
  let initiation = 0;
  let midfight = 0;
  let late = 0;
  for (const t of timings) {
    initiation += t.initiation;
    midfight += t.midfight;
    late += t.late;
  }
  return { initiation, midfight, late };
}

function buildRow(
  label: string,
  raw: { initiation: number; midfight: number; late: number },
  teamIndex: number,
  isAggregate: boolean
): TimingRow | null {
  const total = raw.initiation + raw.midfight + raw.late;
  if (total === 0) return null;
  const [iPct, mPct, lPct] = roundedPcts(
    raw.initiation,
    raw.midfight,
    raw.late,
    total
  );
  return {
    label,
    initiation: iPct,
    midfight: mPct,
    late: lPct,
    rawInitiation: raw.initiation,
    rawMidfight: raw.midfight,
    rawLate: raw.late,
    total,
    isAggregate,
    teamIndex,
  };
}

type PercentLabelProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
};

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as TimingRow | undefined;
  if (!row || row.total === 0) return null;

  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 text-xs shadow-md">
      <h3 className="text-sm font-semibold">{row.label}</h3>
      <p className="text-sm">
        <span className="font-semibold tabular-nums">{row.total}</span>{" "}
        ultimates in fights
      </p>
      <div className="mt-1 space-y-0.5">
        <p className="text-sm">
          <span
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: INITIATION_COLOR }}
          />
          Initiation: {row.rawInitiation} ({row.initiation}%)
        </p>
        <p className="text-sm">
          <span
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: MIDFIGHT_COLOR }}
          />
          Midfight: {row.rawMidfight} ({row.midfight}%)
        </p>
        <p className="text-sm">
          <span
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: LATE_COLOR }}
          />
          Late: {row.rawLate} ({row.late}%)
        </p>
      </div>
    </div>
  );
}

type Props = {
  team1Timings: SubroleUltTiming[];
  team2Timings: SubroleUltTiming[];
  teamNames: readonly [string, string];
};

export function UltTimingChart({
  team1Timings,
  team2Timings,
  teamNames,
}: Props) {
  const { team1: team1Color, team2: team2Color } = useColorblindMode();
  const teamColors = [team1Color, team2Color];

  const t1Agg = aggregateTimings(team1Timings);
  const t2Agg = aggregateTimings(team2Timings);
  const t1Total = t1Agg.initiation + t1Agg.midfight + t1Agg.late;
  const t2Total = t2Agg.initiation + t2Agg.midfight + t2Agg.late;

  if (t1Total === 0 && t2Total === 0) return null;

  const data: TimingRow[] = [];

  const t1Row = buildRow(teamNames[0], t1Agg, 0, true);
  if (t1Row) {
    data.push(t1Row);
    for (const sr of team1Timings) {
      const row = buildRow(`  ${sr.subrole}`, sr, 0, false);
      if (row) data.push(row);
    }
  }

  const t2Row = buildRow(teamNames[1], t2Agg, 1, true);
  if (t2Row) {
    data.push(t2Row);
    for (const sr of team2Timings) {
      const row = buildRow(`  ${sr.subrole}`, sr, 1, false);
      if (row) data.push(row);
    }
  }

  if (data.length === 0) return null;

  const ROW_HEIGHT = 32;
  const LEGEND_HEIGHT = 30;
  const chartHeight = data.length * ROW_HEIGHT + LEGEND_HEIGHT;

  function renderSegmentLabel(dataKey: "initiation" | "midfight" | "late") {
    function SegmentLabel({
      x,
      y,
      width,
      height,
      index,
    }: PercentLabelProps & { index: number }) {
      const segmentValue = data[index]?.[dataKey] ?? 0;
      if (width < 30 || segmentValue === 0) return <text />;
      return (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-xs font-semibold"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          {segmentValue}%
        </text>
      );
    }
    return SegmentLabel;
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        barSize={20}
      >
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="label"
          tick={(props: {
            x: number;
            y: number;
            payload: { value: string };
          }) => {
            const row = data.find((d) => d.label === props.payload.value);
            const isAgg = row?.isAggregate ?? false;
            const tIdx = row?.teamIndex ?? 0;
            return (
              <text
                x={props.x}
                y={props.y}
                dy={4}
                textAnchor="end"
                className={
                  isAgg ? "text-xs font-semibold" : "text-[10px] font-normal"
                }
                style={{
                  fill: isAgg
                    ? teamColors[tIdx]
                    : "var(--color-muted-foreground)",
                }}
              >
                {props.payload.value}
              </text>
            );
          }}
          width={110}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        <Legend
          verticalAlign="bottom"
          payload={[
            { value: "Initiation", type: "rect", color: INITIATION_COLOR },
            { value: "Midfight", type: "rect", color: MIDFIGHT_COLOR },
            { value: "Late", type: "rect", color: LATE_COLOR },
          ]}
        />
        <Bar
          dataKey="initiation"
          stackId="timing"
          fill={INITIATION_COLOR}
          name="Initiation"
          label={renderSegmentLabel("initiation")}
        >
          {data.map((row) => (
            <Cell
              key={`init-${row.label}`}
              fillOpacity={row.isAggregate ? 1 : 0.7}
            />
          ))}
        </Bar>
        <Bar
          dataKey="midfight"
          stackId="timing"
          fill={MIDFIGHT_COLOR}
          name="Midfight"
          label={renderSegmentLabel("midfight")}
        >
          {data.map((row) => (
            <Cell
              key={`mid-${row.label}`}
              fillOpacity={row.isAggregate ? 1 : 0.7}
            />
          ))}
        </Bar>
        <Bar
          dataKey="late"
          stackId="timing"
          fill={LATE_COLOR}
          name="Late"
          radius={[0, 4, 4, 0]}
          label={renderSegmentLabel("late")}
        >
          {data.map((row) => (
            <Cell
              key={`late-${row.label}`}
              fillOpacity={row.isAggregate ? 1 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
