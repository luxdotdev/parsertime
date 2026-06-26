"use client";

import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { round as roundNum } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
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
        <span className="font-mono tabular-nums">{v1.toFixed(2)}</span>
      </p>
      <p className="font-sans text-xs">
        <strong style={{ color: team2 }}>{teamNames[1]}</strong>:{" "}
        <span className="font-mono tabular-nums">{v2.toFixed(2)}</span>
      </p>
    </div>
  );
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
  const t = useTranslations("mapPage.charts");
  const { team1, team2 } = useColorblindMode();

  const data: Data = useMemo(
    () =>
      team1DamageByRound.map((round, index) => ({
        name: t("round", { round: index + 1 }),
        team1Damage: roundNum(round._sum.hero_damage_dealt ?? 0),
        team2Damage: roundNum(
          team2DamageByRound[index]?._sum.hero_damage_dealt ?? 0
        ),
      })),
    [team1DamageByRound, team2DamageByRound, t]
  );

  const totalTeam1 = data.reduce((acc, d) => acc + d.team1Damage, 0);
  const totalTeam2 = data.reduce((acc, d) => acc + d.team2Damage, 0);

  const summary = `Across ${data.length} rounds, ${teamNames[0]} dealt ${totalTeam1.toFixed(0)} hero damage total, ${teamNames[1]} dealt ${totalTeam2.toFixed(0)} hero damage total.`;

  return (
    <>
      {data.length > 1 && (
        <ResponsiveContainer
          width="100%"
          aspect={2.4}
          aria-label={t("dmgByRound.title")}
        >
          <AreaChart
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
                <stop
                  offset="5%"
                  stopColor={`color-mix(in oklch, ${team1} 60%, transparent)`}
                  stopOpacity={1}
                />
                <stop
                  offset="95%"
                  stopColor={`color-mix(in oklch, ${team1} 60%, transparent)`}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="colorTeam2" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={`color-mix(in oklch, ${team2} 60%, transparent)`}
                  stopOpacity={1}
                />
                <stop
                  offset="95%"
                  stopColor={`color-mix(in oklch, ${team2} 60%, transparent)`}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="team1Damage"
              stroke={team1}
              fill="url(#colorTeam1)"
              name={teamNames[0]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="team2Damage"
              stroke={team2}
              fill="url(#colorTeam2)"
              name={teamNames[1]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {data.length === 1 && (
        <ResponsiveContainer
          width="100%"
          aspect={2.4}
          aria-label={t("dmgByRound.title")}
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
              dataKey="team1Damage"
              fill={team1}
              name={teamNames[0]}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="team2Damage"
              fill={team2}
              name={teamNames[1]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="sr-only" aria-live="polite">
        {summary}
      </div>
    </>
  );
}
