import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { RoleName } from "@/types/heroes";
import { getHeroRole } from "@/types/heroes";
import { cache } from "react";
import type { TeamDateRange } from "./team-shared-data";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  findTeamNameForMapInMemory,
  getBaseTeamData,
} from "./team-shared-data";

export type SwapTimingBucket = {
  bucket: string;
  count: number;
  percentage: number;
};

export type SwapWinrateBucket = {
  label: string;
  wins: number;
  losses: number;
  winrate: number;
  totalMaps: number;
};

export type SwapPair = {
  fromHero: string;
  toHero: string;
  fromRole: RoleName;
  toRole: RoleName;
  count: number;
  timingDistribution: SwapTimingBucket[];
};

export type PlayerSwapStats = {
  playerName: string;
  totalSwaps: number;
  mapsWithSwaps: number;
  mapsWithoutSwaps: number;
  winrateWithSwaps: number;
  winrateWithoutSwaps: number;
  topSwapPair: { fromHero: string; toHero: string } | null;
  topSwapPairCount: number;
};

export type SwapTimingOutcome = {
  label: string;
  wins: number;
  losses: number;
  winrate: number;
  totalMaps: number;
};

export type TeamHeroSwapStats = {
  totalSwaps: number;
  totalMaps: number;
  swapsPerMap: number;
  mapsWithSwaps: number;
  mapsWithoutSwaps: number;
  avgHeroTimeBeforeSwap: number;

  noSwapWinrate: number;
  noSwapWins: number;
  noSwapLosses: number;
  swapWinrate: number;
  swapWins: number;
  swapLosses: number;

  timingDistribution: SwapTimingBucket[];
  winrateBySwapCount: SwapWinrateBucket[];
  topSwapPairs: SwapPair[];
  playerBreakdown: PlayerSwapStats[];
  timingOutcomes: SwapTimingOutcome[];
};

export type SwapRecord = {
  id: number;
  match_time: number;
  player_team: string;
  player_name: string;
  player_hero: string;
  previous_hero: string;
  hero_time_played: number;
  MapDataId: number | null;
};

const UTILITY_SWAP_HEROES = new Set([
  "Symmetra",
  "Lúcio",
  "Juno",
  "Widowmaker",
]);
const UTILITY_HERO_TIME_THRESHOLD = 25;
const ROUND_START_PROXIMITY_THRESHOLD = 15;

export function filterUtilityRoundStartSwaps(
  swaps: SwapRecord[],
  roundStartTimes: number[]
): SwapRecord[] {
  const sortedRoundStarts = [...roundStartTimes].sort((a, b) => a - b);

  function isNearRoundStart(matchTime: number): boolean {
    for (const rs of sortedRoundStarts) {
      if (Math.abs(matchTime - rs) <= ROUND_START_PROXIMITY_THRESHOLD) {
        return true;
      }
      if (rs > matchTime + ROUND_START_PROXIMITY_THRESHOLD) break;
    }
    return false;
  }

  const idsToRemove = new Set<number>();

  const byPlayer = new Map<string, SwapRecord[]>();
  for (const swap of swaps) {
    const existing = byPlayer.get(swap.player_name) ?? [];
    existing.push(swap);
    byPlayer.set(swap.player_name, existing);
  }

  for (const [, playerSwaps] of byPlayer) {
    const sorted = playerSwaps.sort((a, b) => a.match_time - b.match_time);

    for (let i = 0; i < sorted.length; i++) {
      const swap = sorted[i];

      // Pattern 1: Swap TO utility hero then swap BACK (e.g., Kiriko → Juno → Kiriko)
      if (i < sorted.length - 1) {
        const swapBack = sorted[i + 1];
        if (
          UTILITY_SWAP_HEROES.has(swap.player_hero) &&
          swapBack.previous_hero === swap.player_hero &&
          swapBack.hero_time_played < UTILITY_HERO_TIME_THRESHOLD &&
          isNearRoundStart(swap.match_time)
        ) {
          idsToRemove.add(swap.id);
          idsToRemove.add(swapBack.id);
        }
      }

      // Pattern 2: Started round on utility hero, swapped off immediately
      // (e.g., selected Juno at hero screen, swapped to Kiriko after 1s)
      if (
        UTILITY_SWAP_HEROES.has(swap.previous_hero) &&
        swap.hero_time_played < UTILITY_HERO_TIME_THRESHOLD &&
        isNearRoundStart(swap.match_time)
      ) {
        idsToRemove.add(swap.id);
      }
    }
  }

  return swaps.filter((s) => !idsToRemove.has(s.id));
}

function emptyStats(): TeamHeroSwapStats {
  return {
    totalSwaps: 0,
    totalMaps: 0,
    swapsPerMap: 0,
    mapsWithSwaps: 0,
    mapsWithoutSwaps: 0,
    avgHeroTimeBeforeSwap: 0,
    noSwapWinrate: 0,
    noSwapWins: 0,
    noSwapLosses: 0,
    swapWinrate: 0,
    swapWins: 0,
    swapLosses: 0,
    timingDistribution: [],
    winrateBySwapCount: [],
    topSwapPairs: [],
    playerBreakdown: [],
    timingOutcomes: [],
  };
}

async function getTeamHeroSwapStatsUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<TeamHeroSwapStats> {
  const sharedData = await getBaseTeamData(teamId, { dateRange });

  if (sharedData.mapDataIds.length === 0) {
    return emptyStats();
  }

  const [allHeroSwaps, matchEnds, roundStarts] = await Promise.all([
    prisma.heroSwap.findMany({
      where: {
        MapDataId: { in: sharedData.mapDataIds },
        match_time: { not: 0 },
      },
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
    prisma.matchEnd.findMany({
      where: { MapDataId: { in: sharedData.mapDataIds } },
      select: { match_time: true, MapDataId: true },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: { in: sharedData.mapDataIds } },
      select: { match_time: true, MapDataId: true },
    }),
  ]);

  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
  } = sharedData;

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );

  const matchEndTimeMap = new Map<number, number>();
  for (const me of matchEnds) {
    if (me.MapDataId) {
      const existing = matchEndTimeMap.get(me.MapDataId);
      if (!existing || me.match_time > existing) {
        matchEndTimeMap.set(me.MapDataId, me.match_time);
      }
    }
  }

  const roundStartsByMap = new Map<number, number[]>();
  for (const rs of roundStarts) {
    if (rs.MapDataId) {
      const existing = roundStartsByMap.get(rs.MapDataId) ?? [];
      existing.push(rs.match_time);
      roundStartsByMap.set(rs.MapDataId, existing);
    }
  }

  const teamNameByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (teamName) {
      teamNameByMapId.set(mapDataId, teamName);
    }
  }

  const winnerByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const matchDetails = matchStartMap.get(mapDataId) ?? null;
    const finalRound = finalRoundMap.get(mapDataId) ?? null;
    const winner = calculateWinner({
      matchDetails,
      finalRound,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
    });
    winnerByMapId.set(mapDataId, winner);
  }

  const swapsByMap = new Map<number, SwapRecord[]>();
  for (const swap of allHeroSwaps) {
    if (!swap.MapDataId) continue;
    const ourTeam = teamNameByMapId.get(swap.MapDataId);
    if (!ourTeam || swap.player_team !== ourTeam) continue;

    const existing = swapsByMap.get(swap.MapDataId) ?? [];
    existing.push(swap);
    swapsByMap.set(swap.MapDataId, existing);
  }

  const filteredSwapsByMap = new Map<number, SwapRecord[]>();
  for (const [mapId, mapSwaps] of swapsByMap) {
    const rsTimesForMap = roundStartsByMap.get(mapId) ?? [];
    const filtered = filterUtilityRoundStartSwaps(mapSwaps, rsTimesForMap);
    if (filtered.length > 0) {
      filteredSwapsByMap.set(mapId, filtered);
    }
  }

  const allFilteredSwaps: SwapRecord[] = [];
  for (const swaps of filteredSwapsByMap.values()) {
    allFilteredSwaps.push(...swaps);
  }

  const totalMaps = mapDataIds.length;
  const mapsWithSwaps = filteredSwapsByMap.size;
  const mapsWithoutSwaps = totalMaps - mapsWithSwaps;
  const totalSwaps = allFilteredSwaps.length;
  const swapsPerMap = totalMaps > 0 ? totalSwaps / totalMaps : 0;

  let totalHeroTimeBeforeSwap = 0;
  for (const swap of allFilteredSwaps) {
    totalHeroTimeBeforeSwap += swap.hero_time_played;
  }
  const avgHeroTimeBeforeSwap =
    totalSwaps > 0 ? totalHeroTimeBeforeSwap / totalSwaps : 0;

  let noSwapWins = 0;
  let noSwapLosses = 0;
  let swapWins = 0;
  let swapLosses = 0;

  const swapCountByMap = new Map<number, number>();

  for (const mapDataId of mapDataIds) {
    const ourTeam = teamNameByMapId.get(mapDataId);
    if (!ourTeam) continue;
    const winner = winnerByMapId.get(mapDataId);
    if (winner === "N/A") continue;

    const isWin = winner === ourTeam;
    const mapSwapCount = filteredSwapsByMap.get(mapDataId)?.length ?? 0;
    swapCountByMap.set(mapDataId, mapSwapCount);

    if (mapSwapCount === 0) {
      if (isWin) noSwapWins++;
      else noSwapLosses++;
    } else {
      if (isWin) swapWins++;
      else swapLosses++;
    }
  }

  const noSwapTotal = noSwapWins + noSwapLosses;
  const swapTotal = swapWins + swapLosses;
  const noSwapWinrate = noSwapTotal > 0 ? (noSwapWins / noSwapTotal) * 100 : 0;
  const swapWinrate = swapTotal > 0 ? (swapWins / swapTotal) * 100 : 0;

  const buckets: { label: string; min: number; max: number }[] = [
    { label: "0 swaps", min: 0, max: 0 },
    { label: "1 swap", min: 1, max: 1 },
    { label: "2 swaps", min: 2, max: 2 },
    { label: "3+ swaps", min: 3, max: Infinity },
  ];

  const winrateBySwapCount: SwapWinrateBucket[] = buckets.map((bucket) => {
    let wins = 0;
    let losses = 0;

    for (const mapDataId of mapDataIds) {
      const ourTeam = teamNameByMapId.get(mapDataId);
      if (!ourTeam) continue;
      const winner = winnerByMapId.get(mapDataId);
      if (winner === "N/A") continue;

      const count = swapCountByMap.get(mapDataId) ?? 0;
      if (count >= bucket.min && count <= bucket.max) {
        if (winner === ourTeam) wins++;
        else losses++;
      }
    }

    const total = wins + losses;
    return {
      label: bucket.label,
      wins,
      losses,
      winrate: total > 0 ? (wins / total) * 100 : 0,
      totalMaps: total,
    };
  });

  const timingBuckets = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${(i + 1) * 10}%`,
    count: 0,
  }));

  for (const swap of allFilteredSwaps) {
    if (!swap.MapDataId) continue;
    const totalTime = matchEndTimeMap.get(swap.MapDataId);
    if (!totalTime || totalTime <= 0) continue;

    const pct = (swap.match_time / totalTime) * 100;
    const bucketIndex = Math.min(Math.floor(pct / 10), 9);
    timingBuckets[bucketIndex].count++;
  }

  const timingDistribution: SwapTimingBucket[] = timingBuckets.map((b) => ({
    bucket: b.bucket,
    count: b.count,
    percentage: totalSwaps > 0 ? (b.count / totalSwaps) * 100 : 0,
  }));

  const pairCounts = new Map<
    string,
    { from: string; to: string; count: number; buckets: number[] }
  >();
  for (const swap of allFilteredSwaps) {
    const key = `${swap.previous_hero}->${swap.player_hero}`;
    let entry = pairCounts.get(key);
    if (!entry) {
      entry = {
        from: swap.previous_hero,
        to: swap.player_hero,
        count: 0,
        buckets: new Array<number>(10).fill(0),
      };
      pairCounts.set(key, entry);
    }
    entry.count++;

    if (swap.MapDataId) {
      const totalTime = matchEndTimeMap.get(swap.MapDataId);
      if (totalTime && totalTime > 0) {
        const pct = (swap.match_time / totalTime) * 100;
        const bucketIndex = Math.min(Math.floor(pct / 10), 9);
        entry.buckets[bucketIndex]++;
      }
    }
  }

  const topSwapPairs: SwapPair[] = Array.from(pairCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((p) => ({
      fromHero: p.from,
      toHero: p.to,
      fromRole: getHeroRole(p.from),
      toRole: getHeroRole(p.to),
      count: p.count,
      timingDistribution: p.buckets.map((bucketCount, i) => ({
        bucket: `${i * 10}-${(i + 1) * 10}%`,
        count: bucketCount,
        percentage: p.count > 0 ? (bucketCount / p.count) * 100 : 0,
      })),
    }));

  const playerMapsPlayed = new Map<string, Set<number>>();
  for (const stat of allPlayerStats) {
    if (!stat.MapDataId || !teamRosterSet.has(stat.player_name)) continue;
    const ourTeam = teamNameByMapId.get(stat.MapDataId);
    if (!ourTeam || stat.player_team !== ourTeam) continue;

    const existing = playerMapsPlayed.get(stat.player_name) ?? new Set();
    existing.add(stat.MapDataId);
    playerMapsPlayed.set(stat.player_name, existing);
  }

  const playerSwapsByMap = new Map<string, Map<number, SwapRecord[]>>();
  const playerPairCounts = new Map<string, Map<string, number>>();

  for (const swap of allFilteredSwaps) {
    if (!swap.MapDataId) continue;

    let mapMap = playerSwapsByMap.get(swap.player_name);
    if (!mapMap) {
      mapMap = new Map();
      playerSwapsByMap.set(swap.player_name, mapMap);
    }
    const existing = mapMap.get(swap.MapDataId) ?? [];
    existing.push(swap);
    mapMap.set(swap.MapDataId, existing);

    let pairs = playerPairCounts.get(swap.player_name);
    if (!pairs) {
      pairs = new Map();
      playerPairCounts.set(swap.player_name, pairs);
    }
    const pairKey = `${swap.previous_hero}->${swap.player_hero}`;
    pairs.set(pairKey, (pairs.get(pairKey) ?? 0) + 1);
  }

  const playerBreakdown: PlayerSwapStats[] = [];

  for (const [playerName, mapsSet] of playerMapsPlayed) {
    const playerMapSwaps = playerSwapsByMap.get(playerName);
    const mapsWithPlayerSwaps = new Set<number>();
    let totalPlayerSwaps = 0;

    if (playerMapSwaps) {
      for (const [mapId, swaps] of playerMapSwaps) {
        mapsWithPlayerSwaps.add(mapId);
        totalPlayerSwaps += swaps.length;
      }
    }

    const mapsWithout = new Set<number>();
    for (const mapId of mapsSet) {
      if (!mapsWithPlayerSwaps.has(mapId)) {
        mapsWithout.add(mapId);
      }
    }

    let winsWithSwaps = 0;
    let lossesWithSwaps = 0;
    for (const mapId of mapsWithPlayerSwaps) {
      const ourTeam = teamNameByMapId.get(mapId);
      if (!ourTeam) continue;
      const winner = winnerByMapId.get(mapId);
      if (winner === "N/A") continue;
      if (winner === ourTeam) winsWithSwaps++;
      else lossesWithSwaps++;
    }

    let winsWithout = 0;
    let lossesWithout = 0;
    for (const mapId of mapsWithout) {
      const ourTeam = teamNameByMapId.get(mapId);
      if (!ourTeam) continue;
      const winner = winnerByMapId.get(mapId);
      if (winner === "N/A") continue;
      if (winner === ourTeam) winsWithout++;
      else lossesWithout++;
    }

    const totalWith = winsWithSwaps + lossesWithSwaps;
    const totalWithout = winsWithout + lossesWithout;

    let topPairKey: string | null = null;
    let topPairCount = 0;
    const pairs = playerPairCounts.get(playerName);
    if (pairs) {
      for (const [key, count] of pairs) {
        if (count > topPairCount) {
          topPairCount = count;
          topPairKey = key;
        }
      }
    }

    let topSwapPair: PlayerSwapStats["topSwapPair"] = null;
    if (topPairKey) {
      const [from, to] = topPairKey.split("->");
      topSwapPair = { fromHero: from, toHero: to };
    }

    playerBreakdown.push({
      playerName,
      totalSwaps: totalPlayerSwaps,
      mapsWithSwaps: mapsWithPlayerSwaps.size,
      mapsWithoutSwaps: mapsWithout.size,
      winrateWithSwaps: totalWith > 0 ? (winsWithSwaps / totalWith) * 100 : 0,
      winrateWithoutSwaps:
        totalWithout > 0 ? (winsWithout / totalWithout) * 100 : 0,
      topSwapPair,
      topSwapPairCount: topPairCount,
    });
  }

  playerBreakdown.sort((a, b) => b.totalSwaps - a.totalSwaps);

  const timingLabels = ["Early (0-33%)", "Mid (33-66%)", "Late (66-100%)"];
  const timingMapSets: { wins: Set<number>; losses: Set<number> }[] = [
    { wins: new Set(), losses: new Set() },
    { wins: new Set(), losses: new Set() },
    { wins: new Set(), losses: new Set() },
  ];

  for (const swap of allFilteredSwaps) {
    if (!swap.MapDataId) continue;
    const totalTime = matchEndTimeMap.get(swap.MapDataId);
    if (!totalTime || totalTime <= 0) continue;

    const pct = (swap.match_time / totalTime) * 100;
    let timingIndex: number;
    if (pct < 33.33) timingIndex = 0;
    else if (pct < 66.67) timingIndex = 1;
    else timingIndex = 2;

    const ourTeam = teamNameByMapId.get(swap.MapDataId);
    if (!ourTeam) continue;
    const winner = winnerByMapId.get(swap.MapDataId);
    if (winner === "N/A") continue;

    if (winner === ourTeam) {
      timingMapSets[timingIndex].wins.add(swap.MapDataId);
    } else {
      timingMapSets[timingIndex].losses.add(swap.MapDataId);
    }
  }

  const timingOutcomes: SwapTimingOutcome[] = timingLabels.map((label, i) => {
    const wins = timingMapSets[i].wins.size;
    const losses = timingMapSets[i].losses.size;
    const total = wins + losses;
    return {
      label,
      wins,
      losses,
      winrate: total > 0 ? (wins / total) * 100 : 0,
      totalMaps: total,
    };
  });

  return {
    totalSwaps,
    totalMaps,
    swapsPerMap,
    mapsWithSwaps,
    mapsWithoutSwaps,
    avgHeroTimeBeforeSwap,
    noSwapWinrate,
    noSwapWins,
    noSwapLosses,
    swapWinrate,
    swapWins,
    swapLosses,
    timingDistribution,
    winrateBySwapCount,
    topSwapPairs,
    playerBreakdown,
    timingOutcomes,
  };
}

export const getTeamHeroSwapStats = cache(getTeamHeroSwapStatsUncached);
