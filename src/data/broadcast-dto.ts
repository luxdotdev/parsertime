import "server-only";

import { aggregatePlayerStats } from "@/data/comparison-dto";
import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { Prisma, type PlayerStat } from "@prisma/client";

export async function getTournamentBroadcastData(tournamentId: number) {
  const tournament = await findTournamentWithRelations(tournamentId);

  if (!tournament) return null;

  const scrimIds = tournament.matches
    .map((m) => m.scrimId)
    .filter((id): id is number => id !== null);

  if (scrimIds.length === 0) {
    return {
      tournament: formatTournamentMeta(tournament),
      players: [],
    };
  }

  const scrims = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
    select: { maps: true },
  });

  const mapIds: number[] = [];
  for (const scrim of scrims) {
    for (const map of scrim.maps) {
      mapIds.push(map.id);
    }
  }

  if (mapIds.length === 0) {
    return {
      tournament: formatTournamentMeta(tournament),
      players: [],
    };
  }

  const allStats = removeDuplicateRows(
    await prisma.$queryRaw<PlayerStat[]>`
      WITH maxTime AS (
        SELECT MAX("match_time") AS max_time, "MapDataId"
        FROM "PlayerStat"
        WHERE "MapDataId" IN (${Prisma.join(mapIds)})
        GROUP BY "MapDataId"
      )
      SELECT ps.* FROM "PlayerStat" ps
      INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
      WHERE ps."MapDataId" IN (${Prisma.join(mapIds)})
    `
  );

  const allCalcStats = await prisma.calculatedStat.findMany({
    where: { MapDataId: { in: mapIds } },
  });

  const playerStatsMap = new Map<string, PlayerStat[]>();
  for (const stat of allStats) {
    const name = stat.player_name;
    if (!playerStatsMap.has(name)) {
      playerStatsMap.set(name, []);
    }
    playerStatsMap.get(name)!.push(stat);
  }

  const playerCalcStatsMap = new Map<string, (typeof allCalcStats)[number][]>();
  for (const stat of allCalcStats) {
    const name = stat.playerName;
    if (!playerCalcStatsMap.has(name)) {
      playerCalcStatsMap.set(name, []);
    }
    playerCalcStatsMap.get(name)!.push(stat);
  }

  const players = Array.from(playerStatsMap.entries()).map(([name, stats]) => {
    const calcStats = playerCalcStatsMap.get(name) ?? [];
    const aggregated = aggregatePlayerStats(stats, calcStats);

    const heroTimeTotals = new Map<string, number>();
    for (const stat of stats) {
      heroTimeTotals.set(
        stat.player_hero,
        (heroTimeTotals.get(stat.player_hero) ?? 0) + stat.hero_time_played
      );
    }
    const heroesPlayed = Array.from(heroTimeTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([hero]) => hero);
    const primaryHero = heroesPlayed[0] ?? "Unknown";
    const role = heroRoleMapping[primaryHero as HeroName] ?? "Damage";

    const playerTeam = stats[0]?.player_team ?? "Unknown";

    const mapsPlayed = new Set(stats.map((s) => s.MapDataId)).size;

    return {
      name,
      team: playerTeam,
      role,
      heroesPlayed,
      mapsPlayed,
      stats: {
        eliminations: aggregated.eliminations,
        finalBlows: aggregated.finalBlows,
        deaths: aggregated.deaths,
        heroDamageDone: aggregated.heroDamageDealt,
        healingDone: aggregated.healingDealt,
        damageBlocked: aggregated.damageBlocked,
        damageTaken: aggregated.damageTaken,
        offensiveAssists: aggregated.offensiveAssists,
        defensiveAssists: aggregated.defensiveAssists,
        ultimatesUsed: aggregated.ultimatesUsed,
        ultimatesEarned: aggregated.ultimatesEarned,
        multikills: aggregated.multikills,
        multikillBest: aggregated.multikillBest,
        soloKills: aggregated.soloKills,
        objectiveKills: aggregated.objectiveKills,
        environmentalKills: aggregated.environmentalKills,
        criticalHits: aggregated.criticalHits,
        weaponAccuracy: aggregated.weaponAccuracy,
        criticalHitAccuracy: aggregated.criticalHitAccuracy,
        scopedAccuracy: aggregated.scopedAccuracy,
        heroTimePlayed: aggregated.heroTimePlayed,
      },
      per10: {
        eliminationsPer10: aggregated.eliminationsPer10,
        finalBlowsPer10: aggregated.finalBlowsPer10,
        deathsPer10: aggregated.deathsPer10,
        heroDamagePer10: aggregated.heroDamagePer10,
        healingPer10: aggregated.healingDealtPer10,
        damageBlockedPer10: aggregated.damageBlockedPer10,
        damageTakenPer10: aggregated.damageTakenPer10,
        ultimatesUsedPer10: aggregated.ultimatesUsedPer10,
        soloKillsPer10: aggregated.soloKillsPer10,
        offensiveAssistsPer10: aggregated.offensiveAssistsPer10,
        defensiveAssistsPer10: aggregated.defensiveAssistsPer10,
        objectiveKillsPer10: aggregated.objectiveKillsPer10,
      },
      averages: {
        avgKD:
          aggregated.deaths > 0
            ? aggregated.finalBlows / aggregated.deaths
            : aggregated.finalBlows,
        avgMvpScore: aggregated.mvpScore,
        avgFirstPickPct: aggregated.firstPickPercentage,
        avgFirstDeathPct: aggregated.firstDeathPercentage,
        avgDuelWinratePct: aggregated.duelWinratePercentage,
        firstPickCount: aggregated.firstPickCount,
        firstDeathCount: aggregated.firstDeathCount,
        avgUltChargeTime: aggregated.averageUltChargeTime,
        avgKillsPerUltimate: aggregated.killsPerUltimate,
      },
    };
  });

  return {
    tournament: formatTournamentMeta(tournament),
    players,
  };
}

function findTournamentWithRelations(id: number) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: { team: { select: { id: true, name: true, image: true } } },
        orderBy: { seed: "asc" },
      },
      rounds: { orderBy: [{ bracket: "asc" }, { roundNumber: "asc" }] },
      matches: {
        include: {
          team1: true,
          team2: true,
          winner: true,
          round: true,
          maps: { include: { map: true }, orderBy: { gameNumber: "asc" } },
        },
        orderBy: [{ roundId: "asc" }, { bracketPosition: "asc" }],
      },
    },
  });
}

type TournamentWithRelations = NonNullable<
  Awaited<ReturnType<typeof findTournamentWithRelations>>
>;

function formatTournamentMeta(tournament: TournamentWithRelations) {
  return {
    id: tournament.id,
    name: tournament.name,
    format: tournament.format,
    bestOf: tournament.bestOf,
    status: tournament.status,
    teams: tournament.teams.map((t) => ({
      name: t.name,
      seed: t.seed,
      image: t.team?.image ?? null,
      eliminated: t.eliminated,
    })),
    matches: tournament.matches.map((m) => ({
      id: m.id,
      round: m.round.roundName,
      bracket: m.round.bracket,
      bracketPosition: m.bracketPosition,
      team1: m.team1 ? { name: m.team1.name, score: m.team1Score } : null,
      team2: m.team2 ? { name: m.team2.name, score: m.team2Score } : null,
      status: m.status,
      winner: m.winner?.name ?? null,
    })),
  };
}
