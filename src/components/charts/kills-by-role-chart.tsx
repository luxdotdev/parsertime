"use client";

import { HeroName, heroRoleMapping } from "@/types/heroes";
import { Kill } from "@prisma/client";
import {
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

type Data = [
  {
    name: "Tank";
    team1Kills: number;
    team2Kills: number;
  },
  {
    name: "Damage";
    team1Kills: number;
    team2Kills: number;
  },
  {
    name: "Support";
    team1Kills: number;
    team2Kills: number;
  }
];

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

type Props = {
  team1Kills: Kill[];
  team2Kills: Kill[];
  teamNames: readonly [string, string];
};

export function KillsByRoleChart({ team1Kills, team2Kills, teamNames }: Props) {
  const data: Data = [
    {
      name: "Tank",
      team1Kills: team1Kills.filter(
        (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Tank"
      ).length,
      team2Kills: team2Kills.filter(
        (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Tank"
      ).length,
    },
    {
      name: "Damage",
      team1Kills: team1Kills.filter(
        (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Damage"
      ).length,
      team2Kills: team2Kills.filter(
        (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Damage"
      ).length,
    },
    {
      name: "Support",
      team1Kills: team1Kills.filter(
        (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Support"
      ).length,
      team2Kills: team2Kills.filter(
        (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Support"
      ).length,
    },
  ];

  return (
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
      <Bar
        dataKey="team1Kills"
        fill="#0ea5e9"
        name={teamNames[0]}
        stackId="a"
      />
      <Bar
        dataKey="team2Kills"
        fill="#ef4444"
        name={teamNames[1]}
        stackId="a"
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  );
}
