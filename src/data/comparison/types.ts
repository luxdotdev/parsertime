import type { HeroName } from "@/types/heroes";
import type { CalculatedStat, MapType, PlayerStat } from "@prisma/client";

export type AggregatedStats = {
  eliminations: number;
  finalBlows: number;
  deaths: number;
  allDamageDealt: number;
  barrierDamageDealt: number;
  heroDamageDealt: number;
  healingDealt: number;
  healingReceived: number;
  selfHealing: number;
  damageTaken: number;
  damageBlocked: number;
  defensiveAssists: number;
  offensiveAssists: number;
  ultimatesEarned: number;
  ultimatesUsed: number;
  multikillBest: number;
  multikills: number;
  soloKills: number;
  objectiveKills: number;
  environmentalKills: number;
  environmentalDeaths: number;
  criticalHits: number;
  shotsFired: number;
  shotsHit: number;
  shotsMissed: number;
  scopedShots: number;
  scopedShotsHit: number;
  scopedCriticalHitKills: number;
  heroTimePlayed: number;
  eliminationsPer10: number;
  finalBlowsPer10: number;
  deathsPer10: number;
  allDamagePer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
  healingReceivedPer10: number;
  damageTakenPer10: number;
  damageBlockedPer10: number;
  ultimatesEarnedPer10: number;
  ultimatesUsedPer10: number;
  soloKillsPer10: number;
  objectiveKillsPer10: number;
  defensiveAssistsPer10: number;
  offensiveAssistsPer10: number;
  environmentalKillsPer10: number;
  environmentalDeathsPer10: number;
  multikillsPer10: number;
  barrierDamagePer10: number;
  selfHealingPer10: number;
  firstPicksPer10: number;
  firstDeathsPer10: number;
  mapMvpRate: number;
  ajaxPer10: number;
  weaponAccuracy: number;
  criticalHitAccuracy: number;
  scopedAccuracy: number;
  scopedCriticalHitAccuracy: number;
  fletaDeadliftPercentage: number;
  firstPickPercentage: number;
  firstPickCount: number;
  firstDeathPercentage: number;
  firstDeathCount: number;
  mvpScore: number;
  mapMvpCount: number;
  ajaxCount: number;
  averageUltChargeTime: number;
  averageTimeToUseUlt: number;
  averageDroughtTime: number;
  killsPerUltimate: number;
  duelWinratePercentage: number;
  fightReversalPercentage: number;
  eliminationsPer10StdDev: number;
  deathsPer10StdDev: number;
  allDamagePer10StdDev: number;
  healingDealtPer10StdDev: number;
  firstPickPercentageStdDev: number;
  consistencyScore: number;
};

export type MapBreakdown = {
  mapId: number;
  mapDataId: number;
  mapName: string;
  mapType: MapType;
  scrimId: number;
  scrimName: string;
  date: Date;
  replayCode: string | null;
  heroes: HeroName[];
  stats: PlayerStat & {
    eliminationsPer10?: number;
    deathsPer10?: number;
    allDamagePer10?: number;
    healingDealtPer10?: number;
    damageBlockedPer10?: number;
  };
  calculatedStats: CalculatedStat[];
};

export type TrendsAnalysis = {
  improvingMetrics: {
    metric: string;
    change: number;
    changePercentage: number;
  }[];
  decliningMetrics: {
    metric: string;
    change: number;
    changePercentage: number;
  }[];
  earlyPerformance?: AggregatedStats;
  latePerformance?: AggregatedStats;
};

export type ComparisonStats = {
  playerName: string;
  filteredHeroes: HeroName[];
  mapCount: number;
  mapIds: number[];
  aggregated: AggregatedStats;
  perMapBreakdown: MapBreakdown[];
  trends?: TrendsAnalysis;
  heroBreakdown?: Record<string, AggregatedStats>;
};

export type AvailableMap = {
  id: number;
  name: string;
  scrimId: number;
  scrimName: string;
  date: Date;
  mapType: MapType;
  replayCode: string | null;
  playerHeroes: HeroName[];
};

export type TeamPlayer = {
  name: string;
  mapCount: number;
};

export type GetAvailableMapsParams = {
  teamId: number;
  playerName: string;
  dateFrom?: Date;
  dateTo?: Date;
  mapType?: MapType;
  heroes?: HeroName[];
};
