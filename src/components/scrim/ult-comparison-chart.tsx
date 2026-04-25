"use client";

import type { PlayerUltComparison } from "@/data/scrim/types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

type ChartDatum = {
  subrole: string;
  ourUlts: number;
  opponentUlts: number;
  ourLabel: string;
  opponentLabel: string;
};

function CustomTooltip({
  active,
  payload,
  label,
  teamNames,
  data,
}: TooltipProps<ValueType, NameType> & {
  teamNames: readonly [string, string];
  data: ChartDatum[];
}) {
  const { team1, team2 } = useColorblindMode();

  if (!active || !payload?.length) return null;

  const datum = data.find((d) => d.subrole === label);

  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
      <h3 className="text-base font-medium">{label}</h3>
      <p className="text-sm">
        <strong style={{ color: team1 }}>{teamNames[0]}</strong>:{" "}
        {datum?.ourLabel ?? ""} &mdash; {payload[0]?.value ?? 0} ults
      </p>
      <p className="text-sm">
        <strong style={{ color: team2 }}>{teamNames[1]}</strong>:{" "}
        {datum?.opponentLabel ?? ""} &mdash; {payload[1]?.value ?? 0} ults
      </p>
    </div>
  );
}

type Props = {
  comparisons: PlayerUltComparison[];
  teamNames: readonly [string, string];
};

export function UltComparisonChart({ comparisons, teamNames }: Props) {
  const { team1, team2 } = useColorblindMode();

  if (comparisons.length === 0) return null;

  const data: ChartDatum[] = comparisons.map((c) => ({
    subrole: c.subrole,
    ourUlts: c.ourUltCount,
    opponentUlts: c.opponentUltCount,
    ourLabel: c.ourPlayerName
      ? `${c.ourPlayerName} (${c.ourHero})`
      : "No player",
    opponentLabel: c.opponentPlayerName
      ? `${c.opponentPlayerName} (${c.opponentHero})`
      : "No player",
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="subrole" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Legend />
        <Tooltip
          content={<CustomTooltip teamNames={teamNames} data={data} />}
        />
        <Bar
          dataKey="ourUlts"
          fill={team1}
          name={teamNames[0]}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="opponentUlts"
          fill={team2}
          name={teamNames[1]}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
