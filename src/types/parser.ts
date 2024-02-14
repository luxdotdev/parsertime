import { $Enums } from "@prisma/client";
import { HeroName } from "./heroes";

type DefaultPlayerTeam = "Team 1" | "Team 2";
type PlayerTeam = DefaultPlayerTeam | string; // not sure how it handles custom team names

type EventAbility =
  | "Primary Fire"
  | "Secondary Fire"
  | "Ability 1"
  | "Ability 2"
  | "Ultimate"
  | "Melee";

export type DefensiveAssistTableRow = [
  event_type: "defensive_assist",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  hero_duplicated: string
];

export type EchoDuplicateEndTableRow = [
  event_type: "echo_duplicate_end",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  ultimate_id: number
];

export type EchoDuplicateStartTableRow = [
  event_type: "echo_duplicate_start",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  hero_duplicated: string,
  ultimate_id: number
];

export type HeroSpawnTableRow = [
  event_type: "hero_spawn",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  previous_hero: number | null,
  hero_time_played: number
];

export type HeroSwapTableRow = [
  event_type: "hero_swap",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  previous_hero: HeroName,
  hero_time_played: number
];

export type KillTableRow = [
  event_type: "kill",
  match_time: number,
  attacker_team: PlayerTeam,
  attacker_name: string,
  attacker_hero: HeroName,
  victim_team: PlayerTeam,
  victim_name: string,
  victim_hero: HeroName,
  event_ability: EventAbility,
  event_damage: number,
  is_critical_hit: string,
  is_environmental: number | string
];

export type MatchEndTableRow = [
  event_type: "match_end",
  match_time: number,
  round_number: number,
  team_1_score: number,
  team_2_score: number
];

export type MatchStartTableRow = [
  event_type: "match_start",
  match_time: number,
  map_name: string,
  map_type: $Enums.MapType,
  team_1_name: string,
  team_2_name: string
];

export type ObjectiveCapturedTableRow = [
  event_type: "objective_captured",
  match_time: number,
  round_number: number,
  capturing_team: PlayerTeam,
  objective_index: number,
  control_team_1_progress: number,
  control_team_2_progress: number,
  match_time_remaining: number
];

export type ObjectiveUpdatedTableRow = [
  event_type: "objective_updated",
  match_time: number,
  round_number: number,
  previous_objective_index: number,
  current_objective_index: number
];

export type OffensiveAssistTableRow = [
  event_type: "offensive_assist",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  hero_duplicated: string
];

export type PayloadProgressTableRow = [
  event_type: "payload_progress",
  match_time: number,
  round_number: number,
  capturing_team: PlayerTeam,
  objective_index: number,
  payload_capture_progress: number
];

export type PlayerStatTableRow = [
  event_type: "player_stat",
  match_time: number,
  round_number: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  eliminations: number,
  final_blows: number,
  deaths: number,
  all_damage_dealt: number,
  barrier_damage_dealt: number,
  hero_damage_dealt: number,
  healing_dealt: number,
  healing_received: number,
  self_healing: number,
  damage_taken: number,
  damage_blocked: number,
  defensive_assists: number,
  offensive_assists: number,
  ultimates_earned: number,
  ultimates_used: number,
  multikill_best: number,
  multikills: number,
  solo_kills: number,
  objective_kills: number,
  environmental_kills: number,
  environmental_deaths: number,
  critical_hits: number,
  critical_hit_accuracy: number,
  scoped_accuracy: number,
  scoped_critical_hit_accuracy: number,
  scoped_critical_hit_kills: number,
  shots_fired: number,
  shots_hit: number,
  shots_missed: number,
  scoped_shots: number,
  scoped_shots_hit: number,
  weapon_accuracy: number,
  hero_time_played: number
];

export type PointProgressTableRow = [
  event_type: "point_progress",
  match_time: number,
  round_number: number,
  capturing_team: PlayerTeam,
  objective_index: number,
  point_capture_progress: number
];

export type RoundEndTableRow = [
  event_type: "round_end",
  match_time: number,
  round_number: number,
  capturing_team: PlayerTeam,
  team_1_score: number,
  team_2_score: number,
  objective_index: number,
  control_team_1_progress: number,
  control_team_2_progress: number,
  match_time_remaining: number
];

export type RoundStartTableRow = [
  event_type: "round_start",
  match_time: number,
  round_number: number,
  capturing_team: PlayerTeam,
  team_1_score: number,
  team_2_score: number,
  objective_index: number
];

export type SetupCompleteTableRow = [
  event_type: "setup_complete",
  match_time: number,
  round_number: number,
  match_time_remaining: number
];

export type UltimateChargedTableRow = [
  event_type: "ultimate_charged",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  hero_duplicated: string,
  ultimate_id: number
];

export type UltimateEndTableRow = [
  event_type: "ultimate_end",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  hero_duplicated: string,
  ultimate_id: number
];

export type UltimateStartTableRow = [
  event_type: "ultimate_start",
  match_time: number,
  player_team: PlayerTeam,
  player_name: string,
  player_hero: HeroName,
  hero_duplicated: string,
  ultimate_id: number
];

export type ParserData = {
  defensive_assist: DefensiveAssistTableRow[];
  echo_duplicate_end?: EchoDuplicateEndTableRow[];
  echo_duplicate_start?: EchoDuplicateStartTableRow[];
  hero_spawn: HeroSpawnTableRow[];
  hero_swap: HeroSwapTableRow[];
  kill: KillTableRow[];
  match_end?: MatchEndTableRow[];
  match_start: MatchStartTableRow[];
  objective_capture: ObjectiveCapturedTableRow[];
  objective_updated: ObjectiveUpdatedTableRow[];
  offensive_assist: OffensiveAssistTableRow[];
  payload_progress: PayloadProgressTableRow[];
  player_stat: PlayerStatTableRow[];
  point_progress: PointProgressTableRow[];
  round_end: RoundEndTableRow[];
  round_start: RoundStartTableRow[];
  setup_complete: SetupCompleteTableRow[];
  ultimate_charged: UltimateChargedTableRow[];
  ultimate_end: UltimateEndTableRow[];
  ultimate_start: UltimateStartTableRow[];
};
