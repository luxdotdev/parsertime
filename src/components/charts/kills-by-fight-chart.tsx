"use client";

import { Kill } from "@prisma/client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Data = {
  matchTime: number;
  team1Kills: number;
  team2Kills: number;
}[];

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
      <Tooltip />
      <Line
        type="monotone"
        dataKey="team1Kills"
        stroke="#0ea5e9"
        label="Team 1"
      />
      <Line
        type="monotone"
        dataKey="team2Kills"
        stroke="#ef4444"
        label="Team 2"
      />
    </LineChart>
  );
}
