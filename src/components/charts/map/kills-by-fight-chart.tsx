"use client";

import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import type { Kill } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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
  matchTime: number;
  team1Kills: number;
  team2Kills: number;
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
  const t = useTranslations("mapPage.charts");

  if (!active || !payload?.length) return null;
  const v1 = payload[0]?.value;
  const v2 = payload[1]?.value;
  if (typeof v1 !== "number" || typeof v2 !== "number") return null;

  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
      <h3 className="font-sans text-sm">
        {t("time", { time: (label as number).toFixed(2) })}
      </h3>
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
  fights: Kill[][];
  teamNames: readonly [string, string];
};

export function KillsByFightChart({ fights, teamNames }: Props) {
  const t = useTranslations("mapPage.charts");
  const { team1, team2 } = useColorblindMode();

  const data: Data = useMemo(() => {
    const acc: Data = [{ matchTime: 0, team1Kills: 0, team2Kills: 0 }];

    fights.forEach((fight) => {
      const t1 = fight.filter(
        (kill) => kill.attacker_team === teamNames[0]
      ).length;
      const t2 = fight.filter(
        (kill) => kill.attacker_team === teamNames[1]
      ).length;

      const last = acc[acc.length - 1];
      const newMatchTime = fight[fight.length - 1].match_time;

      acc.push({
        matchTime: newMatchTime,
        team1Kills: last.team1Kills + t1,
        team2Kills: last.team2Kills - t2,
      });

      acc.push({
        matchTime: newMatchTime + 1,
        team1Kills: last.team1Kills,
        team2Kills: last.team2Kills,
      });
    });

    acc.pop();
    return acc;
  }, [fights, teamNames]);

  const totalTeam1 = data.length
    ? Math.max(...data.map((d) => d.team1Kills))
    : 0;
  const totalTeam2 = data.length
    ? Math.abs(Math.min(...data.map((d) => d.team2Kills)))
    : 0;

  const summary = `Across ${fights.length} fights, ${teamNames[0]} took ${totalTeam1} kills total, ${teamNames[1]} took ${totalTeam2} kills total.`;

  return (
    <>
      <ResponsiveContainer
        width="100%"
        aspect={2.4}
        aria-label={t("killsByFight.title")}
      >
        <LineChart
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
            dataKey="matchTime"
            interval={3}
            domain={[0, "dataMax"]}
            stroke="var(--muted-foreground)"
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--muted-foreground)",
            }}
          />
          <YAxis
            interval={0}
            domain={["dataMin", "dataMax"]}
            stroke="var(--muted-foreground)"
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--muted-foreground)",
            }}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
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
          <Line
            type="monotone"
            dataKey="team1Kills"
            stroke={team1}
            name={teamNames[0]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="team2Kills"
            stroke={team2}
            name={teamNames[1]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="sr-only" aria-live="polite">
        {summary}
      </div>
    </>
  );
}
