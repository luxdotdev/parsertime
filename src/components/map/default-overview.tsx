import { AnalysisCardAccordion as AnalysisCard } from "@/components/map/analysis/analysis-card-accordion";
import { MapStatCell } from "@/components/map/map-stat-cell";
import { OverviewTable } from "@/components/map/overview-table";
import {
  KillfeedCalibrationService,
  serializeCalibrationData,
  RotationDeathService,
} from "@/data/map";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ScrimAbilityTimingService, ScrimService } from "@/data/scrim";
import {
  assignPlayersToSubroles,
  buildPlayerUltComparisons,
} from "@/data/scrim/ult-helpers";
import type { PlayerUltSummary, UltEfficiency } from "@/data/scrim/types";
import { positionalData } from "@/lib/flags";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { filterUtilityRoundStartSwaps } from "@/data/team/hero-swap-service";
import { getAjaxes } from "@/lib/analytics";
import { calculateMVPScoresForMap } from "@/lib/mvp-score";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import {
  groupEventsIntoFights,
  groupKillsIntoFights,
  range,
  removeDuplicateRows,
  round,
  toTimestamp,
  ultimateStartToKillEvent,
} from "@/lib/utils";
import { calculatePayloadMapScore, calculateWinner } from "@/lib/winrate";
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
  positionalDataOverride,
}: {
  id: number;
  team1Color: string;
  team2Color: string;
  positionalDataOverride?: boolean;
}) {
  const mapDataId = await resolveMapDataId(id);
  const [finalRound, matchDetails, finalRoundStats, playerStats, fights] =
    await Promise.all([
      prisma.roundEnd.findFirst({
        where: { MapDataId: mapDataId },
        orderBy: { round_number: "desc" },
      }),
      prisma.matchStart.findFirst({ where: { MapDataId: mapDataId } }),
      AppRuntime.runPromise(
        ScrimService.pipe(Effect.flatMap((svc) => svc.getFinalRoundStats(id)))
      ),
      prisma.playerStat.findMany({ where: { MapDataId: mapDataId } }),
      groupKillsIntoFights(id),
    ]);

  const [
    team1Captures,
    team2Captures,
    team1PayloadProgress,
    team2PayloadProgress,
    team1PointProgress,
    team2PointProgress,
  ] = await Promise.all([
    prisma.objectiveCaptured.findMany({
      where: {
        MapDataId: mapDataId,
        capturing_team: matchDetails?.team_1_name ?? "Team 1",
      },
      orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
    }),
    prisma.objectiveCaptured.findMany({
      where: {
        MapDataId: mapDataId,
        capturing_team: matchDetails?.team_2_name ?? "Team 2",
      },
      orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
    }),
    prisma.payloadProgress.findMany({
      where: {
        MapDataId: mapDataId,
        capturing_team: matchDetails?.team_1_name ?? "Team 1",
      },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
    prisma.payloadProgress.findMany({
      where: {
        MapDataId: mapDataId,
        capturing_team: matchDetails?.team_2_name ?? "Team 2",
      },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
    prisma.pointProgress.findMany({
      where: {
        MapDataId: mapDataId,
        capturing_team: matchDetails?.team_1_name ?? "Team 1",
      },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
    prisma.pointProgress.findMany({
      where: {
        MapDataId: mapDataId,
        capturing_team: matchDetails?.team_2_name ?? "Team 2",
      },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
  ]);

  const t = await getTranslations("mapPage.overview");

  const mapType = matchDetails ? matchDetails.map_type : $Enums.MapType.Control;
  const payloadMapScore = calculatePayloadMapScore({
    team1Captures,
    team2Captures,
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
        return `${payloadMapScore.team1} - ${payloadMapScore.team2}`;
      case $Enums.MapType.Flashpoint:
        return `${finalRound?.team_1_score} - ${finalRound?.team_2_score}`;
      case $Enums.MapType.Hybrid:
        return `${payloadMapScore.team1} - ${payloadMapScore.team2}`;
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
    team1PayloadProgress,
    team2PayloadProgress,
    team1PointProgress,
    team2PointProgress,
  });

  const numberOfRounds =
    // prettier-ignore
    mapType === $Enums.MapType.Flashpoint ? 5 : (finalRound?.round_number ?? 1);

  const team1FirstDeaths = fights.filter(
    (fight) => fight.kills[0].victim_team === matchDetails?.team_1_name
  ).length;

  const [ultimateKills, ultimateStarts, ultCalcStats, heroSwaps, roundStarts] =
    await Promise.all([
      prisma.kill.findMany({
        where: { MapDataId: mapDataId, event_ability: "Ultimate" },
      }),
      prisma.ultimateStart.findMany({
        where: { MapDataId: mapDataId },
        orderBy: { match_time: "asc" },
      }),
      prisma.calculatedStat.findMany({
        where: {
          MapDataId: mapDataId,
          stat: {
            in: ["AVERAGE_ULT_CHARGE_TIME", "AVERAGE_TIME_TO_USE_ULT"],
          },
        },
      }),
      prisma.heroSwap.findMany({
        where: { MapDataId: mapDataId, match_time: { not: 0 } },
        select: {
          id: true,
          match_time: true,
          player_team: true,
          player_name: true,
          player_hero: true,
          previous_hero: true,
          hero_time_played: true,
          MapDataId: true,
        },
        orderBy: { match_time: "asc" },
      }),
      prisma.roundStart.findMany({
        where: { MapDataId: mapDataId },
        select: { match_time: true, MapDataId: true },
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

  const positionalEnabled = positionalDataOverride ?? (await positionalData());

  const [abilityTimingAnalysis, rotationDeathAnalysis, killfeedCalibration] =
    await Promise.all([
      AppRuntime.runPromise(
        ScrimAbilityTimingService.pipe(
          Effect.flatMap((svc) =>
            svc.getMapAbilityTiming(id, team1Name, team2Name)
          )
        )
      ),
      positionalEnabled
        ? AppRuntime.runPromise(
            RotationDeathService.pipe(
              Effect.flatMap((svc) => svc.getRotationDeathAnalysis(id))
            )
          )
        : null,
      positionalEnabled
        ? AppRuntime.runPromise(
            KillfeedCalibrationService.pipe(
              Effect.flatMap((svc) => svc.getKillfeedCalibration(id))
            )
          )
        : null,
    ]);

  const team1Ults = ultimateStarts.filter((u) => u.player_team === team1Name);
  const team2Ults = ultimateStarts.filter((u) => u.player_team === team2Name);

  // Build fights that include ult events in the event stream so fight windows
  // expand to cover ultimates used outside kill-only activity. The original
  // `fights` (kill-only) is kept for first-death analysis.
  const mergedEvents: Kill[] = [
    ...fights.flatMap((f) => f.kills),
    ...ultimateStarts.map(ultimateStartToKillEvent),
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
    let dryReversals = 0;
    let nonDryReversals = 0;

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
      let wasDown2Plus = false;
      for (const k of fight.kills) {
        if (k.event_type === "mercy_rez") {
          if (k.victim_team === teamName)
            enemyKills = Math.max(0, enemyKills - 1);
          else ourKills = Math.max(0, ourKills - 1);
        } else if (k.event_type === "kill") {
          if (k.attacker_team === teamName) ourKills++;
          else enemyKills++;
        }
        if (enemyKills - ourKills >= 2) {
          wasDown2Plus = true;
        }
      }
      const won = ourKills > enemyKills;
      const isReversal = won && wasDown2Plus;

      if (ultCount === 0) {
        dryCount++;
        if (won) dryWins++;
        if (isReversal) dryReversals++;
      } else {
        totalUlts += ultCount;
        if (won) {
          fightsWon++;
          ultsInWon += ultCount;
        } else {
          fightsLost++;
          ultsInLost += ultCount;
        }
        if (isReversal) nonDryReversals++;

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
      dryFightReversals: dryReversals,
      dryFightReversalRate: dryCount > 0 ? (dryReversals / dryCount) * 100 : 0,
      nonDryFights: nonDry,
      nonDryFightReversals: nonDryReversals,
      nonDryFightReversalRate:
        nonDry > 0 ? (nonDryReversals / nonDry) * 100 : 0,
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

  const lucioAjaxes = (
    await Promise.all(
      lucioPlayers.map(async (player) => {
        const count = await getAjaxes(id, player.player_name);
        return {
          playerName: player.player_name,
          count,
          teamColor:
            player.player_team === matchDetails?.team_1_name ? team1 : team2,
        };
      })
    )
  ).filter((a) => a.count > 0);

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

  const roundStartTimes = roundStarts.map((rs) => rs.match_time);
  const team1RawSwaps = heroSwaps.filter((s) => s.player_team === team1Name);
  const team2RawSwaps = heroSwaps.filter((s) => s.player_team === team2Name);
  const team1Swaps = filterUtilityRoundStartSwaps(
    team1RawSwaps,
    roundStartTimes
  );
  const team2Swaps = filterUtilityRoundStartSwaps(
    team2RawSwaps,
    roundStartTimes
  );

  function findTopSwapper(swaps: typeof team1Swaps) {
    const counts = new Map<string, number>();
    for (const s of swaps) {
      counts.set(s.player_name, (counts.get(s.player_name) ?? 0) + 1);
    }
    let best: { name: string; count: number } | null = null;
    for (const [name, count] of counts) {
      if (!best || count > best.count) best = { name, count };
    }
    return best;
  }

  function findTopSwapPair(swaps: typeof team1Swaps) {
    const counts = new Map<
      string,
      { from: string; to: string; count: number }
    >();
    for (const s of swaps) {
      const key = `${s.previous_hero}->${s.player_hero}`;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else
        counts.set(key, { from: s.previous_hero, to: s.player_hero, count: 1 });
    }
    let best: { from: string; to: string; count: number } | null = null;
    for (const entry of counts.values()) {
      if (!best || entry.count > best.count) best = entry;
    }
    return best;
  }

  const team1TopSwapper = findTopSwapper(team1Swaps);
  const team2TopSwapper = findTopSwapper(team2Swaps);
  const team1TopPair = findTopSwapPair(team1Swaps);
  const team2TopPair = findTopSwapPair(team2Swaps);

  const damageLeader =
    team1Damage === team2Damage
      ? null
      : team1Damage > team2Damage
        ? { name: matchDetails?.team_1_name ?? "", color: team1 }
        : { name: matchDetails?.team_2_name ?? "", color: team2 };

  const healingLeader =
    team1Healing === team2Healing
      ? null
      : team1Healing > team2Healing
        ? { name: matchDetails?.team_1_name ?? "", color: team1 }
        : { name: matchDetails?.team_2_name ?? "", color: team2 };

  return (
    <section aria-label={t("title")} className="space-y-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        <MapStatCell
          label={t("matchTime")}
          value={toTimestamp(finalRound?.match_time ?? 0)}
          sub={t("minutes", {
            time: ((finalRound?.match_time ?? 0) / 60).toFixed(2),
          })}
        />
        <MapStatCell
          label={t("score")}
          value={calculateScore()}
          sub={
            mapType !== $Enums.MapType.Push ? (
              <>
                {t("winner")}{" "}
                <span
                  style={{
                    color: winner === matchDetails?.team_1_name ? team1 : team2,
                  }}
                >
                  {winner}
                </span>
              </>
            ) : (
              t("pushLimitations")
            )
          }
        />
        <MapStatCell
          label={t("heroDamageDealt")}
          value={`${round(team1Damage).toLocaleString()} – ${round(team2Damage).toLocaleString()}`}
          sub={
            damageLeader
              ? t.rich("dealtMore", {
                  color: (chunks) => (
                    <span style={{ color: damageLeader.color }}>{chunks}</span>
                  ),
                  teamName: damageLeader.name,
                })
              : null
          }
        />
        <MapStatCell
          label={t("teamHealingDealt")}
          value={`${round(team1Healing).toLocaleString()} – ${round(team2Healing).toLocaleString()}`}
          sub={
            healingLeader
              ? t.rich("healedMore", {
                  color: (chunks) => (
                    <span style={{ color: healingLeader.color }}>{chunks}</span>
                  ),
                  teamName: healingLeader.name,
                })
              : null
          }
        />
      </div>

      <Separator />

      <div className="md:hidden">
        <OverviewTable
          playerStats={finalRoundStats}
          team1Name={matchDetails?.team_1_name ?? ""}
          team2Name={matchDetails?.team_2_name ?? ""}
          team1MVP={team1MVP}
          team2MVP={team2MVP}
          mvpScores={mvpScores}
          firstDeathStats={playerFirstDeathStats}
        />
      </div>
      <div className="hidden md:block">
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
          <Tabs defaultValue="final" className="space-y-4">
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
                        round + (mapType === $Enums.MapType.Flashpoint ? 2 : 1)
                    )
                    .sort((a, b) => a.player_name.localeCompare(b.player_name))
                    .sort(
                      (a, b) =>
                        heroPriority[
                          heroRoleMapping[a.player_hero as HeroName]
                        ] -
                        heroPriority[heroRoleMapping[b.player_hero as HeroName]]
                    )
                    .sort((a, b) => a.player_team.localeCompare(b.player_team))}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
      <AnalysisCard
        team1={{ name: team1Name, color: team1 }}
        team2={{ name: team2Name, color: team2 }}
        deaths={{
          team1FirstDeaths,
          totalFights: fights.length,
          playerWithMostFirstDeaths,
          playerFirstDeathCount: firstDeaths[playerWithMostFirstDeaths] ?? 0,
          playerTeamColor:
            finalRoundStats.find(
              (player) => player.player_name === playerWithMostFirstDeaths
            )?.player_team === matchDetails?.team_1_name
              ? team1
              : team2,
          lucioAjaxes,
          fightFirstDeaths: fights.map((fight, i) => {
            const firstKill = fight.kills.find((k) => k.event_type === "kill");
            const victim = firstKill ?? fight.kills[0];
            return {
              fightNumber: i + 1,
              matchTime: victim.match_time,
              victimName: victim.victim_name,
              victimHero: victim.victim_hero,
              victimTeam:
                victim.victim_team === team1Name
                  ? ("team1" as const)
                  : ("team2" as const),
            };
          }),
        }}
        ultimates={{
          team1Count: team1Ults.length,
          team2Count: team2Ults.length,
          team1Kills: team1UltimateKills,
          team2Kills: team2UltimateKills,
          firstUltByRole: firstUltByRolePerFight,
          team1TopUlt,
          team2TopUlt,
          team1TopFightInitiator,
          team2TopFightInitiator,
          team1InitiatedWithUlt,
          team2InitiatedWithUlt,
          fightsWithUltsCount,
          playerComparisons,
        }}
        timing={{
          team1AllTimings,
          team2AllTimings,
        }}
        efficiency={{
          team1: team1UltEfficiency,
          team2: team2UltEfficiency,
          team1AvgChargeTime,
          team2AvgChargeTime,
          team1AvgHoldTime,
          team2AvgHoldTime,
        }}
        swaps={{
          team1Count: team1Swaps.length,
          team2Count: team2Swaps.length,
          team1TopPair,
          team2TopPair,
          team1TopSwapper,
          team2TopSwapper,
        }}
        rotationDeaths={
          rotationDeathAnalysis
            ? {
                team1Count: rotationDeathAnalysis.rotationDeaths.filter(
                  (r) => r.kill.victim_team === team1Name
                ).length,
                team2Count: rotationDeathAnalysis.rotationDeaths.filter(
                  (r) => r.kill.victim_team === team2Name
                ).length,
                totalFights: rotationDeathAnalysis.totalFights,
                events: rotationDeathAnalysis.rotationDeaths.map((r) => ({
                  kill: r.kill,
                  fightIndex: r.fightIndex,
                  fightKills: fights[r.fightIndex]?.kills ?? [r.kill],
                  preFightDamageCount: r.preFightDamageCount,
                  killDistance: r.killDistance,
                  nearbyPlayers: r.nearbyPlayers,
                })),
                playerBreakdown: rotationDeathAnalysis.playerSummaries,
              }
            : null
        }
        calibrationData={serializeCalibrationData(killfeedCalibration)}
        abilityTiming={abilityTimingAnalysis}
        translations={{
          title: t("analysis.title"),
          tabFirstDeaths: t("analysis.tabFirstDeaths"),
          tabUltimates: t("analysis.tabUltimates"),
          tabTiming: t("analysis.tabTiming"),
          tabEfficiency: t("analysis.tabEfficiency"),
          tabSwaps: t("analysis.tabSwaps"),
          tabRotationDeaths: t("analysis.tabRotationDeaths"),
          footerDeaths: t("analysis.footerDeaths"),
          footerUltimates: t("analysis.footerUltimates"),
          footerTiming: t("analysis.footerTiming"),
          footerEfficiency: t("analysis.footerEfficiency"),
          footerSwaps: t("analysis.footerSwaps"),
          footerRotationDeaths: t("analysis.footerRotationDeaths"),
        }}
      />
    </section>
  );
}
