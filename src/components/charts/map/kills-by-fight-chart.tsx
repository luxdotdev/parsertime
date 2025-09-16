"use client";

import type { Kill } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
}: TooltipProps<ValueType, NameType> & {
  teamNames: readonly [string, string];
}) {
  const t = useTranslations("mapPage.charts");

  if (active && payload?.length) {
    return (
      <div className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs">
        <h3 className="text-base">
          {t("time", { time: (label as number).toFixed(2) })}
        </h3>
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
  fights: Kill[][];
  teamNames: readonly [string, string];
};

export function KillsByFightChart({ fights, teamNames }: Props) {
  const data: Data = [{ matchTime: 0, team1Kills: 0, team2Kills: 0 }];

  fights.forEach((fight) => {
    const team1Kills = fight.filter(
      (kill) => kill.attacker_team === teamNames[0]
    ).length;
    const team2Kills = fight.filter(
      (kill) => kill.attacker_team === teamNames[1]
    ).length;

    const lastDataPoint = data[data.length - 1];
    const newMatchTime = fight[fight.length - 1].match_time;

    data.push({
      matchTime: newMatchTime,
      team1Kills: lastDataPoint.team1Kills + team1Kills,
      team2Kills: lastDataPoint.team2Kills - team2Kills,
    });

    // reset the data to 0 after the fight
    data.push({
      matchTime: newMatchTime + 1,
      team1Kills: lastDataPoint.team1Kills,
      team2Kills: lastDataPoint.team2Kills,
    });
  });

  data.pop();

  return (
    <ResponsiveContainer width="100%" height={500}>
      <LineChart
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
        <XAxis dataKey="matchTime" interval={3} domain={[0, "dataMax"]} />
        <YAxis interval={0} />
        <Legend />
        <Tooltip content={<CustomTooltip teamNames={teamNames} />} />
        <Line
          type="monotone"
          dataKey="team1Kills"
          stroke="#0ea5e9"
          name={teamNames[0]}
        />
        <Line
          type="monotone"
          dataKey="team2Kills"
          stroke="#ef4444"
          name={teamNames[1]}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
