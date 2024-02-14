"use client";

import { HeroName, heroRoleMapping } from "@/types/heroes";
import { Kill } from "@prisma/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
      width={1000}
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
      <Tooltip />
      <Bar dataKey="team1Kills" fill="#0ea5e9" label="Team 1" stackId="a" />
      <Bar
        dataKey="team2Kills"
        fill="#ef4444"
        label="Team 2"
        stackId="a"
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  );
}
