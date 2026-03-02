import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import { OverviewTable } from "@/components/map/overview-table";
import { UltComparisonChart } from "@/components/scrim/ult-comparison-chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardIcon } from "@/components/ui/card-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFinalRoundStats } from "@/data/scrim-dto";
import {
  assignPlayersToSubroles,
  buildPlayerUltComparisons,
  type PlayerUltSummary,
  type UltEfficiency,
} from "@/data/scrim-overview-dto";
import { getAjaxes } from "@/lib/analytics";
import { calculateMVPScoresForMap } from "@/lib/mvp-score";
import prisma from "@/lib/prisma";
import {
  cn,
  groupEventsIntoFights,
  groupKillsIntoFights,
  range,
  removeDuplicateRows,
  round,
  toTimestamp,
} from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import {
  getHeroRole,
  heroPriority,
  heroRoleMapping,
  ROLE_SUBROLES,
  SUBROLE_DISPLAY_NAMES,
  type HeroName,
  type RoleName,
  type SubroleName,
} from "@/types/heroes";
import { $Enums, type Kill } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function DefaultOverview({
  id,
  team1Color: team1,
  team2Color: team2,
}: {
  id: number;
  team1Color: string;
  team2Color: string;
}) {
  const [finalRound, matchDetails, finalRoundStats, playerStats, fights] =
    await Promise.all([
      prisma.roundEnd.findFirst({
        where: { MapDataId: id },
        orderBy: { round_number: "desc" },
      }),
      prisma.matchStart.findFirst({ where: { MapDataId: id } }),
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

  const [ultimateKills, ultimateStarts, ultCalcStats] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: id, event_ability: "Ultimate" },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: id },
      orderBy: { match_time: "asc" },
    }),
    prisma.calculatedStat.findMany({
      where: {
        MapDataId: id,
        stat: {
          in: ["AVERAGE_ULT_CHARGE_TIME", "AVERAGE_TIME_TO_USE_ULT"],
        },
      },
    }),
  ]);

  const team1UltimateKills = ultimateKills.filter(
    (kill) => kill.attacker_team === matchDetails?.team_1_name
  ).length;

  const team2UltimateKills = ultimateKills.filter(
    (kill) => kill.attacker_team === matchDetails?.team_2_name
  ).length;

  const team1Name = matchDetails?.team_1_name ?? "Team 1";
  const team2Name = matchDetails?.team_2_name ?? "Team 2";

  const team1Ults = ultimateStarts.filter((u) => u.player_team === team1Name);
  const team2Ults = ultimateStarts.filter((u) => u.player_team === team2Name);

  // Build fights that include ult events in the event stream so fight windows
  // expand to cover ultimates used outside kill-only activity. The original
  // `fights` (kill-only) is kept for first-death analysis.
  const mergedEvents: Kill[] = [
    ...fights.flatMap((f) => f.kills),
    ...ultimateStarts.map(
      (ult): Kill => ({
        id: ult.id,
        scrimId: ult.scrimId,
        event_type: "ultimate_start" as Kill["event_type"],
        match_time: ult.match_time,
        attacker_team: ult.player_team,
        attacker_name: ult.player_name,
        attacker_hero: ult.player_hero,
        victim_team: "",
        victim_name: "",
        victim_hero: "",
        event_ability: "Ultimate",
        event_damage: 0,
        is_critical_hit: "0",
        is_environmental: "0",
        MapDataId: ult.MapDataId,
      })
    ),
  ];
  mergedEvents.sort((a, b) => a.match_time - b.match_time);
  const fightsWithUlts = groupEventsIntoFights(mergedEvents);

  const roles: RoleName[] = ["Tank", "Damage", "Support"];

  const firstUltByRolePerFight: Record<
    RoleName,
    { team1First: number; team2First: number; total: number }
  > = {
    Tank: { team1First: 0, team2First: 0, total: 0 },
    Damage: { team1First: 0, team2First: 0, total: 0 },
    Support: { team1First: 0, team2First: 0, total: 0 },
  };

  const team1FightInitiatingUlts = new Map<string, number>();
  const team2FightInitiatingUlts = new Map<string, number>();
  let team1InitiatedWithUlt = 0;
  let team2InitiatedWithUlt = 0;
  let fightsWithUltsCount = 0;

  type SubroleTimingAccum = {
    count: number;
    initiation: number;
    midfight: number;
    late: number;
  };
  function emptyAccum(): SubroleTimingAccum {
    return { count: 0, initiation: 0, midfight: 0, late: 0 };
  }
  const team1SubroleTimingByRole = new Map<
    RoleName,
    Map<SubroleName, SubroleTimingAccum>
  >();
  const team2SubroleTimingByRole = new Map<
    RoleName,
    Map<SubroleName, SubroleTimingAccum>
  >();
  for (const role of roles) {
    const inner1 = new Map<SubroleName, SubroleTimingAccum>();
    const inner2 = new Map<SubroleName, SubroleTimingAccum>();
    for (const sr of ROLE_SUBROLES[role]) {
      inner1.set(sr, emptyAccum());
      inner2.set(sr, emptyAccum());
    }
    team1SubroleTimingByRole.set(role, inner1);
    team2SubroleTimingByRole.set(role, inner2);
  }

  function buildPlayerUltSummary(ults: typeof ultimateStarts) {
    const map = new Map<string, PlayerUltSummary>();
    for (const u of ults) {
      let entry = map.get(u.player_name);
      if (!entry) {
        entry = { heroCountMap: new Map(), totalCount: 0 };
        map.set(u.player_name, entry);
      }
      entry.totalCount++;
      entry.heroCountMap.set(
        u.player_hero,
        (entry.heroCountMap.get(u.player_hero) ?? 0) + 1
      );
    }
    return map;
  }

  const team1UltSummary = buildPlayerUltSummary(team1Ults);
  const team2UltSummary = buildPlayerUltSummary(team2Ults);

  const team1PlayerSubrole = new Map<string, SubroleName>();
  for (const [sr, candidate] of assignPlayersToSubroles(team1UltSummary)) {
    team1PlayerSubrole.set(candidate.playerName, sr);
  }
  const team2PlayerSubrole = new Map<string, SubroleName>();
  for (const [sr, candidate] of assignPlayersToSubroles(team2UltSummary)) {
    team2PlayerSubrole.set(candidate.playerName, sr);
  }

  for (const fight of fightsWithUlts) {
    const fightUlts = ultimateStarts.filter(
      (u) => u.match_time >= fight.start && u.match_time <= fight.end + 15
    );

    if (fightUlts.length > 0) {
      const opener = fightUlts[0];
      fightsWithUltsCount++;
      if (opener.player_team === team1Name) team1InitiatedWithUlt++;
      else team2InitiatedWithUlt++;

      const heroKey = opener.player_hero;
      const teamMap =
        opener.player_team === team1Name
          ? team1FightInitiatingUlts
          : team2FightInitiatingUlts;
      teamMap.set(heroKey, (teamMap.get(heroKey) ?? 0) + 1);
    }

    for (const role of roles) {
      const firstForRole = fightUlts.find(
        (u) => getHeroRole(u.player_hero) === role
      );
      if (!firstForRole) continue;
      firstUltByRolePerFight[role].total++;
      if (firstForRole.player_team === team1Name) {
        firstUltByRolePerFight[role].team1First++;
      } else {
        firstUltByRolePerFight[role].team2First++;
      }
    }

    const fightDuration = fight.end + 15 - fight.start;
    const thirdDuration = fightDuration / 3;
    for (const ult of fightUlts) {
      const isTeam1 = ult.player_team === team1Name;
      const playerLookup = isTeam1 ? team1PlayerSubrole : team2PlayerSubrole;
      const subrole = playerLookup.get(ult.player_name);
      if (!subrole) continue;
      const role = getHeroRole(ult.player_hero);

      const timingMap = isTeam1
        ? team1SubroleTimingByRole
        : team2SubroleTimingByRole;
      const accum = timingMap.get(role)?.get(subrole);
      if (!accum) continue;
      accum.count++;

      const elapsed = ult.match_time - fight.start;
      if (fightDuration <= 0 || elapsed < thirdDuration) {
        accum.initiation++;
      } else if (elapsed < thirdDuration * 2) {
        accum.midfight++;
      } else {
        accum.late++;
      }
    }
  }

  function topFromMap(
    map: Map<string, number>
  ): { hero: string; count: number } | null {
    let best: { hero: string; count: number } | null = null;
    for (const [hero, count] of map) {
      if (!best || count > best.count) best = { hero, count };
    }
    return best;
  }
  const team1TopFightInitiator = topFromMap(team1FightInitiatingUlts);
  const team2TopFightInitiator = topFromMap(team2FightInitiatingUlts);

  function buildSubroleTimings(
    timingMap: Map<RoleName, Map<SubroleName, SubroleTimingAccum>>,
    role: RoleName
  ) {
    const result: {
      subrole: string;
      count: number;
      initiation: number;
      midfight: number;
      late: number;
    }[] = [];
    const inner = timingMap.get(role)!;
    for (const sr of ROLE_SUBROLES[role]) {
      const accum = inner.get(sr)!;
      if (accum.count > 0) {
        result.push({
          subrole: SUBROLE_DISPLAY_NAMES[sr],
          count: accum.count,
          initiation: accum.initiation,
          midfight: accum.midfight,
          late: accum.late,
        });
      }
    }
    return result;
  }

  function allTimingsForTeam(
    timingMap: Map<RoleName, Map<SubroleName, SubroleTimingAccum>>
  ) {
    return roles.flatMap((role) => buildSubroleTimings(timingMap, role));
  }

  const team1AllTimings = allTimingsForTeam(team1SubroleTimingByRole);
  const team2AllTimings = allTimingsForTeam(team2SubroleTimingByRole);

  function topUltUser(ults: typeof ultimateStarts) {
    const counts = new Map<string, { hero: string; count: number }>();
    for (const u of ults) {
      const entry = counts.get(u.player_name);
      if (entry) entry.count++;
      else counts.set(u.player_name, { hero: u.player_hero, count: 1 });
    }
    let best: { name: string; hero: string; count: number } | null = null;
    for (const [name, { hero, count }] of counts) {
      if (!best || count > best.count) best = { name, hero, count };
    }
    return best;
  }

  const team1TopUlt = topUltUser(team1Ults);
  const team2TopUlt = topUltUser(team2Ults);

  const playerComparisons = buildPlayerUltComparisons(
    team1UltSummary,
    team2UltSummary
  );

  function teamAvgStat(stat: string, teamPlayers: string[]) {
    const values = ultCalcStats
      .filter((s) => s.stat === stat && teamPlayers.includes(s.playerName))
      .map((s) => s.value)
      .filter((v) => v > 0);
    return values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  const team1PlayerNames = finalRoundStats
    .filter((p) => p.player_team === team1Name)
    .map((p) => p.player_name);
  const team2PlayerNames = finalRoundStats
    .filter((p) => p.player_team === team2Name)
    .map((p) => p.player_name);

  const team1AvgChargeTime = teamAvgStat(
    "AVERAGE_ULT_CHARGE_TIME",
    team1PlayerNames
  );
  const team2AvgChargeTime = teamAvgStat(
    "AVERAGE_ULT_CHARGE_TIME",
    team2PlayerNames
  );
  const team1AvgHoldTime = teamAvgStat(
    "AVERAGE_TIME_TO_USE_ULT",
    team1PlayerNames
  );
  const team2AvgHoldTime = teamAvgStat(
    "AVERAGE_TIME_TO_USE_ULT",
    team2PlayerNames
  );

  function computeMapUltEfficiency(teamName: string): UltEfficiency {
    let fightsWon = 0;
    let fightsLost = 0;
    let ultsInWon = 0;
    let ultsInLost = 0;
    let wasted = 0;
    let totalUlts = 0;
    let dryCount = 0;
    let dryWins = 0;

    for (const fight of fightsWithUlts) {
      const fightUlts = ultimateStarts.filter(
        (u) =>
          u.player_team === teamName &&
          u.match_time >= fight.start &&
          u.match_time <= fight.end + 15
      );
      const ultCount = fightUlts.length;

      let ourKills = 0;
      let enemyKills = 0;
      for (const k of fight.kills) {
        if (k.event_type === "mercy_rez") {
          if (k.victim_team === teamName)
            enemyKills = Math.max(0, enemyKills - 1);
          else ourKills = Math.max(0, ourKills - 1);
        } else if (k.event_type === "kill") {
          if (k.attacker_team === teamName) ourKills++;
          else enemyKills++;
        }
      }
      const won = ourKills > enemyKills;

      if (ultCount === 0) {
        dryCount++;
        if (won) dryWins++;
      } else {
        totalUlts += ultCount;
        if (won) {
          fightsWon++;
          ultsInWon += ultCount;
        } else {
          fightsLost++;
          ultsInLost += ultCount;
        }

        const sortedKills = [...fight.kills].sort(
          (a, b) => a.match_time - b.match_time
        );
        for (const ult of fightUlts) {
          let runOur = 0;
          let runEnemy = 0;
          for (const k of sortedKills) {
            if (k.match_time > ult.match_time) break;
            if (k.event_type === "mercy_rez") {
              if (k.victim_team === teamName)
                runEnemy = Math.max(0, runEnemy - 1);
              else runOur = Math.max(0, runOur - 1);
            } else if (k.event_type === "kill") {
              if (k.attacker_team === teamName) runOur++;
              else runEnemy++;
            }
          }
          if (runOur - runEnemy <= -3) wasted++;
        }
      }
    }

    const nonDry = fightsWon + fightsLost;
    return {
      ultimateEfficiency: totalUlts > 0 ? fightsWon / totalUlts : 0,
      avgUltsInWonFights: fightsWon > 0 ? ultsInWon / fightsWon : 0,
      avgUltsInLostFights: fightsLost > 0 ? ultsInLost / fightsLost : 0,
      wastedUltimates: wasted,
      totalUltsUsedInFights: totalUlts,
      fightsWon,
      fightsLost,
      dryFights: dryCount,
      dryFightWins: dryWins,
      dryFightWinrate: dryCount > 0 ? (dryWins / dryCount) * 100 : 0,
      nonDryFights: nonDry,
    };
  }

  const team1UltEfficiency = computeMapUltEfficiency(team1Name);
  const team2UltEfficiency = computeMapUltEfficiency(team2Name);

  type Accumulator = { [key: string]: number };

  const firstDeaths = fights
    .map((fight) => fight.kills[0].victim_name)
    .reduce((acc: Accumulator, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

  const teamFirstDeathCounts = new Map<string, number>();
  for (const fight of fights) {
    const teamsSeen = new Set<string>();
    for (const kill of fight.kills) {
      if (kill.event_type !== "kill" || teamsSeen.has(kill.victim_team))
        continue;
      teamsSeen.add(kill.victim_team);
      teamFirstDeathCounts.set(
        kill.victim_name,
        (teamFirstDeathCounts.get(kill.victim_name) ?? 0) + 1
      );
    }
  }

  const fightCount = fights.length;
  const playerFirstDeathStats = new Map<
    string,
    { firstDeathRate: number; teamFirstDeathRate: number }
  >();
  const allPlayerNames = new Set(finalRoundStats.map((s) => s.player_name));
  for (const name of allPlayerNames) {
    playerFirstDeathStats.set(name, {
      firstDeathRate:
        fightCount > 0 ? ((firstDeaths[name] ?? 0) / fightCount) * 100 : 0,
      teamFirstDeathRate:
        fightCount > 0
          ? ((teamFirstDeathCounts.get(name) ?? 0) / fightCount) * 100
          : 0,
    });
  }

  const playerWithMostFirstDeaths =
    Object.keys(firstDeaths).length > 0
      ? Object.keys(firstDeaths).reduce((a, b) =>
          firstDeaths[a] > firstDeaths[b] ? a : b
        )
      : "null";

  const lucioPlayers = finalRoundStats.filter(
    (player) => player.player_hero === "Lúcio"
  );

  const mvpScores = await calculateMVPScoresForMap(id);

  const team1Players = mvpScores.filter(
    (score) =>
      finalRoundStats.find((stat) => stat.player_name === score.playerName)
        ?.player_team === matchDetails?.team_1_name
  );

  const team2Players = mvpScores.filter(
    (score) =>
      finalRoundStats.find((stat) => stat.player_name === score.playerName)
        ?.player_team === matchDetails?.team_2_name
  );

  const team1MVP = team1Players[0]?.playerName ?? "";
  const team2MVP = team2Players[0]?.playerName ?? "";

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
                    style={{
                      color:
                        winner === matchDetails?.team_1_name ? team1 : team2,
                    }}
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
              {round(team1Damage).toLocaleString()} -{" "}
              {round(team2Damage).toLocaleString()}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              {team1Damage > team2Damage
                ? t.rich("dealtMore", {
                    color: (chunks) => (
                      <span style={{ color: team1 }}>{chunks}</span>
                    ),
                    teamName: matchDetails?.team_1_name ?? "",
                  })
                : t.rich("dealtMore", {
                    color: (chunks) => (
                      <span style={{ color: team2 }}>{chunks}</span>
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
              {round(team1Healing).toLocaleString()} -{" "}
              {round(team2Healing).toLocaleString()}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              {team1Healing > team2Healing
                ? t.rich("healedMore", {
                    color: (chunks) => (
                      <span style={{ color: team1 }}>{chunks}</span>
                    ),
                    teamName: matchDetails?.team_1_name ?? "",
                  })
                : t.rich("healedMore", {
                    color: (chunks) => (
                      <span style={{ color: team2 }}>{chunks}</span>
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
            <OverviewTable
              playerStats={finalRoundStats}
              team1Name={matchDetails?.team_1_name ?? ""}
              team2Name={matchDetails?.team_2_name ?? ""}
              team1MVP={team1MVP}
              team2MVP={team2MVP}
              mvpScores={mvpScores}
              firstDeathStats={playerFirstDeathStats}
            />
          </CardContent>
          <CardContent className="hidden md:flex">
            {numberOfRounds === 1 ? (
              <OverviewTable
                playerStats={finalRoundStats}
                team1Name={matchDetails?.team_1_name ?? ""}
                team2Name={matchDetails?.team_2_name ?? ""}
                team1MVP={team1MVP}
                team2MVP={team2MVP}
                mvpScores={mvpScores}
                firstDeathStats={playerFirstDeathStats}
              />
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
                  <OverviewTable
                    playerStats={finalRoundStats}
                    team1Name={matchDetails?.team_1_name ?? ""}
                    team2Name={matchDetails?.team_2_name ?? ""}
                    team1MVP={team1MVP}
                    team2MVP={team2MVP}
                    mvpScores={mvpScores}
                    firstDeathStats={playerFirstDeathStats}
                  />
                </TabsContent>
                {range(numberOfRounds).map((round) => (
                  <TabsContent
                    key={round}
                    value={round.toString()}
                    className="space-y-4"
                  >
                    <OverviewTable
                      key={round + 1}
                      team1Name={matchDetails?.team_1_name ?? ""}
                      team2Name={matchDetails?.team_2_name ?? ""}
                      team1MVP={team1MVP}
                      team2MVP={team2MVP}
                      mvpScores={mvpScores}
                      firstDeathStats={playerFirstDeathStats}
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
            <div
              className={cn(
                "gap-6",
                playerComparisons.length > 0 ||
                  team1AllTimings.length > 0 ||
                  team2AllTimings.length > 0
                  ? "grid grid-cols-1 lg:grid-cols-2"
                  : ""
              )}
            >
              <ul className="list-outside list-disc pl-4">
                <li>
                  {t.rich("analysis.deathDescriptionTeam1", {
                    span1: (chunks) => (
                      <span style={{ color: team1 }}>{chunks}</span>
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
                      <span style={{ color: team2 }}>{chunks}</span>
                    ),
                    team2Name: matchDetails?.team_2_name ?? "",
                    team2FirstDeaths: fights.length - team1FirstDeaths,
                    span2: (chunks) => (
                      <span
                        className={cn(
                          (fights.length - team1FirstDeaths) / fights.length >
                            0.5
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
                        <span style={{ color: team1 }}>{chunks}</span>
                      ),
                      team1Name: matchDetails?.team_1_name ?? "",
                      team1UltimateKills,
                    })}

                  {team1UltimateKills < team2UltimateKills &&
                    t.rich("analysis.ultKillsDescriptionTeam2", {
                      span: (chunks) => (
                        <span style={{ color: team2 }}>{chunks}</span>
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
                        style={{
                          color:
                            finalRoundStats.find(
                              (player) =>
                                player.player_name === playerWithMostFirstDeaths
                            )?.player_team === matchDetails?.team_1_name
                              ? team1
                              : team2,
                        }}
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
                                style={{
                                  color:
                                    player.player_team ===
                                    matchDetails?.team_1_name
                                      ? team1
                                      : team2,
                                }}
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
                {(team1Ults.length > 0 || team2Ults.length > 0) && (
                  <>
                    <li>
                      {t.rich("analysis.ultUsageComparison", {
                        span1: (chunks) => (
                          <span style={{ color: team1 }}>{chunks}</span>
                        ),
                        team1Name,
                        team1Count: team1Ults.length,
                        span2: (chunks) => (
                          <span style={{ color: team2 }}>{chunks}</span>
                        ),
                        team2Name,
                        team2Count: team2Ults.length,
                      })}
                    </li>
                    {roles.map((role) => {
                      const data = firstUltByRolePerFight[role];
                      if (data.total === 0) return null;
                      const team1Rate = (data.team1First / data.total) * 100;
                      const team2Rate = (data.team2First / data.total) * 100;
                      const leader =
                        team1Rate >= team2Rate
                          ? { name: team1Name, color: team1, pct: team1Rate }
                          : { name: team2Name, color: team2, pct: team2Rate };
                      const t1Timings = buildSubroleTimings(
                        team1SubroleTimingByRole,
                        role
                      );
                      const t2Timings = buildSubroleTimings(
                        team2SubroleTimingByRole,
                        role
                      );
                      const allTimings = [
                        ...t1Timings.map((s) => ({
                          ...s,
                          teamName: team1Name,
                          color: team1,
                        })),
                        ...t2Timings.map((s) => ({
                          ...s,
                          teamName: team2Name,
                          color: team2,
                        })),
                      ];
                      const totalSubroleCount = allTimings.reduce(
                        (sum, s) => sum + s.count,
                        0
                      );
                      return (
                        <li key={role}>
                          {t.rich("analysis.ultRoleFirst", {
                            span: (chunks) => (
                              <span style={{ color: leader.color }}>
                                {chunks}
                              </span>
                            ),
                            pct: (chunks) => (
                              <span
                                className={cn(
                                  leader.pct > 50
                                    ? "text-green-500"
                                    : "text-red-500",
                                  leader.pct === 50 && "text-purple-500"
                                )}
                              >
                                {chunks}
                              </span>
                            ),
                            teamName: leader.name,
                            role,
                            percentage: leader.pct.toFixed(1),
                          })}
                          {allTimings.length > 0 && (
                            <ul className="text-muted-foreground mt-1 ml-4 space-y-0.5 text-xs">
                              {allTimings.map((sr) => (
                                <li key={`${sr.teamName}-${sr.subrole}`}>
                                  <span style={{ color: sr.color }}>
                                    {sr.teamName}
                                  </span>{" "}
                                  {sr.subrole}:{" "}
                                  <span className="text-foreground font-semibold tabular-nums">
                                    {sr.count}
                                  </span>{" "}
                                  {sr.count === 1 ? "ultimate" : "ultimates"} (
                                  {totalSubroleCount > 0
                                    ? (
                                        (sr.count / totalSubroleCount) *
                                        100
                                      ).toFixed(0)
                                    : 0}
                                  %) &mdash;{" "}
                                  <span className="text-green-500">
                                    {sr.initiation} initiation
                                  </span>
                                  ,{" "}
                                  <span className="text-yellow-500">
                                    {sr.midfight} midfight
                                  </span>
                                  ,{" "}
                                  <span className="text-red-500">
                                    {sr.late} late
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                    {fightsWithUltsCount > 0 && (
                      <>
                        <li>
                          {(() => {
                            const team1Rate =
                              (team1InitiatedWithUlt / fightsWithUltsCount) *
                              100;
                            const team2Rate =
                              (team2InitiatedWithUlt / fightsWithUltsCount) *
                              100;
                            const leader =
                              team1Rate >= team2Rate
                                ? {
                                    name: team1Name,
                                    color: team1,
                                    pct: team1Rate,
                                    count: team1InitiatedWithUlt,
                                  }
                                : {
                                    name: team2Name,
                                    color: team2,
                                    pct: team2Rate,
                                    count: team2InitiatedWithUlt,
                                  };
                            return t.rich("analysis.ultFightInitiator", {
                              span: (chunks) => (
                                <span style={{ color: leader.color }}>
                                  {chunks}
                                </span>
                              ),
                              pct: (chunks) => (
                                <span
                                  className={cn(
                                    leader.pct > 50
                                      ? "text-green-500"
                                      : "text-red-500",
                                    leader.pct === 50 && "text-purple-500"
                                  )}
                                >
                                  {chunks}
                                </span>
                              ),
                              teamName: leader.name,
                              percentage: leader.pct.toFixed(1),
                              count: leader.count,
                              total: fightsWithUltsCount,
                            });
                          })()}
                        </li>
                        {team1TopFightInitiator && (
                          <li>
                            {t.rich("analysis.ultTopFightOpenerTeam", {
                              span: (chunks) => (
                                <span className="font-semibold">{chunks}</span>
                              ),
                              b: (chunks) => (
                                <span className="font-semibold tabular-nums">
                                  {chunks}
                                </span>
                              ),
                              teamName: team1Name,
                              hero: team1TopFightInitiator.hero,
                              count: team1TopFightInitiator.count,
                            })}
                          </li>
                        )}
                        {team2TopFightInitiator && (
                          <li>
                            {t.rich("analysis.ultTopFightOpenerTeam", {
                              span: (chunks) => (
                                <span className="font-semibold">{chunks}</span>
                              ),
                              b: (chunks) => (
                                <span className="font-semibold tabular-nums">
                                  {chunks}
                                </span>
                              ),
                              teamName: team2Name,
                              hero: team2TopFightInitiator.hero,
                              count: team2TopFightInitiator.count,
                            })}
                          </li>
                        )}
                      </>
                    )}
                    {team1TopUlt && (
                      <li>
                        {t.rich("analysis.ultTopUser", {
                          span: (chunks) => (
                            <span style={{ color: team1 }}>{chunks}</span>
                          ),
                          playerName: team1TopUlt.name,
                          hero: team1TopUlt.hero,
                          count: team1TopUlt.count,
                          teamName: team1Name,
                        })}
                      </li>
                    )}
                    {team2TopUlt && (
                      <li>
                        {t.rich("analysis.ultTopUser", {
                          span: (chunks) => (
                            <span style={{ color: team2 }}>{chunks}</span>
                          ),
                          playerName: team2TopUlt.name,
                          hero: team2TopUlt.hero,
                          count: team2TopUlt.count,
                          teamName: team2Name,
                        })}
                      </li>
                    )}
                    {(team1AvgChargeTime > 0 || team2AvgChargeTime > 0) && (
                      <li>
                        {t.rich("analysis.ultAvgChargeTime", {
                          span1: (chunks) => (
                            <span style={{ color: team1 }}>{chunks}</span>
                          ),
                          span2: (chunks) => (
                            <span style={{ color: team2 }}>{chunks}</span>
                          ),
                          team1Name,
                          team2Name,
                          team1Time: team1AvgChargeTime.toFixed(1),
                          team2Time: team2AvgChargeTime.toFixed(1),
                        })}
                      </li>
                    )}
                    {(team1AvgHoldTime > 0 || team2AvgHoldTime > 0) && (
                      <li>
                        {t.rich("analysis.ultAvgHoldTime", {
                          span1: (chunks) => (
                            <span style={{ color: team1 }}>{chunks}</span>
                          ),
                          span2: (chunks) => (
                            <span style={{ color: team2 }}>{chunks}</span>
                          ),
                          team1Name,
                          team2Name,
                          team1Time: team1AvgHoldTime.toFixed(1),
                          team2Time: team2AvgHoldTime.toFixed(1),
                        })}
                      </li>
                    )}
                  </>
                )}

                {[
                  {
                    name: team1Name,
                    color: team1,
                    eff: team1UltEfficiency,
                  },
                  {
                    name: team2Name,
                    color: team2,
                    eff: team2UltEfficiency,
                  },
                ].map(
                  ({ name, color, eff }) =>
                    eff.totalUltsUsedInFights > 0 && (
                      <li key={`eff-${name}`}>
                        <span style={{ color }} className="font-semibold">
                          {name}
                        </span>{" "}
                        {t.rich("analysis.ultEfficiency", {
                          b: (chunks) => (
                            <span className="font-semibold tabular-nums">
                              {chunks}
                            </span>
                          ),
                          value: eff.ultimateEfficiency.toFixed(2),
                          rating:
                            eff.ultimateEfficiency >= 0.4
                              ? t("analysis.ultEfficiencyExcellent")
                              : eff.ultimateEfficiency >= 0.25
                                ? t("analysis.ultEfficiencyGood")
                                : eff.ultimateEfficiency >= 0.15
                                  ? t("analysis.ultEfficiencyAverage")
                                  : t("analysis.ultEfficiencyPoor"),
                        })}{" "}
                        {t.rich("analysis.ultWonVsLost", {
                          won: (chunks) => (
                            <span className="font-semibold text-green-600 tabular-nums dark:text-green-400">
                              {chunks}
                            </span>
                          ),
                          lost: (chunks) => (
                            <span className="font-semibold text-red-600 tabular-nums dark:text-red-400">
                              {chunks}
                            </span>
                          ),
                          wonAvg: eff.avgUltsInWonFights.toFixed(1),
                          lostAvg: eff.avgUltsInLostFights.toFixed(1),
                        })}{" "}
                        {eff.avgUltsInWonFights > eff.avgUltsInLostFights
                          ? t("analysis.ultGoodDiscipline")
                          : t("analysis.ultNeedsDiscipline")}
                        {eff.wastedUltimates > 0 && (
                          <>
                            {" "}
                            {t.rich("analysis.ultWasted", {
                              b: (chunks) => (
                                <span className="font-semibold tabular-nums">
                                  {chunks}
                                </span>
                              ),
                              count: eff.wastedUltimates,
                              percentage: (
                                (eff.wastedUltimates /
                                  eff.totalUltsUsedInFights) *
                                100
                              ).toFixed(1),
                            })}
                          </>
                        )}{" "}
                        {t.rich("analysis.ultDryFights", {
                          b: (chunks) => (
                            <span className="font-semibold tabular-nums">
                              {chunks}
                            </span>
                          ),
                          dryCount: eff.dryFights,
                          winrate: eff.dryFightWinrate.toFixed(1),
                          nonDryCount: eff.nonDryFights,
                          nonDryWinrate:
                            eff.nonDryFights > 0
                              ? (
                                  (eff.fightsWon / eff.nonDryFights) *
                                  100
                                ).toFixed(1)
                              : "0.0",
                        })}
                      </li>
                    )
                )}
              </ul>
              {(playerComparisons.length > 0 ||
                team1AllTimings.length > 0 ||
                team2AllTimings.length > 0) && (
                <div className="space-y-6">
                  {playerComparisons.length > 0 && (
                    <div className="min-h-[300px]">
                      <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                        Ultimate Usage by Subrole
                      </h4>
                      <UltComparisonChart
                        comparisons={playerComparisons}
                        teamNames={[team1Name, team2Name] as const}
                      />
                    </div>
                  )}
                  {(team1AllTimings.length > 0 ||
                    team2AllTimings.length > 0) && (
                    <div className="min-h-[300px]">
                      <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                        Ultimate Timing Breakdown
                      </h4>
                      <UltTimingChart
                        team1Timings={team1AllTimings}
                        team2Timings={team2AllTimings}
                        teamNames={[team1Name, team2Name] as const}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
