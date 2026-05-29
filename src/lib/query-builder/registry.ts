import type { Aggregation, DatasetId } from "@/lib/query-builder/types";

/**
 * The query-builder registry. This is the single source of truth that drives
 * both the sentence-canvas UI (labels, options, the technical hover layer) and
 * the SQL compiler. It is intentionally client-safe: it holds only data and
 * pure lookups, never prisma or other server-only modules.
 *
 * Adding a new field or dataset is a data change here, not new code elsewhere.
 */

/** Where a column physically lives, so the planner knows which alias to use. */
export type ColumnSource = "base" | "match_start" | "scrim";

export type MetricDef = {
  id: string;
  label: string;
  description: string;
  /** display name of the table this metric reads from */
  table: string;
  /** underlying column, or null for pure row counts */
  column: string | null;
  source: ColumnSource;
  allowedAggs: Aggregation[];
  defaultAgg: Aggregation;
  unit?: string;
  precision: number;
  /** deaths, ult charge time, etc: a smaller number is the better result */
  lowerIsBetter?: boolean;
  /** CalculatedStat discriminator (the `stat` column value) */
  statType?: string;
  /** restrict a count to rows matching this SQL predicate (FILTER clause) */
  countFilter?: string;
  /** computed datasets only: multiply the aggregate (e.g. avg(won) × 100 = win %) */
  scale?: number;
};

export type DimensionDef = {
  id: string;
  label: string;
  table: string;
  column: string;
  source: ColumnSource;
};

export type FilterValueType = "hero" | "player" | "text" | "number" | "enum";

export type FilterDef = {
  id: string;
  label: string;
  table: string;
  column: string;
  source: ColumnSource;
  valueType: FilterValueType;
  /** which operators this filter offers */
  operators: ("eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte")[];
  /** fixed option list (enums); dynamic fields resolve options per team */
  enumOptions?: { value: string; label: string }[];
  /** for dynamic option resolution: the distinct column to pull from */
  optionsColumn?: string;
  optionsSource?: ColumnSource;
  unit?: string;
};

export type DatasetDef = {
  id: DatasetId;
  label: string;
  /** the noun used in the sentence ("player stats", "kills") */
  noun: string;
  description: string;
  table: string;
  /** human note about the row grain, shown in the technical reveal */
  grainNote: string;
  metrics: MetricDef[];
  dimensions: DimensionDef[];
  filters: FilterDef[];
  /**
   * "sql" (default) compiles to a team-scoped SQL query. "computed" runs a
   * server post-processing function (fight detection, win calc, ...) that SQL
   * can't express, then aggregates the result rows in memory.
   */
  kind?: "sql" | "computed";
  /** computed datasets: the raw tables the post-processing reads, for display */
  sourceTables?: string[];
};

const MAP_TYPES = [
  "Clash",
  "Control",
  "Escort",
  "Flashpoint",
  "Hybrid",
  "Push",
];
const ROLES = ["TANK", "DAMAGE", "SUPPORT"];

const RATEABLE_AGGS: Aggregation[] = ["sum", "avg", "per10", "max", "min"];
const COUNTLESS_AGGS: Aggregation[] = ["sum", "avg", "max", "min"];

const mapTypeFilter: FilterDef = {
  id: "map_type",
  label: "map type",
  table: "MatchStart",
  column: "map_type",
  source: "match_start",
  valueType: "enum",
  operators: ["in", "nin"],
  enumOptions: MAP_TYPES.map((v) => ({ value: v, label: v })),
};

// --- numeric stat columns shared by PlayerStat metrics ----------------------
const PLAYER_STAT_COLUMNS: {
  id: string;
  label: string;
  column: string;
  unit?: string;
  precision?: number;
  lowerIsBetter?: boolean;
  rateable?: boolean;
}[] = [
  {
    id: "eliminations",
    label: "eliminations",
    column: "eliminations",
    rateable: true,
  },
  {
    id: "final_blows",
    label: "final blows",
    column: "final_blows",
    rateable: true,
  },
  {
    id: "deaths",
    label: "deaths",
    column: "deaths",
    lowerIsBetter: true,
    rateable: true,
  },
  {
    id: "hero_damage",
    label: "hero damage",
    column: "hero_damage_dealt",
    precision: 0,
    rateable: true,
  },
  {
    id: "all_damage",
    label: "all damage",
    column: "all_damage_dealt",
    precision: 0,
    rateable: true,
  },
  {
    id: "barrier_damage",
    label: "barrier damage",
    column: "barrier_damage_dealt",
    precision: 0,
    rateable: true,
  },
  {
    id: "healing",
    label: "healing dealt",
    column: "healing_dealt",
    precision: 0,
    rateable: true,
  },
  {
    id: "healing_received",
    label: "healing received",
    column: "healing_received",
    precision: 0,
    rateable: true,
  },
  {
    id: "self_healing",
    label: "self healing",
    column: "self_healing",
    precision: 0,
    rateable: true,
  },
  {
    id: "damage_taken",
    label: "damage taken",
    column: "damage_taken",
    precision: 0,
    lowerIsBetter: true,
    rateable: true,
  },
  {
    id: "damage_blocked",
    label: "damage blocked",
    column: "damage_blocked",
    precision: 0,
    rateable: true,
  },
  {
    id: "solo_kills",
    label: "solo kills",
    column: "solo_kills",
    rateable: true,
  },
  {
    id: "objective_kills",
    label: "objective kills",
    column: "objective_kills",
    rateable: true,
  },
  {
    id: "environmental_kills",
    label: "environmental kills",
    column: "environmental_kills",
    rateable: true,
  },
  {
    id: "ults_earned",
    label: "ultimates earned",
    column: "ultimates_earned",
    rateable: true,
  },
  {
    id: "ults_used",
    label: "ultimates used",
    column: "ultimates_used",
    rateable: true,
  },
  {
    id: "multikills",
    label: "multikills",
    column: "multikills",
    rateable: true,
  },
  {
    id: "offensive_assists",
    label: "offensive assists",
    column: "offensive_assists",
    rateable: true,
  },
  {
    id: "defensive_assists",
    label: "defensive assists",
    column: "defensive_assists",
    rateable: true,
  },
  {
    id: "critical_hits",
    label: "critical hits",
    column: "critical_hits",
    rateable: true,
  },
  {
    id: "shots_fired",
    label: "shots fired",
    column: "shots_fired",
    precision: 0,
    rateable: true,
  },
  {
    id: "shots_hit",
    label: "shots hit",
    column: "shots_hit",
    precision: 0,
    rateable: true,
  },
  {
    id: "time_played",
    label: "time played",
    column: "hero_time_played",
    unit: "s",
    precision: 0,
  },
];

const playerStatMetrics: MetricDef[] = PLAYER_STAT_COLUMNS.map((c) => ({
  id: c.id,
  label: c.label,
  description: `${c.label} recorded on PlayerStat`,
  table: "PlayerStat",
  column: c.column,
  source: "base" as const,
  allowedAggs: c.rateable ? RATEABLE_AGGS : COUNTLESS_AGGS,
  defaultAgg: "avg",
  unit: c.unit,
  precision: c.precision ?? 1,
  lowerIsBetter: c.lowerIsBetter,
}));
// A plain "maps counted" metric is always useful for context.
playerStatMetrics.unshift({
  id: "maps",
  label: "maps",
  description: "Number of maps the player appears on (final row per map)",
  table: "PlayerStat",
  column: null,
  source: "base",
  allowedAggs: ["count"],
  defaultAgg: "count",
  precision: 0,
});

// --- CalculatedStat metrics -------------------------------------------------
const CALC_METRICS: {
  id: string;
  label: string;
  statType: string;
  agg: Aggregation;
  unit?: string;
  precision: number;
  lowerIsBetter?: boolean;
}[] = [
  {
    id: "mvp_score",
    label: "MVP score",
    statType: "MVP_SCORE",
    agg: "avg",
    precision: 1,
  },
  {
    id: "map_mvp_count",
    label: "map MVPs",
    statType: "MAP_MVP_COUNT",
    agg: "sum",
    precision: 0,
  },
  {
    id: "fleta_deadlift",
    label: "Fleta deadlift %",
    statType: "FLETA_DEADLIFT_PERCENTAGE",
    agg: "avg",
    unit: "%",
    precision: 1,
  },
  {
    id: "first_pick_pct",
    label: "first pick %",
    statType: "FIRST_PICK_PERCENTAGE",
    agg: "avg",
    unit: "%",
    precision: 1,
  },
  {
    id: "first_pick_count",
    label: "first picks",
    statType: "FIRST_PICK_COUNT",
    agg: "sum",
    precision: 0,
  },
  {
    id: "first_death_pct",
    label: "first death %",
    statType: "FIRST_DEATH_PERCENTAGE",
    agg: "avg",
    unit: "%",
    precision: 1,
    lowerIsBetter: true,
  },
  {
    id: "first_death_count",
    label: "first deaths",
    statType: "FIRST_DEATH_COUNT",
    agg: "sum",
    precision: 0,
    lowerIsBetter: true,
  },
  {
    id: "ajax_count",
    label: "Ajaxes",
    statType: "AJAX_COUNT",
    agg: "sum",
    precision: 0,
  },
  {
    id: "ult_charge_time",
    label: "avg ult charge time",
    statType: "AVERAGE_ULT_CHARGE_TIME",
    agg: "avg",
    unit: "s",
    precision: 1,
    lowerIsBetter: true,
  },
  {
    id: "time_to_use_ult",
    label: "avg time to use ult",
    statType: "AVERAGE_TIME_TO_USE_ULT",
    agg: "avg",
    unit: "s",
    precision: 1,
    lowerIsBetter: true,
  },
  {
    id: "drought_time",
    label: "avg drought time",
    statType: "AVERAGE_DROUGHT_TIME",
    agg: "avg",
    unit: "s",
    precision: 1,
    lowerIsBetter: true,
  },
  {
    id: "kills_per_ult",
    label: "kills per ultimate",
    statType: "KILLS_PER_ULTIMATE",
    agg: "avg",
    precision: 2,
  },
  {
    id: "duel_winrate",
    label: "duel winrate %",
    statType: "DUEL_WINRATE_PERCENTAGE",
    agg: "avg",
    unit: "%",
    precision: 1,
  },
  {
    id: "fight_reversal",
    label: "fight reversal %",
    statType: "FIGHT_REVERSAL_PERCENTAGE",
    agg: "avg",
    unit: "%",
    precision: 1,
  },
];

const calculatedStatMetrics: MetricDef[] = CALC_METRICS.map((c) => ({
  id: c.id,
  label: c.label,
  description: `${c.label} from CalculatedStat (stat = ${c.statType})`,
  table: "CalculatedStat",
  column: "value",
  source: "base",
  allowedAggs: ["avg", "sum", "max", "min"],
  defaultAgg: c.agg,
  unit: c.unit,
  precision: c.precision,
  lowerIsBetter: c.lowerIsBetter,
  statType: c.statType,
}));

// --- Kill metrics -----------------------------------------------------------
const killMetrics: MetricDef[] = [
  {
    id: "kills",
    label: "kills",
    description: "Count of kill events",
    table: "Kill",
    column: null,
    source: "base",
    allowedAggs: ["count"],
    defaultAgg: "count",
    precision: 0,
  },
  {
    id: "critical_kills",
    label: "critical-hit kills",
    description: "Kill events where the killing blow was a critical hit",
    table: "Kill",
    column: null,
    source: "base",
    allowedAggs: ["count"],
    defaultAgg: "count",
    precision: 0,
    countFilter: "is_critical_hit = 'True'",
  },
  {
    id: "environmental_kills",
    label: "environmental kills",
    description: "Kill events flagged as environmental",
    table: "Kill",
    column: null,
    source: "base",
    allowedAggs: ["count"],
    defaultAgg: "count",
    precision: 0,
    countFilter: "is_environmental = 'True'",
  },
  {
    id: "kill_damage",
    label: "killing-blow damage",
    description: "Damage on the killing blow (event_damage)",
    table: "Kill",
    column: "event_damage",
    source: "base",
    allowedAggs: ["sum", "avg", "max", "min"],
    defaultAgg: "avg",
    precision: 0,
  },
];

function heroFilter(id: string, label: string, column: string): FilterDef {
  return {
    id,
    label,
    table: column === "player_hero" ? "PlayerStat" : "Kill",
    column,
    source: "base",
    valueType: "hero",
    operators: ["in", "nin"],
    optionsColumn: column,
    optionsSource: "base",
  };
}

export const DATASET_REGISTRY: Record<DatasetId, DatasetDef> = {
  player_stat: {
    id: "player_stat",
    label: "Player stats",
    noun: "player stats",
    description: "Per-player performance recorded each round of every map.",
    table: "PlayerStat",
    grainNote:
      "PlayerStat holds a cumulative row per player per round. The compiler keeps only the final row per map (DISTINCT ON MapDataId, player, hero) before aggregating, so totals are not double-counted.",
    metrics: playerStatMetrics,
    dimensions: [
      {
        id: "player",
        label: "player",
        table: "PlayerStat",
        column: "player_name",
        source: "base",
      },
      {
        id: "hero",
        label: "hero",
        table: "PlayerStat",
        column: "player_hero",
        source: "base",
      },
      {
        id: "in_game_team",
        label: "in-game team",
        table: "PlayerStat",
        column: "player_team",
        source: "base",
      },
      {
        id: "map",
        label: "map",
        table: "MatchStart",
        column: "map_name",
        source: "match_start",
      },
      {
        id: "map_type",
        label: "map type",
        table: "MatchStart",
        column: "map_type",
        source: "match_start",
      },
      {
        id: "scrim",
        label: "scrim",
        table: "Scrim",
        column: "name",
        source: "scrim",
      },
    ],
    filters: [
      heroFilter("hero", "hero", "player_hero"),
      {
        id: "player",
        label: "player",
        table: "PlayerStat",
        column: "player_name",
        source: "base",
        valueType: "player",
        operators: ["in", "nin"],
        optionsColumn: "player_name",
        optionsSource: "base",
      },
      {
        id: "in_game_team",
        label: "in-game team",
        table: "PlayerStat",
        column: "player_team",
        source: "base",
        valueType: "text",
        operators: ["in", "nin"],
        optionsColumn: "player_team",
        optionsSource: "base",
      },
      mapTypeFilter,
      {
        id: "min_time_played",
        label: "time played",
        table: "PlayerStat",
        column: "hero_time_played",
        source: "base",
        valueType: "number",
        operators: ["gte", "gt", "lte", "lt"],
        unit: "s",
      },
    ],
  },
  calculated_stat: {
    id: "calculated_stat",
    label: "Calculated stats",
    noun: "calculated stats",
    description:
      "Derived analytics like MVP score, duel winrate, and ult economy.",
    table: "CalculatedStat",
    grainNote:
      "CalculatedStat holds one row per map, player, hero, and stat type. Each metric reads its stat type with a FILTER clause, so several derived stats can be selected side by side.",
    metrics: calculatedStatMetrics,
    dimensions: [
      {
        id: "player",
        label: "player",
        table: "CalculatedStat",
        column: "playerName",
        source: "base",
      },
      {
        id: "hero",
        label: "hero",
        table: "CalculatedStat",
        column: "hero",
        source: "base",
      },
      {
        id: "role",
        label: "role",
        table: "CalculatedStat",
        column: "role",
        source: "base",
      },
      {
        id: "map_type",
        label: "map type",
        table: "MatchStart",
        column: "map_type",
        source: "match_start",
      },
      {
        id: "scrim",
        label: "scrim",
        table: "Scrim",
        column: "name",
        source: "scrim",
      },
    ],
    filters: [
      {
        id: "role",
        label: "role",
        table: "CalculatedStat",
        column: "role",
        source: "base",
        valueType: "enum",
        operators: ["in", "nin"],
        enumOptions: ROLES.map((r) => ({ value: r, label: r.toLowerCase() })),
      },
      heroFilter("hero", "hero", "hero"),
      {
        id: "player",
        label: "player",
        table: "CalculatedStat",
        column: "playerName",
        source: "base",
        valueType: "player",
        operators: ["in", "nin"],
        optionsColumn: "playerName",
        optionsSource: "base",
      },
      mapTypeFilter,
    ],
  },
  kill: {
    id: "kill",
    label: "Kills",
    noun: "kills",
    description: "Every kill event, with attacker, victim, hero, and ability.",
    table: "Kill",
    grainNote:
      "Kill holds one row per kill event, so counts are exact with no deduplication.",
    metrics: killMetrics,
    dimensions: [
      {
        id: "attacker",
        label: "attacker",
        table: "Kill",
        column: "attacker_name",
        source: "base",
      },
      {
        id: "attacker_hero",
        label: "attacker hero",
        table: "Kill",
        column: "attacker_hero",
        source: "base",
      },
      {
        id: "victim",
        label: "victim",
        table: "Kill",
        column: "victim_name",
        source: "base",
      },
      {
        id: "victim_hero",
        label: "victim hero",
        table: "Kill",
        column: "victim_hero",
        source: "base",
      },
      {
        id: "ability",
        label: "ability",
        table: "Kill",
        column: "event_ability",
        source: "base",
      },
      {
        id: "map_type",
        label: "map type",
        table: "MatchStart",
        column: "map_type",
        source: "match_start",
      },
      {
        id: "scrim",
        label: "scrim",
        table: "Scrim",
        column: "name",
        source: "scrim",
      },
    ],
    filters: [
      heroFilter("attacker_hero", "attacker hero", "attacker_hero"),
      heroFilter("victim_hero", "victim hero", "victim_hero"),
      {
        id: "attacker",
        label: "attacker",
        table: "Kill",
        column: "attacker_name",
        source: "base",
        valueType: "player",
        operators: ["in", "nin"],
        optionsColumn: "attacker_name",
        optionsSource: "base",
      },
      {
        id: "ability",
        label: "ability",
        table: "Kill",
        column: "event_ability",
        source: "base",
        valueType: "text",
        operators: ["in", "nin"],
        optionsColumn: "event_ability",
        optionsSource: "base",
      },
      {
        id: "critical",
        label: "critical hit",
        table: "Kill",
        column: "is_critical_hit",
        source: "base",
        valueType: "enum",
        operators: ["eq"],
        enumOptions: [
          { value: "True", label: "yes" },
          { value: "False", label: "no" },
        ],
      },
      mapTypeFilter,
    ],
  },
  hero_swap: {
    id: "hero_swap",
    label: "Hero swaps",
    noun: "hero swaps",
    description: "Every mid-map hero swap, with the heroes swapped from and to.",
    table: "HeroSwap",
    grainNote:
      "HeroSwap holds one row per swap event, so counts are exact with no deduplication.",
    metrics: [
      {
        id: "swaps",
        label: "swaps",
        description: "Count of hero swap events",
        table: "HeroSwap",
        column: null,
        source: "base",
        allowedAggs: ["count"],
        defaultAgg: "count",
        precision: 0,
      },
      {
        id: "time_before_swap",
        label: "time before swap",
        description: "Time played on the previous hero before swapping",
        table: "HeroSwap",
        column: "hero_time_played",
        source: "base",
        allowedAggs: ["avg", "sum", "max", "min"],
        defaultAgg: "avg",
        unit: "s",
        precision: 0,
      },
    ],
    dimensions: [
      { id: "player", label: "player", table: "HeroSwap", column: "player_name", source: "base" },
      { id: "to_hero", label: "swapped to", table: "HeroSwap", column: "player_hero", source: "base" },
      { id: "from_hero", label: "swapped from", table: "HeroSwap", column: "previous_hero", source: "base" },
      { id: "in_game_team", label: "in-game team", table: "HeroSwap", column: "player_team", source: "base" },
      { id: "map_type", label: "map type", table: "MatchStart", column: "map_type", source: "match_start" },
      { id: "scrim", label: "scrim", table: "Scrim", column: "name", source: "scrim" },
    ],
    filters: [
      {
        id: "player",
        label: "player",
        table: "HeroSwap",
        column: "player_name",
        source: "base",
        valueType: "player",
        operators: ["in", "nin"],
        optionsColumn: "player_name",
        optionsSource: "base",
      },
      {
        id: "to_hero",
        label: "swapped to",
        table: "HeroSwap",
        column: "player_hero",
        source: "base",
        valueType: "hero",
        operators: ["in", "nin"],
        optionsColumn: "player_hero",
        optionsSource: "base",
      },
      {
        id: "from_hero",
        label: "swapped from",
        table: "HeroSwap",
        column: "previous_hero",
        source: "base",
        valueType: "hero",
        operators: ["in", "nin"],
        optionsColumn: "previous_hero",
        optionsSource: "base",
      },
      mapTypeFilter,
    ],
  },
  ultimate: {
    id: "ultimate",
    label: "Ultimates",
    noun: "ultimates",
    description: "Every ultimate used, by player and hero.",
    table: "UltimateEnd",
    grainNote:
      "UltimateEnd holds one row per ultimate used, so counts are exact with no deduplication.",
    metrics: [
      {
        id: "ultimates",
        label: "ultimates",
        description: "Count of ultimates used",
        table: "UltimateEnd",
        column: null,
        source: "base",
        allowedAggs: ["count"],
        defaultAgg: "count",
        precision: 0,
      },
    ],
    dimensions: [
      { id: "player", label: "player", table: "UltimateEnd", column: "player_name", source: "base" },
      { id: "hero", label: "hero", table: "UltimateEnd", column: "player_hero", source: "base" },
      { id: "in_game_team", label: "in-game team", table: "UltimateEnd", column: "player_team", source: "base" },
      { id: "map_type", label: "map type", table: "MatchStart", column: "map_type", source: "match_start" },
      { id: "scrim", label: "scrim", table: "Scrim", column: "name", source: "scrim" },
    ],
    filters: [
      {
        id: "player",
        label: "player",
        table: "UltimateEnd",
        column: "player_name",
        source: "base",
        valueType: "player",
        operators: ["in", "nin"],
        optionsColumn: "player_name",
        optionsSource: "base",
      },
      {
        id: "hero",
        label: "hero",
        table: "UltimateEnd",
        column: "player_hero",
        source: "base",
        valueType: "hero",
        operators: ["in", "nin"],
        optionsColumn: "player_hero",
        optionsSource: "base",
      },
      mapTypeFilter,
    ],
  },
  map: {
    id: "map",
    label: "Maps",
    noun: "maps",
    description: "Maps played, by name, type, and opponent.",
    table: "MatchStart",
    grainNote:
      "MatchStart holds one row per map, so a count equals the number of maps played.",
    metrics: [
      {
        id: "maps",
        label: "maps",
        description: "Count of maps played",
        table: "MatchStart",
        column: null,
        source: "base",
        allowedAggs: ["count"],
        defaultAgg: "count",
        precision: 0,
      },
    ],
    dimensions: [
      { id: "map", label: "map", table: "MatchStart", column: "map_name", source: "base" },
      { id: "map_type", label: "map type", table: "MatchStart", column: "map_type", source: "base" },
      { id: "opponent", label: "opponent", table: "MatchStart", column: "team_2_name", source: "base" },
      { id: "scrim", label: "scrim", table: "Scrim", column: "name", source: "scrim" },
    ],
    filters: [
      {
        id: "map",
        label: "map",
        table: "MatchStart",
        column: "map_name",
        source: "base",
        valueType: "text",
        operators: ["in", "nin"],
        optionsColumn: "map_name",
        optionsSource: "base",
      },
      {
        id: "map_type",
        label: "map type",
        table: "MatchStart",
        column: "map_type",
        source: "base",
        valueType: "enum",
        operators: ["in", "nin"],
        enumOptions: MAP_TYPES.map((v) => ({ value: v, label: v })),
      },
    ],
  },
  teamfight: {
    id: "teamfight",
    label: "Teamfights",
    noun: "teamfights",
    description:
      "Every teamfight, with who won, how many ultimates your team spent, and tempo context.",
    table: "Teamfight",
    kind: "computed",
    sourceTables: ["Kill", "MercyRez", "UltimateStart", "MatchStart"],
    grainNote:
      "Kills, resurrections, and ultimates are clustered into fights (15-second gaps). Each fight's winner and your ultimates spent are computed in a post-processing step, since no SQL query can express it.",
    metrics: [
      {
        id: "fights",
        label: "fights",
        description: "Number of teamfights",
        table: "Teamfight",
        column: null,
        source: "base",
        allowedAggs: ["count"],
        defaultAgg: "count",
        precision: 0,
      },
      {
        id: "win_rate",
        label: "win rate",
        description: "Share of fights won (avg of won × 100)",
        table: "Teamfight",
        column: "won",
        source: "base",
        allowedAggs: ["avg"],
        defaultAgg: "avg",
        unit: "%",
        precision: 1,
        scale: 100,
      },
      {
        id: "wins",
        label: "wins",
        description: "Number of fights won",
        table: "Teamfight",
        column: "won",
        source: "base",
        allowedAggs: ["sum"],
        defaultAgg: "sum",
        precision: 0,
      },
      {
        id: "avg_ults",
        label: "avg ultimates used",
        description: "Average ultimates your team spent per fight",
        table: "Teamfight",
        column: "ults_used",
        source: "base",
        allowedAggs: ["avg", "max", "min"],
        defaultAgg: "avg",
        precision: 2,
      },
    ],
    dimensions: [
      { id: "ults_used", label: "team ultimates used", table: "Teamfight", column: "ults_used", source: "base" },
      { id: "result", label: "result", table: "Teamfight", column: "result", source: "base" },
      { id: "first_pick", label: "first pick", table: "Teamfight", column: "first_pick", source: "base" },
      { id: "first_ult", label: "first ult", table: "Teamfight", column: "first_ult", source: "base" },
      { id: "reversal", label: "reversal", table: "Teamfight", column: "reversal", source: "base" },
      { id: "map_type", label: "map type", table: "Teamfight", column: "map_type", source: "base" },
      { id: "scrim", label: "scrim", table: "Teamfight", column: "scrim", source: "base" },
    ],
    filters: [
      {
        id: "ults_used",
        label: "team ultimates used",
        table: "Teamfight",
        column: "ults_used",
        source: "base",
        valueType: "number",
        operators: ["eq", "gte", "lte", "gt", "lt"],
      },
      {
        id: "map_type",
        label: "map type",
        table: "Teamfight",
        column: "map_type",
        source: "base",
        valueType: "enum",
        operators: ["in", "nin"],
        enumOptions: MAP_TYPES.map((v) => ({ value: v, label: v })),
      },
      {
        id: "result",
        label: "result",
        table: "Teamfight",
        column: "result",
        source: "base",
        valueType: "enum",
        operators: ["eq", "neq"],
        enumOptions: [
          { value: "win", label: "win" },
          { value: "loss", label: "loss" },
        ],
      },
      {
        id: "first_pick",
        label: "first pick",
        table: "Teamfight",
        column: "first_pick",
        source: "base",
        valueType: "enum",
        operators: ["eq"],
        enumOptions: [
          { value: "yes", label: "yes" },
          { value: "no", label: "no" },
        ],
      },
      {
        id: "first_ult",
        label: "first ult",
        table: "Teamfight",
        column: "first_ult",
        source: "base",
        valueType: "enum",
        operators: ["eq"],
        enumOptions: [
          { value: "yes", label: "yes" },
          { value: "no", label: "no" },
        ],
      },
      {
        id: "reversal",
        label: "reversal",
        table: "Teamfight",
        column: "reversal",
        source: "base",
        valueType: "enum",
        operators: ["eq"],
        enumOptions: [
          { value: "yes", label: "yes" },
          { value: "no", label: "no" },
        ],
      },
    ],
  },
};

export const DATASET_LIST = Object.values(DATASET_REGISTRY);

export function getDataset(id: DatasetId): DatasetDef {
  return DATASET_REGISTRY[id];
}

export function getMetric(
  dataset: DatasetId,
  id: string
): MetricDef | undefined {
  return DATASET_REGISTRY[dataset].metrics.find((m) => m.id === id);
}

export function getDimension(
  dataset: DatasetId,
  id: string
): DimensionDef | undefined {
  return DATASET_REGISTRY[dataset].dimensions.find((d) => d.id === id);
}

export function getFilter(
  dataset: DatasetId,
  id: string
): FilterDef | undefined {
  return DATASET_REGISTRY[dataset].filters.find((f) => f.id === id);
}

export const AGG_LABELS: Record<Aggregation, string> = {
  sum: "total",
  avg: "average",
  max: "max",
  min: "min",
  count: "count",
  per10: "per 10 min",
};

/** Short SQL-flavoured rendering of an aggregation, for the technical layer. */
export const AGG_SQL_LABELS: Record<Aggregation, string> = {
  sum: "SUM",
  avg: "AVG",
  max: "MAX",
  min: "MIN",
  count: "COUNT",
  per10: "SUM/time×600",
};
