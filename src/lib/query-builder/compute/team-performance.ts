import "server-only";

import { calculateMean } from "@/lib/distribution-utils";
import prisma from "@/lib/prisma";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";
import { calculateWinner } from "@/lib/winrate";
import {
  CalculatedStatType,
  type CalculatedStat,
  type MatchStart,
  type ObjectiveCaptured,
  type PayloadProgress,
  type PlayerStat,
  type PointProgress,
  type RoundEnd,
} from "@/generated/prisma/browser";

type Side = "our_team" | "opponent";

type SideTotals = {
  side: Side;
  maps: Set<number>;
  wins: number;
  losses: number;
  timePlayed: number;
  eliminations: number;
  finalBlows: number;
  deaths: number;
  allDamage: number;
  heroDamage: number;
  healing: number;
  healingReceived: number;
  damageTaken: number;
  damageBlocked: number;
  ultimatesEarned: number;
  ultimatesUsed: number;
  soloKills: number;
  objectiveKills: number;
  offensiveAssists: number;
  defensiveAssists: number;
  firstPickCount: number;
  firstDeathCount: number;
  mapMvpCount: number;
  ajaxCount: number;
  calculated: CalculatedStat[];
};

function byMap<T extends { MapDataId: number | null }>(
  rows: T[]
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    if (row.MapDataId == null) continue;
    const bucket = map.get(row.MapDataId);
    if (bucket) bucket.push(row);
    else map.set(row.MapDataId, [row]);
  }
  return map;
}

function emptyTotals(side: Side): SideTotals {
  return {
    side,
    maps: new Set<number>(),
    wins: 0,
    losses: 0,
    timePlayed: 0,
    eliminations: 0,
    finalBlows: 0,
    deaths: 0,
    allDamage: 0,
    heroDamage: 0,
    healing: 0,
    healingReceived: 0,
    damageTaken: 0,
    damageBlocked: 0,
    ultimatesEarned: 0,
    ultimatesUsed: 0,
    soloKills: 0,
    objectiveKills: 0,
    offensiveAssists: 0,
    defensiveAssists: 0,
    firstPickCount: 0,
    firstDeathCount: 0,
    mapMvpCount: 0,
    ajaxCount: 0,
    calculated: [],
  };
}

function averageCalculated(
  stats: CalculatedStat[],
  statType: CalculatedStatType
): number {
  const values = stats
    .filter((stat) => stat.stat === statType)
    .map((stat) => stat.value);
  return values.length > 0 ? calculateMean(values) : 0;
}

function sideFromTeam(teamName: string, ourTeam: string): Side {
  return teamName === ourTeam ? "our_team" : "opponent";
}

function addPlayerStat(totals: SideTotals, stat: PlayerStat) {
  if (stat.MapDataId != null) totals.maps.add(stat.MapDataId);
  totals.timePlayed += stat.hero_time_played;
  totals.eliminations += stat.eliminations;
  totals.finalBlows += stat.final_blows;
  totals.deaths += stat.deaths;
  totals.allDamage += stat.all_damage_dealt;
  totals.heroDamage += stat.hero_damage_dealt;
  totals.healing += stat.healing_dealt;
  totals.healingReceived += stat.healing_received;
  totals.damageTaken += stat.damage_taken;
  totals.damageBlocked += stat.damage_blocked;
  totals.ultimatesEarned += stat.ultimates_earned;
  totals.ultimatesUsed += stat.ultimates_used;
  totals.soloKills += stat.solo_kills;
  totals.objectiveKills += stat.objective_kills;
  totals.offensiveAssists += stat.offensive_assists;
  totals.defensiveAssists += stat.defensive_assists;
}

function addCalculatedStat(totals: SideTotals, stat: CalculatedStat) {
  totals.calculated.push(stat);
  switch (stat.stat) {
    case CalculatedStatType.FIRST_PICK_COUNT:
      totals.firstPickCount += stat.value;
      break;
    case CalculatedStatType.FIRST_DEATH_COUNT:
      totals.firstDeathCount += stat.value;
      break;
    case CalculatedStatType.MAP_MVP_COUNT:
      totals.mapMvpCount += stat.value;
      break;
    case CalculatedStatType.AJAX_COUNT:
      totals.ajaxCount += stat.value;
      break;
  }
}

function finalRound(rounds: RoundEnd[]): RoundEnd | null {
  return rounds.length > 0
    ? rounds.reduce((latest, row) =>
        row.round_number > latest.round_number ? row : latest
      )
    : null;
}

/**
 * Team-level version of the comparison aggregate. It emits one row for our
 * team and one row for the opponent side, using final player snapshots,
 * calculated stats, and calculateWinner() for scoped map outcomes.
 */
export async function computeTeamPerformance(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const mapMeta = buildMapMeta(data);
  const inScope = new Set(scrimIds);
  const scopedMapIds = Array.from(mapMeta.entries())
    .filter(([, meta]) => inScope.has(meta.scrimId) && meta.ourTeam)
    .map(([mapId]) => mapId);
  if (scopedMapIds.length === 0) return [];

  const [playerStats, calculatedStats] = await Promise.all([
    prisma.playerStat.findMany({ where: { MapDataId: { in: scopedMapIds } } }),
    prisma.calculatedStat.findMany({
      where: { MapDataId: { in: scopedMapIds } },
    }),
  ]);

  const totals = {
    our_team: emptyTotals("our_team"),
    opponent: emptyTotals("opponent"),
  } satisfies Record<Side, SideTotals>;

  const maxTimeByMap = new Map<number, number>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const maxTime = maxTimeByMap.get(stat.MapDataId) ?? 0;
    if (stat.match_time > maxTime)
      maxTimeByMap.set(stat.MapDataId, stat.match_time);
  }

  const sideByPlayerMap = new Map<string, Side>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    if (stat.match_time !== maxTimeByMap.get(stat.MapDataId)) continue;
    const ourTeam = mapMeta.get(stat.MapDataId)?.ourTeam;
    if (!ourTeam) continue;

    const side = sideFromTeam(stat.player_team, ourTeam);
    addPlayerStat(totals[side], stat);
    sideByPlayerMap.set(`${stat.MapDataId}\0${stat.player_name}`, side);
  }

  for (const stat of calculatedStats) {
    const side = sideByPlayerMap.get(`${stat.MapDataId}\0${stat.playerName}`);
    if (!side) continue;
    addCalculatedStat(totals[side], stat);
  }

  const matchStartByMap = byMap<MatchStart>(data.matchStarts);
  const roundsByMap = byMap<RoundEnd>(data.finalRounds);
  const capturesByMap = byMap<ObjectiveCaptured>(data.captures);
  const payloadByMap = byMap<PayloadProgress>(data.payloadProgresses);
  const pointByMap = byMap<PointProgress>(data.pointProgresses);

  for (const mapDataId of scopedMapIds) {
    const meta = mapMeta.get(mapDataId);
    const ourTeam = meta?.ourTeam;
    const matchStart = matchStartByMap.get(mapDataId)?.[0] ?? null;
    if (!ourTeam || !matchStart) continue;
    const t1 = matchStart.team_1_name;
    const t2 = matchStart.team_2_name;
    const captures = capturesByMap.get(mapDataId) ?? [];
    const payload = payloadByMap.get(mapDataId) ?? [];
    const point = pointByMap.get(mapDataId) ?? [];
    const winner = calculateWinner({
      matchDetails: matchStart,
      finalRound: finalRound(roundsByMap.get(mapDataId) ?? []),
      team1Captures: captures.filter((row) => row.capturing_team === t1),
      team2Captures: captures.filter((row) => row.capturing_team === t2),
      team1PayloadProgress: payload.filter((row) => row.capturing_team === t1),
      team2PayloadProgress: payload.filter((row) => row.capturing_team === t2),
      team1PointProgress: point.filter((row) => row.capturing_team === t1),
      team2PointProgress: point.filter((row) => row.capturing_team === t2),
    });
    if (winner === "N/A") continue;
    if (winner === ourTeam) {
      totals.our_team.wins++;
      totals.opponent.losses++;
    } else {
      totals.our_team.losses++;
      totals.opponent.wins++;
    }
  }

  return Object.values(totals).map((row) => ({
    side: row.side === "our_team" ? "our team" : "opponent",
    maps: row.maps.size,
    wins: row.wins,
    losses: row.losses,
    hero_time_played: row.timePlayed,
    eliminations: row.eliminations,
    final_blows: row.finalBlows,
    deaths: row.deaths,
    all_damage: row.allDamage,
    hero_damage: row.heroDamage,
    healing: row.healing,
    healing_received: row.healingReceived,
    damage_taken: row.damageTaken,
    damage_blocked: row.damageBlocked,
    ultimates_earned: row.ultimatesEarned,
    ultimates_used: row.ultimatesUsed,
    solo_kills: row.soloKills,
    objective_kills: row.objectiveKills,
    offensive_assists: row.offensiveAssists,
    defensive_assists: row.defensiveAssists,
    first_pick_count: row.firstPickCount,
    first_death_count: row.firstDeathCount,
    map_mvp_count: row.mapMvpCount,
    ajax_count: row.ajaxCount,
    first_pick_percentage: averageCalculated(
      row.calculated,
      CalculatedStatType.FIRST_PICK_PERCENTAGE
    ),
    first_death_percentage: averageCalculated(
      row.calculated,
      CalculatedStatType.FIRST_DEATH_PERCENTAGE
    ),
    mvp_score: averageCalculated(row.calculated, CalculatedStatType.MVP_SCORE),
    map_mvp_rate:
      row.maps.size > 0 ? (row.mapMvpCount / row.maps.size) * 100 : 0,
    average_ult_charge_time: averageCalculated(
      row.calculated,
      CalculatedStatType.AVERAGE_ULT_CHARGE_TIME
    ),
    average_time_to_use_ult: averageCalculated(
      row.calculated,
      CalculatedStatType.AVERAGE_TIME_TO_USE_ULT
    ),
    average_drought_time: averageCalculated(
      row.calculated,
      CalculatedStatType.AVERAGE_DROUGHT_TIME
    ),
    kills_per_ultimate: averageCalculated(
      row.calculated,
      CalculatedStatType.KILLS_PER_ULTIMATE
    ),
    duel_winrate_percentage: averageCalculated(
      row.calculated,
      CalculatedStatType.DUEL_WINRATE_PERCENTAGE
    ),
    fight_reversal_percentage: averageCalculated(
      row.calculated,
      CalculatedStatType.FIGHT_REVERSAL_PERCENTAGE
    ),
  }));
}
