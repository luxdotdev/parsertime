import { OverviewTable } from "@/components/map/overview-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import { getFinalRoundStats } from "@/data/scrim-dto";
import prisma from "@/lib/prisma";
import {
  cn,
  groupKillsIntoFights,
  range,
  removeDuplicateRows,
  round,
  toMins,
  toTimestamp,
} from "@/lib/utils";
import { $Enums } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroName, heroPriority, heroRoleMapping } from "@/types/heroes";

export async function DefaultOverview({ id }: { id: number }) {
  const finalRound = await prisma.roundEnd.findFirst({
    where: {
      MapDataId: id,
    },
    orderBy: {
      round_number: "desc",
    },
  });

  const matchDetails = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
  });

  const team1Captures = await prisma.objectiveCaptured.findMany({
    where: {
      MapDataId: id,
      capturing_team: matchDetails?.team_1_name ?? "Team 1",
    },
  });

  const team2Captures = await prisma.objectiveCaptured.findMany({
    where: {
      MapDataId: id,
      capturing_team: matchDetails?.team_2_name ?? "Team 2",
    },
  });

  const mapType = matchDetails ? matchDetails.map_type : $Enums.MapType.Control;

  const finalRoundStats = await getFinalRoundStats(id);

  const playerStats = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
    },
  });

  const team1Damage = finalRoundStats
    .filter((player) => player.player_team === matchDetails?.team_1_name)
    .reduce((acc, player) => acc + player.hero_damage_dealt, 0);

  const team2Damage = finalRoundStats
    .filter((player) => player.player_team === matchDetails?.team_2_name)
    .reduce((acc, player) => acc + player.hero_damage_dealt, 0);

  const team1Healing = finalRoundStats
    .filter((player) => player.player_team === matchDetails?.team_1_name)
    .reduce((acc, player) => acc + player.healing_dealt, 0);

  const team2Healing = finalRoundStats
    .filter((player) => player.player_team === matchDetails?.team_2_name)
    .reduce((acc, player) => acc + player.healing_dealt, 0);

  function calculateScore() {
    switch (mapType) {
      case $Enums.MapType.Control:
        return `${finalRound?.team_1_score} - ${finalRound?.team_2_score}`;
      case $Enums.MapType.Escort:
        // account for game setting score to 3 to ensure map completion
        return `${team1Captures.length} - ${team2Captures.length}`;
      case $Enums.MapType.Flashpoint:
        return `${finalRound?.team_1_score} - ${finalRound?.team_2_score}`;
      case $Enums.MapType.Hybrid:
        // account for game setting score to 3 to ensure map completion
        return `${team1Captures.length} - ${team2Captures.length}`;
      case $Enums.MapType.Push:
        return "N/A";
      default:
        return "N/A";
    }
  }

  function calculateWinner() {
    if (!matchDetails) return "N/A";
    if (!finalRound) return "N/A";

    switch (mapType) {
      case $Enums.MapType.Control:
        return finalRound.team_1_score > finalRound.team_2_score
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Escort:
        if (team1Captures.length === 0) return matchDetails.team_2_name;
        if (team2Captures.length === 0) return matchDetails.team_1_name;

        if (team1Captures.length === team2Captures.length) {
          return team1Captures[team1Captures.length - 1]?.match_time_remaining >
            team2Captures[team2Captures.length - 1]?.match_time_remaining
            ? matchDetails.team_1_name
            : matchDetails.team_2_name;
        }

        return team1Captures.length > team2Captures.length
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Flashpoint:
        return finalRound.team_1_score > finalRound.team_2_score
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Hybrid:
        if (!team1Captures) return matchDetails.team_2_name;
        if (!team2Captures) return matchDetails.team_1_name;

        if (team1Captures.length === team2Captures.length) {
          return team1Captures[team1Captures.length - 1]?.match_time_remaining >
            team2Captures[team2Captures.length - 1]?.match_time_remaining
            ? matchDetails.team_1_name
            : matchDetails.team_2_name;
        }

        return team1Captures.length > team2Captures.length
          ? matchDetails.team_1_name
          : matchDetails.team_2_name;

      case $Enums.MapType.Push:
        return "N/A";
      default:
        return "N/A";
    }
  }

  const numberOfRounds =
    mapType === $Enums.MapType.Flashpoint ? 5 : finalRound?.round_number ?? 1;

  const fights = await groupKillsIntoFights(id);

  const team1FirstDeaths = fights.filter(
    (fight) => fight.kills[0].victim_team === matchDetails?.team_1_name
  ).length;

  const ultimateKills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      event_ability: "Ultimate",
    },
  });

  const team1UltimateKills = ultimateKills.filter(
    (kill) => kill.attacker_team === matchDetails?.team_1_name
  ).length;

  const team2UltimateKills = ultimateKills.filter(
    (kill) => kill.attacker_team === matchDetails?.team_2_name
  ).length;

  type Accumulator = { [key: string]: number };

  const firstDeaths = fights
    .map((fight) => fight.kills[0].victim_name)
    .reduce((acc: Accumulator, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

  const playerWithMostFirstDeaths = Object.keys(firstDeaths).reduce((a, b) =>
    firstDeaths[a] > firstDeaths[b] ? a : b
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Match Time
            </CardTitle>
            <CardIcon>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toTimestamp(finalRound?.match_time ?? 0)}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {((finalRound?.match_time ?? 0) / 60).toFixed(2)} minutes
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score</CardTitle>
            <CardIcon>
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateScore()}</div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {mapType !== $Enums.MapType.Push ? (
                <>
                  Winner:{" "}
                  <span
                    className={
                      calculateWinner() === matchDetails?.team_1_name
                        ? "text-blue-500"
                        : "text-red-500"
                    }
                  >
                    {calculateWinner()}
                  </span>
                </>
              ) : (
                "Not supported for Push due to limitations with the scrim code. :("
              )}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Hero Damage Dealt
            </CardTitle>
            <CardIcon>
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {round(team1Damage)} - {round(team2Damage)}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Damage > team2Damage ? (
                <>
                  <span className="text-blue-500">
                    {matchDetails?.team_1_name}
                  </span>{" "}
                  dealt more hero damage this map.
                </>
              ) : (
                <>
                  <span className="text-red-500">
                    {matchDetails?.team_2_name}
                  </span>{" "}
                  dealt more hero damage this map.
                </>
              )}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Team Healing Dealt
            </CardTitle>
            <CardIcon>
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {round(team1Healing)} - {round(team2Healing)}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {team1Healing > team2Healing ? (
                <>
                  <span className="text-blue-500">
                    {matchDetails?.team_1_name}
                  </span>{" "}
                  healed more this map.
                </>
              ) : (
                <>
                  <span className="text-red-500">
                    {matchDetails?.team_2_name}
                  </span>{" "}
                  healed more this map.
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {numberOfRounds === 1 ? (
              <OverviewTable playerStats={finalRoundStats} />
            ) : (
              <Tabs defaultValue="final" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="final">Overview</TabsTrigger>
                  {range(numberOfRounds).map((round) => (
                    <TabsTrigger key={round} value={round.toString()}>
                      Round {round + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="final" className="space-y-4">
                  <OverviewTable playerStats={finalRoundStats} />
                </TabsContent>
                {range(numberOfRounds).map(async (round) => (
                  <TabsContent
                    key={round}
                    value={round.toString()}
                    className="space-y-4"
                  >
                    <OverviewTable
                      key={round + 1}
                      playerStats={removeDuplicateRows(playerStats)
                        .filter(
                          (stat) =>
                            stat.round_number ===
                            round +
                              (mapType === $Enums.MapType.Flashpoint ? 2 : 1)
                        )
                        .sort((a, b) =>
                          a.player_name.localeCompare(b.player_name)
                        )
                        .sort(
                          (a, b) =>
                            heroPriority[
                              heroRoleMapping[a.player_hero as HeroName]
                            ] -
                            heroPriority[
                              heroRoleMapping[b.player_hero as HeroName]
                            ]
                        )
                        .sort((a, b) =>
                          a.player_team.localeCompare(b.player_team)
                        )}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-outside list-disc pl-4">
              <li>
                <span className="text-blue-500">
                  {matchDetails?.team_1_name}
                </span>{" "}
                had a first death in {team1FirstDeaths} fights, which is a
                percentage of{" "}
                <span
                  className={cn(
                    team1FirstDeaths / fights.length > 0.5
                      ? "text-red-500"
                      : "text-green-500",
                    team1FirstDeaths / fights.length === 0.5 &&
                      "text-purple-500"
                  )}
                >
                  {((team1FirstDeaths / fights.length) * 100).toFixed(2)}
                </span>
                %.{" "}
                <span className="text-red-500">
                  {matchDetails?.team_2_name}
                </span>{" "}
                had a first death in {fights.length - team1FirstDeaths} fights,
                which is a percentage of{" "}
                <span
                  className={cn(
                    team1FirstDeaths / fights.length > 0.5
                      ? "text-green-500"
                      : "text-red-500",
                    team1FirstDeaths / fights.length === 0.5 &&
                      "text-purple-500"
                  )}
                >
                  {(
                    ((fights.length - team1FirstDeaths) / fights.length) *
                    100
                  ).toFixed(2)}
                </span>
                %.
              </li>
              <li>
                {team1UltimateKills > team2UltimateKills && (
                  <>
                    <span className="text-blue-500">
                      {matchDetails?.team_1_name}
                    </span>{" "}
                    got the most value out of their ultimates, with{" "}
                    <span className="text-blue-500">{team1UltimateKills}</span>{" "}
                    ultimate kills.
                  </>
                )}

                {team1UltimateKills < team2UltimateKills && (
                  <>
                    <span className="text-red-500">
                      {matchDetails?.team_2_name}
                    </span>{" "}
                    got the most value out of their ultimates, with{" "}
                    <span className="text-red-500">{team2UltimateKills}</span>{" "}
                    ultimate kills.
                  </>
                )}

                {team1UltimateKills === team2UltimateKills && (
                  <>
                    Both teams got the same amount of value out of their
                    ultimates, with{" "}
                    <span className="text-purple-500">
                      {team1UltimateKills}
                    </span>{" "}
                    ultimate kills each.
                  </>
                )}
              </li>
              <li>
                The player with the most first deaths was{" "}
                <span
                  className={cn(
                    finalRoundStats.find(
                      (player) =>
                        player.player_name === playerWithMostFirstDeaths
                    )?.player_team === matchDetails?.team_1_name
                      ? "text-blue-500"
                      : "text-red-500"
                  )}
                >
                  {playerWithMostFirstDeaths === "null"
                    ? "N/A"
                    : playerWithMostFirstDeaths}
                </span>
                , with{" "}
                <span
                  className={cn(
                    finalRoundStats.find(
                      (player) =>
                        player.player_name === playerWithMostFirstDeaths
                    )?.player_team === matchDetails?.team_1_name
                      ? "text-blue-500"
                      : "text-red-500"
                  )}
                >
                  {firstDeaths[playerWithMostFirstDeaths]}
                </span>{" "}
                first deaths out of {fights.length} fights.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
