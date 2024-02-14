"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { round as roundNum } from "@/lib/utils";

type Data = {
  name: string;
  team1Damage: number;
  team2Damage: number;
}[];

function CustomTooltip({
  active,
  payload,
  label,
  teamNames,
}: TooltipProps<ValueType, NameType> & {
  teamNames: readonly [string, string];
}) {
  if (active && payload && payload.length) {
    return (
      <div className="z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
        <h3 className="text-base">{label}</h3>
        <p className="text-sm">
          <strong className="text-blue-500">{teamNames[0]}</strong>:{" "}
          {payload[0].value}
        </p>
        <p className="text-sm">
          <strong className="text-red-500">{teamNames[1]}</strong>:{" "}
          {payload[1].value}
        </p>
      </div>
    );
  }

  return null;
}

type DamageByRound = {
  _sum: { hero_damage_dealt: number | null };
  round_number: number;
};

type Props = {
  team1DamageByRound: DamageByRound[];
  team2DamageByRound: DamageByRound[];
  teamNames: readonly [string, string];
};

export function DamageByRoundChart({
  team1DamageByRound,
  team2DamageByRound,
  teamNames,
}: Props) {
  const data: Data = team1DamageByRound.map((round, index) => ({
    name: `Round ${index + 1}`,
    team1Damage: roundNum(round._sum.hero_damage_dealt ?? 0),
    team2Damage: roundNum(
      team2DamageByRound[index]._sum.hero_damage_dealt ?? 0
    ),
  }));

  return (
    <>
      {data.length > 1 && (
        <AreaChart
          width={600}
          height={500}
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorTeam1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTeam2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Legend />
          <Tooltip content={<CustomTooltip teamNames={teamNames} />} />
          <Area
            type="monotone"
            dataKey="team1Damage"
            stroke="#0ea5e9"
            fill="url(#colorTeam1)"
            name={teamNames[0]}
          />
          <Area
            type="monotone"
            dataKey="team2Damage"
            stroke="#ef4444"
            fill="url(#colorTeam2)"
            name={teamNames[1]}
          />
        </AreaChart>
      )}
      {data.length === 1 && (
        <BarChart
          width={600}
          height={500}
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Legend />
          <Tooltip content={<CustomTooltip teamNames={teamNames} />} />
          <Bar dataKey="team1Damage" fill="#0ea5e9" name={teamNames[0]} />
          <Bar dataKey="team2Damage" fill="#ef4444" name={teamNames[1]} />
        </BarChart>
      )}
    </>
  );
}
