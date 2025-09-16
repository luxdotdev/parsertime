import { z } from "zod";

/*
 * This file contains Zod schemas for the event types Parsertime supports. These schemas
 * are used to validate and parse the data. By checking the data against these schemas,
 * we can ensure that the data is in the correct format and can be parsed accordingly.
 *
 * Each schema has a corresponding model in the Prisma schema. The model is used to store the data in the database.
 *
 * The schemas are derived from the ScrimTime documentation.
 * View the source here: https://parserti.me/schema
 */

const EventType = z.enum([
  "defensive_assist",
  "dva_remech",
  "echo_duplicate_end",
  "echo_duplicate_start",
  "hero_spawn",
  "hero_swap",
  "kill",
  "match_end",
  "match_start",
  "mercy_rez",
  "objective_captured",
  "objective_updated",
  "offensive_assist",
  "payload_progress",
  "point_progress",
  "player_stat",
  "remech_charged",
  "round_end",
  "round_start",
  "setup_complete",
  "ultimate_charged",
  "ultimate_end",
  "ultimate_start",
]);

const MapType = z.enum([
  "Clash",
  "Control",
  "Escort",
  "Flashpoint",
  "Hybrid",
  "Push",
]);

const Int = z.number().int();
const Float = z.number();
const String = z.string();
const StringOrNumber = z.string().or(z.number());

const MatchStartSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.match_start),
  // Match Time
  Float,
  // Map Name
  String,
  // Map Type
  MapType,
  // Team 1 Name
  String,
  // Team 2 Name
  String,
]);

const MatchEndSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.match_end),
  // Match Time
  Float,
  // Round Number
  Int,
  // Team 1 Score
  Int,
  // Team 2 Score
  Int,
]);

const RoundStartSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.round_start),
  // Match Time
  Float,
  // Round Number
  Int,
  // Capturing Team
  StringOrNumber,
  // Team 1 Score
  Int,
  // Team 2 Score
  Int,
  // Objective Index
  Int,
]);

const RoundEndSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.round_end),
  // Match Time
  Float,
  // Round Number
  Int,
  // Capturing Team
  StringOrNumber,
  // Team 1 Score
  Int,
  // Team 2 Score
  Int,
  // Objective Index
  Int,
  // Control Team 1 Progress
  Float,
  // Control Team 2 Progress
  Float,
  // Match Time Remaining
  Float,
]);

const SetupCompleteSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.setup_complete),
  // Match Time
  Float,
  // Round Number
  Int,
  // Match Time Remaining
  Float,
]);

const ObjectiveUpdatedSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.objective_updated),
  // Match Time
  Float,
  // Round Number
  Int,
  // Previous Objective Index
  Int,
  // Current Objective Index
  Int,
]);

const ObjectiveCapturedSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.objective_captured),
  // Match Time
  Float,
  // Round Number
  Int,
  // Capturing Team
  String,
  // Objective Index
  Int,
  // Control Team 1 Progress
  Float,
  // Control Team 2 Progress
  Float,
  // Match Time Remaining
  Float,
]);

const PointProgressSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.point_progress),
  // Match Time
  Float,
  // Round Number
  Int,
  // Capturing Team
  String,
  // Objective Index
  Int,
  // Point Capture Progress
  Float,
]);

const PayloadProgressSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.payload_progress),
  // Match Time
  Float,
  // Round Number
  Int,
  // Capturing Team
  String,
  // Objective Index
  Int,
  // Payload Capture Progress
  Float,
]);

const HeroSpawnSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.hero_spawn),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Previous Hero
  Int.nullable().optional(),
  // Hero Time Played
  Float,
]);

const HeroSwapSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.hero_swap),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Previous Hero
  String,
  // Hero Time Played
  Float,
]);

const OffensiveAssistSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.offensive_assist),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Hero Duplicated
  StringOrNumber,
]);

const DefensiveAssistSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.defensive_assist),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Hero Duplicated
  StringOrNumber,
]);

const UltimateChargedSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.ultimate_charged),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Hero Duplicated
  StringOrNumber,
  // Ultimate ID
  Int,
]);

const UltimateStartSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.ultimate_start),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Hero Duplicated
  StringOrNumber,
  // Ultimate ID
  Int,
]);

const UltimateEndSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.ultimate_end),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String.optional(),
  // Hero Duplicated
  StringOrNumber,
  // Ultimate ID
  Int,
]);

const KillSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.kill),
  // Match Time
  Float,
  // Attacker Team
  String,
  // Attacker Name
  String,
  // Attacker Hero
  String,
  // Victim Team
  String,
  // Victim Name
  String,
  // Victim Hero
  String,
  // Event Ability
  String,
  // Event Damage
  Float,
  // Is Critical Hit
  String,
  // Is Environmental
  String,
]);

const MercyRezSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.mercy_rez),
  // Match Time
  Float,
  // Resurrecter Team
  String,
  // Resurrecter Player
  String,
  // Resurrecter Hero
  String,
  // Resurrectee Team
  String,
  // Resurrectee Player
  String,
  // Resurrectee Hero
  String,
]);

const EchoDuplicateStartSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.echo_duplicate_start),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Hero Duplicated
  StringOrNumber,
  // Ultimate ID
  Int,
]);

const EchoDuplicateEndSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.echo_duplicate_end),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Ultimate ID
  Int,
]);

const DvaRemechSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.dva_remech),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Ultimate ID
  Int,
]);
const RemechChargedSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.remech_charged),
  // Match Time
  Float,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Hero Duplicated
  StringOrNumber,
  // Ultimate ID
  Int,
]);

export const PlayerStatSchema = z.tuple([
  // Event Type
  z.literal(EventType.enum.player_stat),
  // Match Time
  Float,
  // Round Number
  Int,
  // Player Team
  String,
  // Player Name
  String,
  // Player Hero
  String,
  // Eliminations
  Int,
  // Final Blows
  Int,
  // Deaths
  Int,
  // All Damage Dealt
  Float,
  // Barrier Damage Dealt
  Float,
  // Hero Damage Dealt
  Float,
  // Healing Dealt
  Float,
  // Healing Received
  Float,
  // Self Healing
  Float,
  // Damage Taken
  Float,
  // Damage Blocked
  Float,
  // Defensive Assists
  Int,
  // Offensive Assists
  Int,
  // Ultimates Earned
  Int,
  // Ultimates Used
  Int,
  // Multikill Best
  Int,
  // Multikills
  Int,
  // Solo Kills
  Int,
  // Objective Kills
  Int,
  // Environmental Kills
  Int,
  // Environmental Deaths
  Int,
  // Critical Hits
  Int,
  // Critical Hit Accuracy
  Float,
  // Scoped Accuracy
  Float,
  // Scoped Critical Hit Accuracy
  Float,
  // Scoped Critical Hit Kills
  Int,
  // Shots Fired
  Int,
  // Shots Hit
  Int,
  // Shots Missed
  Int,
  // Scoped Shots Fired
  Int,
  // Scoped Shots Hit
  Int,
  // Weapon Accuracy
  Float,
  // Hero Time Played
  Float,
]);

/**
 * A Zod schema that defines the structure of the parser data. This schema includes various event types and player statistics.
 * The schema is used to validate the data before it is parsed and stored in the database. By checking the data against this schema,
 * we can ensure that the data is in the correct format and can be parsed accordingly.
 *
 * Each key in this schema has a corresponding model in the Prisma schema. The model is used to store the data in the database.
 *
 * The schema is derived from the ScrimTime documentation.
 * View the source here: {@link https://parserti.me/schema}
 */
export const ParserDataSchema = z.object({
  match_start: z.array(MatchStartSchema).optional(),
  match_end: z.array(MatchEndSchema).optional(),
  round_start: z.array(RoundStartSchema).optional(),
  round_end: z.array(RoundEndSchema).optional(),
  setup_complete: z.array(SetupCompleteSchema).optional(),
  objective_updated: z.array(ObjectiveUpdatedSchema).optional(),
  objective_captured: z.array(ObjectiveCapturedSchema).optional(),
  point_progress: z.array(PointProgressSchema).optional(),
  payload_progress: z.array(PayloadProgressSchema).optional(),
  hero_spawn: z.array(HeroSpawnSchema).optional(),
  hero_swap: z.array(HeroSwapSchema).optional(),
  offensive_assist: z.array(OffensiveAssistSchema).optional(),
  defensive_assist: z.array(DefensiveAssistSchema).optional(),
  ultimate_charged: z.array(UltimateChargedSchema).optional(),
  ultimate_start: z.array(UltimateStartSchema).optional(),
  ultimate_end: z.array(UltimateEndSchema).optional(),
  kill: z.array(KillSchema).optional(),
  mercy_rez: z.array(MercyRezSchema).optional(),
  echo_duplicate_start: z.array(EchoDuplicateStartSchema).optional(),
  echo_duplicate_end: z.array(EchoDuplicateEndSchema).optional(),
  dva_remech: z.array(DvaRemechSchema).optional(),
  remech_charged: z.array(RemechChargedSchema).optional(),
  player_stat: z.array(PlayerStatSchema).optional(),
});
