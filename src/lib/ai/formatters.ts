import type { ScrimOverviewData } from "@/data/scrim-overview-dto";

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function stripNulls<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripNulls) as T;
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== null && value !== undefined) {
        result[key] = stripNulls(value);
      }
    }
    return result as T;
  }
  return obj;
}

export function formatScrimOverview(data: ScrimOverviewData) {
  return stripNulls({
    mapCount: data.mapCount,
    wins: data.wins,
    losses: data.losses,
    draws: data.draws,
    ourTeamName: data.ourTeamName,
    opponentTeamName: data.opponentTeamName,
    mapResults: data.mapResults,
    insights: data.insights,
    teamTotals: data.teamTotals,
    teamPlayers: data.teamPlayers.map((p) => ({
      playerName: p.playerName,
      primaryHero: p.primaryHero,
      heroes: p.heroes,
      mapsPlayed: p.mapsPlayed,
      kdRatio: round(p.kdRatio, 2),
      eliminationsPer10: round(p.eliminationsPer10),
      deathsPer10: round(p.deathsPer10),
      heroDamagePer10: round(p.heroDamagePer10),
      healingDealtPer10: round(p.healingDealtPer10),
      firstDeathRate: round(p.firstDeathRate),
      teamFirstDeathRate: round(p.teamFirstDeathRate),
      trend: p.trend,
      outliers: p.outliers.map((o) => ({
        stat: o.stat,
        label: o.label,
        zScore: round(o.zScore, 2),
        percentile: round(o.percentile),
        direction: o.direction,
      })),
      // Trim per-map to top 3 for brevity
      perMapPerformance: p.perMapPerformance.slice(0, 3).map((m) => ({
        mapName: m.mapName,
        kdRatio: round(m.kdRatio, 2),
        eliminationsPer10: round(m.eliminationsPer10),
        heroDamagePer10: round(m.heroDamagePer10),
        healingDealtPer10: round(m.healingDealtPer10),
      })),
    })),
    fightAnalysis: {
      totalFights: data.fightAnalysis.totalFights,
      fightsWon: data.fightAnalysis.fightsWon,
      fightWinrate: round(data.fightAnalysis.fightWinrate),
      firstPickCount: data.fightAnalysis.firstPickCount,
      firstPickRate: round(data.fightAnalysis.firstPickRate),
      firstPickWinrate: round(data.fightAnalysis.firstPickWinrate),
      teamFirstDeathRate: round(data.fightAnalysis.teamFirstDeathRate),
    },
    ultAnalysis: {
      ourUltsUsed: data.ultAnalysis.ourUltsUsed,
      opponentUltsUsed: data.ultAnalysis.opponentUltsUsed,
      avgChargeTime: round(data.ultAnalysis.avgChargeTime),
      avgHoldTime: round(data.ultAnalysis.avgHoldTime),
      topUltUser: data.ultAnalysis.topUltUser,
      playerComparisons: data.ultAnalysis.playerComparisons.map((p) => ({
        subrole: p.subrole,
        ourPlayerName: p.ourPlayerName,
        ourHero: p.ourHero,
        ourUltCount: p.ourUltCount,
        opponentPlayerName: p.opponentPlayerName,
        opponentHero: p.opponentHero,
        opponentUltCount: p.opponentUltCount,
      })),
      ultEfficiency: {
        ultimateEfficiency: round(
          data.ultAnalysis.ultEfficiency.ultimateEfficiency
        ),
        wastedUltimates: data.ultAnalysis.ultEfficiency.wastedUltimates,
        dryFightWinrate: round(data.ultAnalysis.ultEfficiency.dryFightWinrate),
      },
    },
    swapAnalysis: {
      ourSwaps: data.swapAnalysis.ourSwaps,
      opponentSwaps: data.swapAnalysis.opponentSwaps,
      swapWinrate: round(data.swapAnalysis.swapWinrate),
      noSwapWinrate: round(data.swapAnalysis.noSwapWinrate),
      ourTopSwap: data.swapAnalysis.ourTopSwap,
      topSwapper: data.swapAnalysis.topSwapper,
    },
  });
}

export function formatTeamWinrates(data: {
  overallWins: number;
  overallLosses: number;
  overallWinrate: number;
  byMap: Record<
    string,
    {
      mapName: string;
      totalWins: number;
      totalLosses: number;
      totalWinrate: number;
    }
  >;
}) {
  return {
    overallWins: data.overallWins,
    overallLosses: data.overallLosses,
    overallWinrate: round(data.overallWinrate),
    byMap: Object.fromEntries(
      Object.entries(data.byMap).map(([key, m]) => [
        key,
        {
          mapName: m.mapName,
          wins: m.totalWins,
          losses: m.totalLosses,
          winrate: round(m.totalWinrate),
        },
      ])
    ),
  };
}

export function formatScrimListEntry(scrim: {
  id: number;
  name: string;
  date: Date;
  teamId: number | null;
  maps: { id: number; name: string }[];
}) {
  return {
    id: scrim.id,
    name: scrim.name,
    date: scrim.date.toISOString().split("T")[0],
    teamId: scrim.teamId,
    mapCount: scrim.maps.length,
    maps: scrim.maps.map((m) => ({ id: m.id, name: m.name })),
  };
}
