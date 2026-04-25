"use client";

import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { Kill } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
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

type RoleKillsData = {
  name: string;
  team1Kills: number;
  team2Kills: number;
};

type Data = [RoleKillsData, RoleKillsData, RoleKillsData];

function CustomTooltip({
  active,
  payload,
  label,
  teamNames,
  team1,
  team2,
}: TooltipProps<ValueType, NameType> & {
  teamNames: readonly [string, string];
  team1: string;
  team2: string;
}) {
  if (!active || !payload?.length) return null;
  const v1 = payload[0]?.value;
  const v2 = payload[1]?.value;
  if (typeof v1 !== "number" || typeof v2 !== "number") return null;

  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
      <h3 className="font-sans text-sm">{label}</h3>
      <p className="font-sans text-xs">
        <strong style={{ color: team1 }}>{teamNames[0]}</strong>:{" "}
        <span className="font-mono tabular-nums">{v1}</span>
      </p>
      <p className="font-sans text-xs">
        <strong style={{ color: team2 }}>{teamNames[1]}</strong>:{" "}
        <span className="font-mono tabular-nums">{v2}</span>
      </p>
    </div>
  );
}

type Props = {
  team1Kills: Kill[];
  team2Kills: Kill[];
  teamNames: readonly [string, string];
};

export function KillsByRoleChart({ team1Kills, team2Kills, teamNames }: Props) {
  const t = useTranslations("mapPage.charts");
  const { team1, team2 } = useColorblindMode();

  const data: Data = useMemo(
    () => [
      {
        name: t("tank"),
        team1Kills: team1Kills.filter(
          (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Tank"
        ).length,
        team2Kills: team2Kills.filter(
          (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Tank"
        ).length,
      },
      {
        name: t("damage"),
        team1Kills: team1Kills.filter(
          (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Damage"
        ).length,
        team2Kills: team2Kills.filter(
          (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Damage"
        ).length,
      },
      {
        name: t("support"),
        team1Kills: team1Kills.filter(
          (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Support"
        ).length,
        team2Kills: team2Kills.filter(
          (kill) => heroRoleMapping[kill.attacker_hero as HeroName] === "Support"
        ).length,
      },
    ],
    [team1Kills, team2Kills, t]
  );

  const totalTeam1 = data.reduce((acc, d) => acc + d.team1Kills, 0);
  const totalTeam2 = data.reduce((acc, d) => acc + d.team2Kills, 0);

  const summary = `${teamNames[0]} final blows by role — Tank ${data[0].team1Kills}, Damage ${data[1].team1Kills}, Support ${data[2].team1Kills} (total ${totalTeam1}). ${teamNames[1]} final blows by role — Tank ${data[0].team2Kills}, Damage ${data[1].team2Kills}, Support ${data[2].team2Kills} (total ${totalTeam2}).`;

  return (
    <>
      <ResponsiveContainer
        width="100%"
        aspect={2.4}
        aria-label={t("finalBlowsByRole.title")}
      >
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              fill: "var(--muted-foreground)",
            }}
            tickFormatter={(v) => String(v).toUpperCase()}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--muted-foreground)",
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: "var(--foreground)",
            }}
          />
          <Tooltip
            content={
              <CustomTooltip
                teamNames={teamNames}
                team1={team1}
                team2={team2}
              />
            }
          />
          <Bar
            dataKey="team1Kills"
            fill={team1}
            name={teamNames[0]}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="team2Kills"
            fill={team2}
            name={teamNames[1]}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="sr-only" aria-live="polite">
        {summary}
      </div>
    </>
  );
}
