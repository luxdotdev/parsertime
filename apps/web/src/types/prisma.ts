import {
  DefensiveAssist,
  HeroSpawn,
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
  RoundEnd,
  RoundStart,
  SetupComplete,
  UltimateCharged,
  UltimateEnd,
  UltimateStart,
} from "@prisma/client";

export type DefensiveAssistRows = DefensiveAssist[];
export type HeroSpawnRows = HeroSpawn[];
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
export type RoundEndRows = RoundEnd[];
export type RoundStartRows = RoundStart[];
export type SetupCompleteRows = SetupComplete[];
export type UltimateChargedRows = UltimateCharged[];
export type UltimteEndRows = UltimateEnd[];
export type UltimateStartRows = UltimateStart[];

export type ScrimData = {
  defensive_assist: DefensiveAssistRows;
  hero_spawn: HeroSpawnRows;
  hero_swap: HeroSpawnRows;
  kill: KillRows;
  match_start: MatchStartRows;
  objective_captured: ObjectiveCapturedRows;
  objective_updated: ObjectiveUpdatedRows;
  offensive_assist: OffensiveAssistRows;
  payload_progress: PayloadProgressRows;
  player_stat: PlayerStatRows;
  round_end: RoundEndRows;
  round_start: RoundStartRows;
  setup_complete: SetupCompleteRows;
  ultimate_charged: UltimateChargedRows;
  ultimate_end: UltimteEndRows;
  ultimate_start: UltimateStartRows;
};
