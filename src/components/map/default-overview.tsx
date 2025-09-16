import { OverviewTable } from "@/components/map/overview-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardIcon from "@/components/ui/card-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFinalRoundStats } from "@/data/scrim-dto";
import { getAjaxes } from "@/lib/analytics";
import prisma from "@/lib/prisma";
import {
  cn,
  groupKillsIntoFights,
  range,
  removeDuplicateRows,
  round,
  toTimestamp,
} from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import { HeroName, heroPriority, heroRoleMapping } from "@/types/heroes";
import { $Enums } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function DefaultOverview({ id }: { id: number }) {
  const [finalRound, matchDetails, finalRoundStats, playerStats, fights] =
    await Promise.all([
      await prisma.roundEnd.findFirst({
        where: { MapDataId: id },
        orderBy: { round_number: "desc" },
      }),
      await prisma.matchStart.findFirst({ where: { MapDataId: id } }),
      getFinalRoundStats(id),
      prisma.playerStat.findMany({ where: { MapDataId: id } }),
      groupKillsIntoFights(id),
    ]);

  const [team1Captures, team2Captures] = await Promise.all([
    prisma.objectiveCaptured.findMany({
      where: {
        MapDataId: id,
        capturing_team: matchDetails?.team_1_name ?? "Team 1",
      },
    }),
    prisma.objectiveCaptured.findMany({
      where: {
        MapDataId: id,
        capturing_team: matchDetails?.team_2_name ?? "Team 2",
      },
    }),
  ]);

  const t = await getTranslations("mapPage.overview");

  const mapType = matchDetails ? matchDetails.map_type : $Enums.MapType.Control;

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

  const winner = calculateWinner({
    matchDetails,
    finalRound,
    team1Captures,
    team2Captures,
  });

  const numberOfRounds =
    // prettier-ignore
    mapType === $Enums.MapType.Flashpoint ? 5 : (finalRound?.round_number ?? 1);

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

  const playerWithMostFirstDeaths =
    Object.keys(firstDeaths).length > 0
      ? Object.keys(firstDeaths).reduce((a, b) =>
          firstDeaths[a] > firstDeaths[b] ? a : b
        )
      : "null";

  const lucioPlayers = finalRoundStats.filter(
    (player) => player.player_hero === "Lúcio"
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("matchTime")}
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
            <p className="text-muted-foreground text-xs">
              {t("minutes", {
                time: ((finalRound?.match_time ?? 0) / 60).toFixed(2),
              })}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("score")}</CardTitle>
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
            <p className="text-muted-foreground text-xs">
              {mapType !== $Enums.MapType.Push ? (
                <>
                  {t("winner")}{" "}
                  <span
                    className={
                      winner === matchDetails?.team_1_name
                        ? "text-blue-500"
                        : "text-red-500"
                    }
                  >
                    {winner}
                  </span>
                </>
              ) : (
                t("pushLimitations")
              )}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("heroDamageDealt")}
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
            <p className="text-muted-foreground text-xs">
              {team1Damage > team2Damage
                ? t.rich("dealtMore", {
                    color: (chunks) => (
                      <span className="text-blue-500">{chunks}</span>
                    ),
                    teamName: matchDetails?.team_1_name ?? "",
                  })
                : t.rich("dealtMore", {
                    color: (chunks) => (
                      <span className="text-red-500">{chunks}</span>
                    ),
                    teamName: matchDetails?.team_2_name ?? "",
                  })}
            </p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("teamHealingDealt")}
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
            <p className="text-muted-foreground text-xs">
              {team1Healing > team2Healing
                ? t.rich("healedMore", {
                    color: (chunks) => (
                      <span className="text-blue-500">{chunks}</span>
                    ),
                    teamName: matchDetails?.team_1_name ?? "",
                  })
                : t.rich("healedMore", {
                    color: (chunks) => (
                      <span className="text-red-500">{chunks}</span>
                    ),
                    teamName: matchDetails?.team_2_name ?? "",
                  })}
            </p>
          </CardFooter>
        </Card>
      </div>
      <div className="flex gap-4 md:grid md:grid-cols-2 lg:grid-cols-7">
        <Card className="max-w-full md:col-span-full">
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex md:hidden">
            <OverviewTable playerStats={finalRoundStats} />
          </CardContent>
          <CardContent className="hidden md:flex">
            {numberOfRounds === 1 ? (
              <OverviewTable playerStats={finalRoundStats} />
            ) : (
              <Tabs
                defaultValue="final"
                className="max-w-fit space-y-4 overflow-x-auto"
              >
                <TabsList>
                  <TabsTrigger value="final">{t("title")}</TabsTrigger>
                  {range(numberOfRounds).map((round) => (
                    <TabsTrigger key={round} value={round.toString()}>
                      {t("round", { number: round + 1 })}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="final" className="space-y-4">
                  <OverviewTable playerStats={finalRoundStats} />
                </TabsContent>
                {range(numberOfRounds).map((round) => (
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
            <CardTitle>{t("analysis.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-outside list-disc pl-4">
              <li>
                {t.rich("analysis.deathDescriptionTeam1", {
                  span1: (chunks) => (
                    <span className="text-blue-500">{chunks}</span>
                  ),
                  team1Name: matchDetails?.team_1_name ?? "",
                  team1FirstDeaths,
                  span2: (chunks) => (
                    <span
                      className={cn(
                        team1FirstDeaths / fights.length > 0.5
                          ? "text-red-500"
                          : "text-green-500",
                        team1FirstDeaths / fights.length === 0.5 &&
                          "text-purple-500"
                      )}
                    >
                      {chunks}
                    </span>
                  ),
                  percentage: (
                    (team1FirstDeaths / fights.length) *
                    100
                  ).toFixed(2),
                })}{" "}
                {t.rich("analysis.deathDescriptionTeam2", {
                  span1: (chunks) => (
                    <span className="text-red-500">{chunks}</span>
                  ),
                  team2Name: matchDetails?.team_2_name ?? "",
                  team2FirstDeaths: fights.length - team1FirstDeaths,
                  span2: (chunks) => (
                    <span
                      className={cn(
                        (fights.length - team1FirstDeaths) / fights.length > 0.5
                          ? "text-red-500"
                          : "text-green-500",
                        (fights.length - team1FirstDeaths) / fights.length ===
                          0.5 && "text-purple-500"
                      )}
                    >
                      {chunks}
                    </span>
                  ),
                  percentage: (
                    ((fights.length - team1FirstDeaths) / fights.length) *
                    100
                  ).toFixed(2),
                })}
              </li>
              <li>
                {team1UltimateKills > team2UltimateKills &&
                  t.rich("analysis.ultKillsDescriptionTeam1", {
                    span: (chunks) => (
                      <span className="text-blue-500">{chunks}</span>
                    ),
                    team1Name: matchDetails?.team_1_name ?? "",
                    team1UltimateKills,
                  })}

                {team1UltimateKills < team2UltimateKills &&
                  t.rich("analysis.ultKillsDescriptionTeam2", {
                    span: (chunks) => (
                      <span className="text-red-500">{chunks}</span>
                    ),
                    team2Name: matchDetails?.team_2_name ?? "",
                    team2UltimateKills,
                  })}

                {team1UltimateKills === team2UltimateKills &&
                  t.rich("analysis.ultKillsDescriptionBoth", {
                    span: (chunks) => (
                      <span className="text-purple-500">{chunks}</span>
                    ),
                    team1UltimateKills,
                  })}
              </li>
              <li>
                {t.rich("analysis.playerDeathDescription", {
                  span: (chunks) => (
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
                      {chunks}
                    </span>
                  ),
                  playerWithMostFirstDeaths,
                  firstDeaths: firstDeaths[playerWithMostFirstDeaths],
                  fights: fights.length,
                })}
              </li>
              {lucioPlayers.length > 0 && (
                <>
                  {lucioPlayers.map(async (player) => {
                    const ajaxes = await getAjaxes(id, player.player_name);

                    if (ajaxes === 0) return null;
                    return (
                      <li key={player.player_name}>
                        {t.rich("analysis.ajax", {
                          span: (chunks) => (
                            <span
                              className={cn(
                                player.player_team === matchDetails?.team_1_name
                                  ? "text-blue-500"
                                  : "text-red-500"
                              )}
                            >
                              {chunks}
                            </span>
                          ),
                          player: player.player_name,
                          ajaxes,
                        })}
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
