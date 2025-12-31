"use client";

import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import type { NonMappableStat, Stat } from "@/lib/player-charts";
import { round as roundNum } from "@/lib/utils";
import { useTranslations } from "next-intl";
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
  playerStat: number;
}[];

function CustomTooltip({
  active,
  payload,
  label,
  playerName,
  playerTeam,
}: TooltipProps<ValueType, NameType> & {
  playerName: string;
  playerTeam: "Team1" | "Team2";
}) {
  const { team1, team2 } = useColorblindMode();

  if (active && payload?.length) {
    return (
      <div className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs">
        <h3 className="text-base">{label}</h3>
        <p className="text-sm">
          <strong style={{ color: playerTeam === "Team1" ? team1 : team2 }}>
            {playerName}
          </strong>
          : {(payload[0].value as number).toFixed(2)}
        </p>
      </div>
    );
  }

  return null;
}

type Props<T extends keyof Omit<Stat, NonMappableStat>> = {
  stat: T;
  playerStatByRound: ({
    round_number: number;
  } & Record<T, number>)[];
  playerName: string;
  playerTeam: "Team1" | "Team2";
};

export function PlayerStatByRoundChart<
  T extends keyof Omit<Stat, NonMappableStat>,
>({ stat, playerStatByRound, playerName, playerTeam }: Props<T>) {
  const t = useTranslations("mapPage.player.charts");
  const { team1, team2 } = useColorblindMode();

  const data: Data = playerStatByRound.map((round, index) => ({
    name: t("round", { index: index + 1 }),
    playerStat: roundNum(round[stat as keyof typeof round]),
  }));

  return (
    <>
      {data.length > 1 && (
        <ResponsiveContainer width="100%" height={500}>
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
                <stop offset="5%" stopColor={team1} stopOpacity={0.8} />
                <stop offset="95%" stopColor={team1} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorTeam2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={team2} stopOpacity={0.8} />
                <stop offset="95%" stopColor={team2} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Legend />
            <Tooltip
              content={
                <CustomTooltip
                  playerName={playerName}
                  playerTeam={playerTeam}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="playerStat"
              stroke={playerTeam === "Team1" ? team1 : team2}
              fill={`url(#color${playerTeam})`}
              name={playerName}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {data.length === 1 && (
        <ResponsiveContainer width="100%" height={500}>
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
            <Tooltip
              content={
                <CustomTooltip
                  playerName={playerName}
                  playerTeam={playerTeam}
                />
              }
            />
            <Bar
              dataKey="playerStat"
              fill={playerTeam === "Team1" ? team1 : team2}
              name={playerName}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}
