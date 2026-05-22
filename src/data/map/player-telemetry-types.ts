/**
 * Shared types for the player Telemetry tab.
 *
 * Client-safe: no `server-only` import and no transitive Prisma/Effect runtime
 * dependency, so both the server service and the client chart/heatmap
 * components can import from here. Keep it that way.
 */

export type PlayerRole = "Tank" | "Damage" | "Support";

export type TeamSlot = "Team1" | "Team2";

/** One sample of a smoothed telemetry channel: a rate (units/second) at a time. */
export type TelemetrySeriesPoint = { time: number; value: number };

/** A continuous, KDE-smoothed activity trace for a single metric. */
export type TelemetryChannel = {
  points: TelemetrySeriesPoint[];
  /** Peak instantaneous rate (units/second) across the map. */
  peak: number;
  /** Sum of the underlying event weights (e.g. total damage dealt). */
  total: number;
};

export type TelemetryUltMarker = { time: number; hero: string };

export type TelemetryAbilityMarker = {
  time: number;
  hero: string;
  slot: 1 | 2;
};

export type TelemetryKillMarker = {
  time: number;
  /** The player's hero at the moment of the kill. */
  playerHero: string;
  victimName: string;
  victimHero: string;
  ability: string;
};

export type TelemetryDeathMarker = {
  time: number;
  attackerName: string;
  attackerHero: string;
  /** The player's hero at the moment of death. */
  playerHero: string;
  ability: string;
};

export type TelemetryHeroSwapMarker = {
  time: number;
  fromHero: string;
  toHero: string;
};

export type TelemetryRoundMarker = {
  roundNumber: number;
  start: number;
  end: number;
};

/** Damage the player dealt to enemies, split by the enemy's role. */
export type DamageByRole = {
  tank: TelemetryChannel;
  damage: TelemetryChannel;
  support: TelemetryChannel;
};

export type DamageByRoleTotals = {
  tank: number;
  damage: number;
  support: number;
};

/** One enemy player: total damage the player dealt to and received from them. */
export type OpponentMatchup = {
  name: string;
  hero: string;
  dealt: number;
  received: number;
};

/**
 * The player's damage share of their team's kills. `bins` holds the count of
 * team kills falling in each contribution bracket: 0%, 1-25%, 26-50%, 51-75%,
 * 76-100%.
 */
export type KillContribution = {
  bins: number[];
  /** Player damage / team damage across all counted kills, as a percent. */
  focusContribution: number;
  /** Percent of counted kills where the player dealt any damage to the victim. */
  participation: number;
  /** Number of team kills with tracked pre-death damage. */
  totalKills: number;
};

export type PlayerTelemetry = {
  matchStartTime: number;
  matchEndTime: number;
  role: PlayerRole;
  playerTeam: TeamSlot;
  topHero: string;
  channels: {
    damageDealt: TelemetryChannel;
    damageTaken: TelemetryChannel;
    healingDealt: TelemetryChannel;
    healingReceived: TelemetryChannel;
  };
  damageByRole: DamageByRole;
  damageByRoleTotals: DamageByRoleTotals;
  damageTakenByRoleTotals: DamageByRoleTotals;
  killContribution: KillContribution;
  opponents: OpponentMatchup[];
  totals: {
    damageDealt: number;
    damageTaken: number;
    healingDealt: number;
    healingReceived: number;
    eliminations: number;
    deaths: number;
  };
  ults: TelemetryUltMarker[];
  abilities: TelemetryAbilityMarker[];
  kills: TelemetryKillMarker[];
  deaths: TelemetryDeathMarker[];
  heroSwaps: TelemetryHeroSwapMarker[];
  rounds: TelemetryRoundMarker[];
};

// ── Player-scoped positional heatmap ────────────────────────────────────────

/** Image-space coordinate (already transformed through the map calibration). */
export type HeatPoint = { u: number; v: number };

export type PlayerHeatLayerKey = "damageDealt" | "damageTaken" | "healingDealt";

export type PlayerHeatLayer = {
  key: PlayerHeatLayerKey;
  points: HeatPoint[];
};

export type PlayerMarkerLayerKey = "kills" | "deaths" | "abilities";

export type PlayerMarkerPoint = HeatPoint & {
  time: number;
  /** Hero portrait to show in the tooltip. */
  hero: string;
  /** Primary tooltip line (victim name, killer name, or ability label). */
  label: string;
  ability?: string;
};

export type PlayerMarkerLayer = {
  key: PlayerMarkerLayerKey;
  points: PlayerMarkerPoint[];
};

export type PlayerHeatmapSubMap = {
  subMapName: string;
  imagePresignedUrl: string;
  imageWidth: number;
  imageHeight: number;
  heatLayers: PlayerHeatLayer[];
  markerLayers: PlayerMarkerLayer[];
};

export type PlayerHeatmapResult =
  | { type: "single"; subMap: PlayerHeatmapSubMap }
  | { type: "control"; subMaps: PlayerHeatmapSubMap[] }
  | { type: "no_calibration" }
  | { type: "no_coordinates" };

export type PlayerTelemetryResult =
  | { type: "ready"; telemetry: PlayerTelemetry; heatmap: PlayerHeatmapResult }
  | { type: "no_data" };
