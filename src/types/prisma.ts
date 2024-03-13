import {
  DefensiveAssist,
  DvaRemech,
  EchoDuplicateEnd,
  EchoDuplicateStart,
  HeroSpawn,
  HeroSwap,
  Kill,
  MatchEnd,
  MatchStart,
  MercyRez,
  ObjectiveCaptured,
  ObjectiveUpdated,
  OffensiveAssist,
  PayloadProgress,
  PlayerStat,
  PointProgress,
  RemechCharged,
  RoundEnd,
  RoundStart,
  SetupComplete,
  UltimateCharged,
  UltimateEnd,
  UltimateStart,
} from "@prisma/client";

export type DefensiveAssistRows = DefensiveAssist[];
export type DvaRemechRows = DvaRemech[];
export type EchoDuplicateEndRows = EchoDuplicateEnd[];
export type EchoDuplicateStartRows = EchoDuplicateStart[];
export type HeroSpawnRows = HeroSpawn[];
export type HeroSwapRows = HeroSwap[];
export type KillRows = Kill[];
export type MatchEndRows = MatchEnd[];
export type MatchStartRows = MatchStart[];
export type MercyRezRows = MercyRez[];
export type ObjectiveCapturedRows = ObjectiveCaptured[];
export type ObjectiveUpdatedRows = ObjectiveUpdated[];
export type OffensiveAssistRows = OffensiveAssist[];
export type PayloadProgressRows = PayloadProgress[];
export type PlayerStatRows = PlayerStat[];
export type PointProgressRows = PointProgress[];
export type RemechChargedRows = RemechCharged[];
export type RoundEndRows = RoundEnd[];
export type RoundStartRows = RoundStart[];
export type SetupCompleteRows = SetupComplete[];
export type UltimateChargedRows = UltimateCharged[];
export type UltimteEndRows = UltimateEnd[];
export type UltimateStartRows = UltimateStart[];

export type Event =
  | DefensiveAssist
  | DvaRemech
  | EchoDuplicateEnd
  | EchoDuplicateStart
  | HeroSpawn
  | HeroSwap
  | Kill
  | MatchEnd
  | MatchStart
  | MercyRez
  | ObjectiveCaptured
  | ObjectiveUpdated
  | OffensiveAssist
  | PayloadProgress
  | PlayerStat
  | PointProgress
  | RemechCharged
  | RoundEnd
  | RoundStart
  | SetupComplete
  | UltimateCharged
  | UltimateEnd
  | UltimateStart;
