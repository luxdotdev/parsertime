import type { RoleName } from "@/types/heroes";
import type { HeroName } from "@/types/heroes";
import type {
  MatchStart,
  ObjectiveCaptured,
  PayloadProgress,
  PointProgress,
  RoundEnd,
} from "@prisma/client";
import type { $Enums } from "@prisma/client";
import { Schema as S } from "effect";
import type { SubroleUltTiming } from "@/data/scrim/ult-helpers";

export const TeamIdSchema = S.Number.pipe(
  S.int(),
  S.positive({ message: () => "Team ID must be a positive integer" })
);

export const BaseTeamDataOptionsSchema = S.Struct({
  excludePush: S.optional(S.Boolean),
  excludeClash: S.optional(S.Boolean),
  includeDateInfo: S.optional(S.Boolean),
  dateRange: S.optional(
    S.Struct({
      from: S.Date,
      to: S.Date,
    })
  ),
});

export type BaseTeamDataOptions = S.Schema.Type<
  typeof BaseTeamDataOptionsSchema
>;

// ---------- hero-swap-service types ----------

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

// ---------- stats-service types ----------

export type TeamWinrates = {
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
      rosterVariants: {
        players: string[];
        wins: number;
        losses: number;
        winrate: number;
      }[];
      bestRoster: string[] | null;
      bestWinrate: number;
    }
  >;
};

export type TopMapByPlaytime = {
  name: string;
  playtime: number;
};

export type BestMapByWinrate = {
  mapName: string;
  playtime: number;
  winrate: number;
};

// ---------- trends-service types ----------

export type WinrateDataPoint = {
  date: Date;
  winrate: number;
  wins: number;
  losses: number;
  period: string;
};

export type RecentFormMatch = {
  scrimId: number;
  scrimName: string;
  date: Date;
  mapName: string;
  result: "win" | "loss";
};

export type RecentForm = {
  last5: RecentFormMatch[];
  last10: RecentFormMatch[];
  last20: RecentFormMatch[];
  last5Winrate: number;
  last10Winrate: number;
  last20Winrate: number;
};

export type StreakInfo = {
  currentStreak: {
    type: "win" | "loss" | "none";
    count: number;
  };
  longestWinStreak: {
    count: number;
    startDate: Date | null;
    endDate: Date | null;
  };
  longestLossStreak: {
    count: number;
    startDate: Date | null;
    endDate: Date | null;
  };
};

// ---------- fight-stats-service types ----------

export type TeamFightStats = {
  totalFights: number;
  fightsWon: number;
  fightsLost: number;
  overallWinrate: number;
  firstPickFights: number;
  firstPickWins: number;
  firstPickWinrate: number;
  firstDeathFights: number;
  firstDeathWins: number;
  firstDeathWinrate: number;
  firstUltFights: number;
  firstUltWins: number;
  firstUltWinrate: number;
  dryFights: number;
  dryFightWins: number;
  dryFightWinrate: number;
  nonDryFights: number;
  totalUltsInNonDryFights: number;
  avgUltsPerNonDryFight: number;
  dryFightReversals: number;
  dryFightReversalRate: number;
  nonDryFightReversals: number;
  nonDryFightReversalRate: number;
  ultimateEfficiency: number;
  avgUltsInWonFights: number;
  avgUltsInLostFights: number;
  wastedUltimates: number;
  totalUltsUsed: number;
};

// ---------- role-stats-service types ----------

export type RoleStats = {
  role: "Tank" | "Damage" | "Support";
  totalPlaytime: number;
  mapCount: number;
  eliminations: number;
  finalBlows: number;
  deaths: number;
  assists: number;
  heroDamage: number;
  damageTaken: number;
  healing: number;
  ultimatesEarned: number;
  ultimatesUsed: number;
  kd: number;
  damagePer10Min: number;
  healingPer10Min: number;
  deathsPer10Min: number;
  ultEfficiency: number;
};

export type RolePerformanceStats = {
  Tank: RoleStats;
  Damage: RoleStats;
  Support: RoleStats;
};

export type RoleBalanceAnalysis = {
  overall: string;
  weakestRole: "Tank" | "Damage" | "Support" | null;
  strongestRole: "Tank" | "Damage" | "Support" | null;
  balanceScore: number;
  insights: string[];
};

export type RoleTrio = {
  tank: string;
  dps1: string;
  dps2: string;
  support1: string;
  support2: string;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

export type RoleWinrateByMap = {
  mapName: string;
  Tank: { wins: number; losses: number; winrate: number };
  Damage: { wins: number; losses: number; winrate: number };
  Support: { wins: number; losses: number; winrate: number };
};

// ---------- hero-pool-service types ----------

export type HeroPlaytime = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  totalPlaytime: number;
  gamesPlayed: number;
  playedBy: string[];
};

export type HeroWinrate = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
  totalPlaytime: number;
};

export type HeroSpecialist = {
  playerName: string;
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  playtime: number;
  gamesPlayed: number;
  ownershipPercentage: number;
};

export type HeroDiversity = {
  totalUniqueHeroes: number;
  heroesPerRole: { Tank: number; Damage: number; Support: number };
  diversityScore: number;
  effectiveHeroPool: number;
};

export type HeroPoolAnalysis = {
  mostPlayedByRole: {
    Tank: HeroPlaytime[];
    Damage: HeroPlaytime[];
    Support: HeroPlaytime[];
  };
  topHeroWinrates: HeroWinrate[];
  specialists: HeroSpecialist[];
  diversity: HeroDiversity;
};

export type HeroPoolRawData = {
  teamRoster: string[];
  mapDataRecords: { id: number; name: string | null; scrimDate: Date }[];
  allPlayerStats: {
    player_name: string;
    player_team: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
  }[];
  matchStarts: MatchStart[];
  finalRounds: RoundEnd[];
  captures: ObjectiveCaptured[];
  payloadProgresses: PayloadProgress[];
  pointProgresses: PointProgress[];
};

// ---------- map-mode-service types ----------

export type MapModeStats = {
  mapType: $Enums.MapType;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
  avgPlaytime: number;
  bestMap: { name: string; winrate: number } | null;
  worstMap: { name: string; winrate: number } | null;
};

export type MapModePerformance = {
  overall: {
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    overallWinrate: number;
  };
  byMode: Record<$Enums.MapType, MapModeStats>;
  bestMode: $Enums.MapType | null;
  worstMode: $Enums.MapType | null;
};

// ---------- quick-wins-service types ----------

export type QuickWinsStats = {
  last10GamesPerformance: { wins: number; losses: number; winrate: number };
  bestDayOfWeek: {
    day: string;
    wins: number;
    losses: number;
    winrate: number;
    gamesPlayed: number;
  } | null;
  averageFightDuration: number | null;
  firstPickSuccessRate: {
    successfulFirstPicks: number;
    totalFirstPicks: number;
    successRate: number;
  } | null;
};

// ---------- ult-service types ----------

export type ScenarioStats = {
  fights: number;
  wins: number;
  losses: number;
  winrate: number;
};

export type HeroUltImpact = {
  hero: string;
  totalFightsAnalyzed: number;
  scenarios: {
    uncontestedOurs: ScenarioStats;
    uncontestedTheirs: ScenarioStats;
    mirrorOursFirst: ScenarioStats;
    mirrorTheirsFirst: ScenarioStats;
  };
};

export type UltImpactAnalysis = {
  byHero: Record<string, HeroUltImpact>;
  availableHeroes: string[];
};

export type TeamUltRoleBreakdown = {
  role: RoleName;
  count: number;
  percentage: number;
  subroleTimings: SubroleUltTiming[];
};

export type PlayerUltRanking = {
  playerName: string;
  primaryHero: string;
  totalUltsUsed: number;
  mapsPlayed: number;
  ultsPerMap: number;
  topFightOpeningHero: string | null;
  fightOpeningCount: number;
};

export type FightOpeningHero = { hero: string; count: number };

// ---------- ult-combos-service types ----------

/** A two-ultimate combo: a pair of our heroes whose ults were used together. */
export type UltComboStat = {
  /** Heroes are stored alphabetically so heroA/heroB is a stable, order-free key. */
  heroA: string;
  heroB: string;
  /** Number of fights in which both ults were used within the combo window. */
  count: number;
  wins: number;
  losses: number;
  /** Win rate of the fights this combo appeared in, 0-100. */
  winrate: number;
};

/** One enemy ult and the ult our team answered it with. */
export type UltResponseStat = {
  enemyHero: string;
  ourHero: string;
  /** Fights in which we answered this enemy ult with this hero, within the window. */
  count: number;
  wins: number;
  losses: number;
  /** Win rate of the fights this response appeared in, 0-100. */
  winrate: number;
};

export type UltCombosAnalysis = {
  /** All combos, sorted by count (desc), then win rate (desc). */
  combos: UltComboStat[];
  /** Every enemy-ult to our-response pairing observed. */
  responses: UltResponseStat[];
  /** Enemy heroes we answered, sorted by total responses (desc). */
  enemyHeroes: string[];
  /** Our heroes used as responses, sorted by total uses (desc). */
  responseHeroes: string[];
  /** Sum of combo counts (fights containing a tracked combo). */
  totalCombos: number;
  /** Sum of response counts. */
  totalResponses: number;
  totalMaps: number;
  /** Seconds within which two ults count as combined / a response. */
  windowSeconds: number;
};

export type TeamUltStats = {
  totalUltsUsed: number;
  totalUltsEarned: number;
  totalMaps: number;
  ultsPerMap: number;
  avgChargeTime: number;
  avgHoldTime: number;
  fightInitiationRate: number;
  fightInitiationCount: number;
  totalFightsWithUlts: number;
  topFightOpeningHeroes: FightOpeningHero[];
  roleBreakdown: TeamUltRoleBreakdown[];
  playerRankings: PlayerUltRanking[];
};

// ---------- ult-economy-service types ----------

export type UltAdvantageBucketKey =
  | "behind2"
  | "behind1"
  | "even"
  | "ahead1"
  | "ahead2";

/** Fights grouped by how many more/fewer ults we held than the enemy entering them. */
export type UltAdvantageBucket = {
  key: UltAdvantageBucketKey;
  fights: number;
  wins: number;
  winrate: number;
  /** Percentage of all analyzed fights that fall in this bucket. */
  share: number;
};

/** Average ult advantage entering the Nth fight of a map, averaged across maps. */
export type UltTempoPoint = {
  fightNumber: number;
  avgAdvantage: number;
  samples: number;
};

export type UltEconomyAnalysis = {
  /** Fights with usable bank data (maps that recorded ultimate charges). */
  totalFights: number;
  /** Ordered behind2, behind1, even, ahead1, ahead2. */
  buckets: UltAdvantageBucket[];
  /** Share of fights entered ult-disadvantaged / even / advantaged (0-100). */
  disadvantagedShare: number;
  evenShare: number;
  advantagedShare: number;
  /** Win rate when entering a fight ahead / even / behind on ults (0-100). */
  winrateAhead: number;
  winrateEven: number;
  winrateBehind: number;
  /** Mean (our bank − enemy bank) across analyzed fights. */
  avgAdvantage: number;
  tempo: UltTempoPoint[];
  totalMaps: number;
};

// ---------- ban-impact-service types ----------

export type HeroBanImpact = {
  hero: string;
  totalBans: number;
  banRate: number;
  winRateWithHero: number;
  winRateWithoutHero: number;
  winRateDelta: number;
  mapsPlayed: number;
  mapsBanned: number;
};
export type TeamBanImpactAnalysis = {
  banImpacts: HeroBanImpact[];
  mostBanned: HeroBanImpact[];
  weakPoints: HeroBanImpact[];
  totalMapsAnalyzed: number;
};
export type OurBanImpact = {
  hero: string;
  totalBans: number;
  banRate: number;
  winRateWhenBanned: number;
  winRateWhenNotBanned: number;
  winRateDelta: number;
  mapsPlayed: number;
  mapsBanned: number;
};
export type TeamOurBanAnalysis = {
  ourBanImpacts: OurBanImpact[];
  mostBannedByUs: OurBanImpact[];
  strongBans: OurBanImpact[];
  totalMapsAnalyzed: number;
};
export type CombinedBanAnalysis = {
  received: TeamBanImpactAnalysis;
  outgoing: TeamOurBanAnalysis;
};

// ---------- ability-impact-service types ----------

export type AbilityScenarioStats = {
  fights: number;
  wins: number;
  losses: number;
  winrate: number;
};
export type AbilityImpactData = {
  abilityName: string;
  totalFightsAnalyzed: number;
  scenarios: {
    usedByUs: AbilityScenarioStats;
    notUsedByUs: AbilityScenarioStats;
    usedByEnemy: AbilityScenarioStats;
    notUsedByEnemy: AbilityScenarioStats;
  };
};
export type HeroAbilityImpact = {
  hero: string;
  ability1: AbilityImpactData;
  ability2: AbilityImpactData;
};
export type AbilityImpactAnalysis = {
  byHero: Record<string, HeroAbilityImpact>;
  availableHeroes: string[];
};

// ---------- matchup-service types ----------

export type MapHeroEntry = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  playerName: string;
  timePlayed: number;
};

export type MatchupMapResult = {
  mapDataId: number;
  mapName: string;
  scrimName: string;
  date: string;
  isWin: boolean;
  ourHeroes: MapHeroEntry[];
  enemyHeroes: MapHeroEntry[];
};

export type MatchupWinrateData = {
  maps: MatchupMapResult[];
  allOurHeroes: HeroName[];
  allEnemyHeroes: HeroName[];
};

export type EnemyHeroWinrate = {
  heroName: HeroName;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

export type EnemyHeroAnalysis = {
  winrateVsHero: EnemyHeroWinrate[];
};

// ---------- analytics-service types ----------

export type HeroPickrate = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  playtime: number;
  gamesPlayed: number;
};

export type PlayerHeroData = {
  playerName: string;
  heroes: HeroPickrate[];
  totalPlaytime: number;
};

export type HeroPickrateMatrix = {
  players: PlayerHeroData[];
  allHeroes: HeroName[];
};

export type HeroPickrateRawData = {
  teamRoster: string[];
  mapDataRecords: {
    id: number;
    name: string | null;
    scrimDate: Date;
  }[];
  allPlayerStats: {
    player_name: string;
    player_team: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
  }[];
};

export type PlayerMapPerformance = {
  playerName: string;
  mapName: string;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

export type PlayerMapPerformanceMatrix = {
  players: string[];
  maps: string[];
  performance: PlayerMapPerformance[];
};

// ---------- prediction-service types ----------

export type SimulatorContext = {
  baseWinrate: number;
  totalGames: number;
  heroBanDeltas: Record<string, number>;
  heroBanSampleSizes: Record<string, number>;
  ourBanDeltas: Record<string, number>;
  ourBanSampleSizes: Record<string, number>;
  mapWinrates: Record<string, number>;
  mapSampleSizes: Record<string, number>;
  mapModeWinrates: Record<string, number>;
  roleTrioWinrates: RoleTrio[];
  heroPoolWinrates: Record<string, number>;
  heroPoolSampleSizes: Record<string, number>;
  enemyHeroWinrates: Record<string, number>;
  enemyHeroSampleSizes: Record<string, number>;
  availableHeroes: HeroName[];
  availableMaps: string[];
};
