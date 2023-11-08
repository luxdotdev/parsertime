import { HeroName } from "./heroes";

export type EventType =
  | "defensive_assist"
  | "hero_spawn"
  | "hero_swap"
  | "kill"
  | "match_start"
  | "objective_captured"
  | "objective_updated"
  | "offensive_assist"
  | "payload_progress"
  | "player_stat"
  | "round_end"
  | "round_start"
  | "setup_complete"
  | "ultimate_charged"
  | "ultimate_end"
  | "ultimate_start";

type DefaultPlayerTeam = "Team 1" | "Team 2";
type PlayerTeam = DefaultPlayerTeam | string; // not sure how it handles custom team names

type EventAbility =
  | "Primary Fire"
  | "Secondary Fire"
  | "Ability 1"
  | "Ability 2"
  | "Ultimate"
  | "Melee";

export type DefensiveAssistTable = {
  event_type: "defensive_assist";
  match_time: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  hero_duplicated: number;
};

export type HeroSpawnTable = {
  event_type: "hero_spawn";
  match_time: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  previous_hero: HeroName | null;
  hero_time_played: number;
};

export type HeroSwapTable = {
  event_type: "hero_swap";
  match_time: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  previous_hero: HeroName;
  hero_time_played: number;
};

export type KillTable = {
  event_type: "kill";
  match_time: number;
  attacker_team: PlayerTeam;
  attacker_name: string;
  attacker_hero: HeroName;
  victim_team: PlayerTeam;
  victim_name: string;
  victim_hero: HeroName;
  event_ability: EventAbility;
  event_damage: number;
  is_critical_hit: boolean;
  is_environmental: boolean;
};

export type MatchStartTable = {
  event_type: "match_start";
  match_time: number;
  map_name: string;
  map_type: string;
  team_1_name: string;
  team_2_name: string;
};

export type ObjectiveCapturedTable = {
  event_type: "objective_captured";
  match_time: number;
  round_number: number;
  capturing_team: PlayerTeam;
  objective_index: number;
  control_team_1_progress: number;
  control_team_2_progress: number;
  match_time_remaining: number;
};

export type ObjectiveUpdatedTable = {
  event_type: "objective_updated";
  match_time: number;
  round_number: number;
  previous_objective_index: number;
  current_objective_index: number;
};

export type OffensiveAssistTable = {
  event_type: "offensive_assist";
  match_time: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  hero_duplicated: number;
};

export type PayloadProgressTable = {
  event_type: "payload_progress";
  match_time: number;
  round_number: number;
  capturing_team: PlayerTeam;
  objective_index: number;
  payload_capture_progress: number;
};

export type PlayerStatTable = {
  event_type: "player_stat";
  match_time: number;
  round_number: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  eliminations: number;
  final_blows: number;
  deaths: number;
  all_damage_dealt: number;
  barrier_damage_dealt: number;
  hero_damage_dealt: number;
  healing_dealt: number;
  healing_received: number;
  self_healing: number;
  damage_taken: number;
  damage_blocked: number;
  defensive_assists: number;
  offensive_assists: number;
  ultimates_earned: number;
  ultimates_used: number;
  multikill_best: number;
  multikills: number;
  solo_kills: number;
  objective_kills: number;
  environmental_kills: number;
  environmental_deaths: number;
  critical_hits: number;
  critical_hit_accuracy: number;
  scoped_accuracy: number;
  scoped_critical_hit_accuracy: number;
  scoped_critical_hit_kills: number;
  shots_fired: number;
  shots_hit: number;
  shots_missed: number;
  scoped_shots: number;
  scoped_shots_hit: number;
  weapon_accuracy: number;
  hero_time_played: number;
};

export type RoundEndTable = {
  event_type: "round_end";
  match_time: number;
  round_number: number;
  capturing_team: PlayerTeam;
  team_1_score: number;
  team_2_score: number;
  objective_index: number;
  control_team_1_progress: number;
  control_team_2_progress: number;
  match_time_remaining: number;
};

export type RoundStartTable = {
  event_type: "round_start";
  match_time: number;
  round_number: number;
  capturing_team: PlayerTeam;
  team_1_score: number;
  team_2_score: number;
  objective_index: number;
};

export type SetupCompleteTable = {
  event_type: "setup_complete";
  match_time: number;
  round_number: number;
  match_time_remaining: number;
};

export type UltimateChargedTable = {
  event_type: "ultimate_charged";
  match_time: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  hero_duplicated: number;
  ultimate_id: number;
};

export type UltimateEndTable = {
  event_type: "ultimate_end";
  match_time: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  hero_duplicated: number;
  ultimate_id: number;
};

export type UltimateStartTable = {
  event_type: "ultimate_start";
  match_time: number;
  player_team: PlayerTeam;
  player_name: string;
  player_hero: HeroName;
  hero_duplicated: number;
  ultimate_id: number;
};

export type ParserData = {
  defensive_assist: DefensiveAssistTable[];
  hero_spawn: HeroSpawnTable[];
  hero_swap: HeroSwapTable[];
  kill: KillTable[];
  match_start: MatchStartTable[];
  objective_captured: ObjectiveCapturedTable[];
  objective_updated: ObjectiveUpdatedTable[];
  offensive_assist: OffensiveAssistTable[];
  payload_progress: PayloadProgressTable[];
  player_stat: PlayerStatTable[];
  round_end: RoundEndTable[];
  round_start: RoundStartTable[];
  setup_complete: SetupCompleteTable[];
  ultimate_charged: UltimateChargedTable[];
  ultimate_end: UltimateEndTable[];
  ultimate_start: UltimateStartTable[];
};
