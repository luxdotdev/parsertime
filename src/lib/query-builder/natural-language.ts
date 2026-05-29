import { allHeroes } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
import {
  getDataset,
  getMetric,
  type FilterDef,
} from "@/lib/query-builder/registry";
import {
  metricKey,
  type DatasetId,
  type MetricRef,
  type QueryFilter,
  type QuerySpec,
} from "@/lib/query-builder/types";

type PlannerInput = {
  question: string;
  teamId: number;
};

export type PlannedQuery = {
  spec: QuerySpec;
  summary: string;
};

const DEFAULT_LIMIT = 20;

const DEFAULT_METRIC: Record<DatasetId, string> = {
  player_stat: "eliminations",
  calculated_stat: "mvp_score",
  kill: "kills",
  hero_swap: "swaps",
  ultimate: "ultimates",
  map: "maps",
  teamfight: "win_rate",
  opening_kill: "first_deaths",
  rotation_death: "rotation_deaths",
  map_result: "win_rate",
  team_performance: "win_rate",
  map_intelligence: "weighted_win_rate",
  player_map_performance: "win_rate",
  player_impact: "consistency_score",
  player_trend: "improvement_percentage",
  player_outlier: "abs_z_score",
  player_target: "progress_percent",
  role_performance: "win_rate",
  ult_economy: "win_rate",
  duel: "win_rate",
  ability_impact: "win_rate",
  ability_timing: "win_rate",
  swap_impact: "win_rate",
  hero_pool: "win_rate",
  hero_diversity: "diversity_score",
  hero_pickrate: "pick_rate",
  hero_trend: "playtime_trend",
  player_intelligence: "hero_pool_size",
  enemy_hero: "win_rate",
  ban_impact: "win_rate_delta",
  ult_combo: "win_rate",
  role_trio: "win_rate",
  roster_variant: "win_rate",
  ult_impact: "win_rate",
  ult_usage: "ults_used",
  trend: "win_rate",
  streak: "length",
};

const DATASET_HINTS: Record<DatasetId, string[]> = {
  player_stat: [
    "player stat",
    "final blow",
    "final blows",
    "damage",
    "healing",
    "deaths",
    "time played",
    "playtime",
    "accuracy",
    "weapon accuracy",
    "critical hit accuracy",
    "scoped accuracy",
    "scoped critical hit accuracy",
    "environmental death",
    "environmental deaths",
    "best multikill",
    "biggest multikill",
    "multikill best",
    "widowmaker versus the time",
  ],
  calculated_stat: [
    "mvp",
    "map mvp",
    "map mvps",
    "fleta",
    "first pick percentage",
    "first pick rate",
    "first picks",
    "first death percentage",
    "first death rate",
    "first deaths",
    "duel winrate",
    "duel win rate",
    "ult charge time",
    "ultimate charge time",
    "time to use ult",
    "time to use ultimate",
    "drought time",
    "kills per ult",
    "kills per ultimate",
    "ajax",
    "ajaxes",
    "fight reversal percentage",
    "fight reversal rate",
  ],
  kill: ["kill feed", "kills by", "killed", "critical kill", "victim"],
  hero_swap: ["swap", "swaps", "swapped", "hero swap"],
  ultimate: ["ultimate used", "ultimates used", "ults used"],
  ult_combo: [
    "ult combo",
    "ult combos",
    "ultimate combo",
    "ultimate combos",
    "combo win rate",
    "combo winrate",
    "counter ult",
    "counter ultimate",
    "respond to ult",
    "response ult",
  ],
  ult_impact: [
    "ult impact",
    "ultimate impact",
    "uncontested ult",
    "uncontested ultimate",
    "mirror ult",
    "mirror ultimate",
    "mirrored ult",
    "mirrored ultimate",
    "when we ult",
    "when we use ult",
    "when we use ultimate",
    "enemy ult win rate",
    "enemy ultimate win rate",
  ],
  ult_usage: [
    "ult usage",
    "ultimate usage",
    "ults per map",
    "ultimates per map",
    "most ults",
    "most ultimates",
    "fight opener",
    "fight openers",
    "open fights with ult",
    "opens fights with ult",
    "opening ult",
    "opening ultimate",
    "fight openings per map",
    "opening ults per map",
  ],
  role_trio: [
    "role trio",
    "role trios",
    "lineup",
    "lineups",
    "roster combo",
    "roster combos",
    "player combination",
    "player combinations",
    "five stack",
    "starting five",
  ],
  roster_variant: [
    "roster",
    "rosters",
    "roster variant",
    "roster variants",
    "best roster",
    "best rosters",
    "map roster",
    "map rosters",
    "lineup by map",
    "lineups by map",
  ],
  map: ["maps played", "opponent", "map count"],
  trend: [
    "trend",
    "trends",
    "over time",
    "recent form",
    "last 5 maps",
    "last 10 maps",
    "last 20 maps",
    "last 5 games",
    "last 10 games",
    "last 20 games",
    "last five",
    "last ten",
    "recent games",
    "weekly",
    "by week",
    "monthly",
    "by month",
    "day of week",
    "by day",
  ],
  streak: [
    "streak",
    "streaks",
    "win streak",
    "loss streak",
    "current streak",
    "current win streak",
    "current loss streak",
    "longest streak",
    "longest win streak",
    "longest loss streak",
  ],
  teamfight: [
    "fight",
    "teamfight",
    "team fight",
    "first pick",
    "first death",
    "dry fight",
    "wasted ult",
  ],
  opening_kill: [
    "opening kill",
    "opening kills",
    "opening pick",
    "opening picks",
    "opening death",
    "opening deaths",
    "first kill",
    "first kills",
    "dies first",
    "died first",
    "die first",
    "first to die",
    "gets first pick",
    "got first pick",
    "first picked",
    "picked first",
  ],
  rotation_death: [
    "rotation death",
    "rotation deaths",
    "rotational death",
    "rotational deaths",
    "caught rotating",
    "caught on rotation",
    "died rotating",
    "dies rotating",
    "early death with low damage",
  ],
  map_result: [
    "best map mode",
    "best map type",
    "map playtime",
    "map time played",
    "maps played most",
    "most played maps",
    "played maps most",
    "map mode",
    "map modes",
    "map type",
    "map types",
    "map win",
    "map winrate",
    "map win rate",
    "record by map",
    "record against",
    "record versus",
    "map record",
    "match record",
  ],
  team_performance: [
    "team performance",
    "team stats",
    "team stat",
    "team aggregate",
    "team comparison",
    "our team",
    "opponent team",
    "enemy team",
    "us versus them",
    "us vs them",
    "we compared to them",
  ],
  map_intelligence: [
    "map intelligence",
    "weighted map win rate",
    "weighted win rate by map",
    "strength weighted",
    "time weighted",
    "time-decayed",
    "decayed win rate",
    "map trend",
    "map trends",
    "improving maps",
    "declining maps",
    "map type dependency",
    "map type dependencies",
    "best weighted maps",
    "worst weighted maps",
  ],
  player_map_performance: [
    "player map performance",
    "player map winrate",
    "player map win rate",
    "map performance",
    "players by map",
    "player by map",
    "best player on map",
    "best players on map",
    "perform best on",
    "performance on",
  ],
  player_impact: [
    "player impact",
    "impact metrics",
    "consistency",
    "consistent",
    "most consistent",
    "least consistent",
    "volatile",
    "volatility",
    "variance",
    "standard deviation",
    "stddev",
    "swingy",
    "streaky",
    "map mvp rate",
    "first picks per 10",
    "first deaths per 10",
    "ajax per 10",
    "all damage per 10",
    "damage taken per 10",
    "ultimates used per 10",
    "kills per ultimate",
    "kills per ult",
  ],
  player_trend: [
    "player trend",
    "player trends",
    "improving player",
    "improving players",
    "players improving",
    "player improving",
    "declining player",
    "declining players",
    "players declining",
    "player declining",
    "trending up",
    "trending down",
    "what is improving",
    "what are improving",
  ],
  player_outlier: [
    "outlier",
    "outliers",
    "z score",
    "z-score",
    "hero baseline",
    "baseline",
    "percentile",
    "far above",
    "far below",
    "above baseline",
    "below baseline",
  ],
  player_target: [
    "player target",
    "player targets",
    "target progress",
    "goal progress",
    "progress toward target",
    "progress toward goal",
    "on track",
    "off track",
    "stalled target",
    "saved target",
    "saved goal",
  ],
  role_performance: [
    "role performance",
    "role stats",
    "role stat",
    "role line",
    "role lines",
    "by role",
    "per role",
    "tank role",
    "damage role",
    "support role",
    "tank line",
    "damage line",
    "support line",
  ],
  ult_economy: [
    "ult economy",
    "ultimate economy",
    "ult advantage",
    "ult bank",
    "ahead an ult",
    "behind an ult",
  ],
  duel: ["duel", "duels", "matchup", "hero matchup", "enemy hero"],
  ability_impact: [
    "ability",
    "abilities",
    "cooldown",
    "used ability",
    "using ability",
    "suzu",
    "sleep dart",
    "biotic grenade",
    "teleporter",
    "amp it up",
    "lamp",
  ],
  ability_timing: [
    "ability timing",
    "cooldown timing",
    "when should",
    "when to use",
    "best phase",
    "phase timing",
    "pre fight",
    "pre-fight",
    "early fight",
    "mid fight",
    "late fight",
    "cleanup",
  ],
  swap_impact: [
    "swap impact",
    "swap winrate",
    "swap win rate",
    "when we swap",
    "when swapping",
    "swap count",
    "swaps per map",
    "too many swaps",
  ],
  hero_pool: [
    "hero pool",
    "hero winrate",
    "hero win rate",
    "hero winrates",
    "hero win rates",
    "hero wins",
    "hero losses",
    "top heroes",
    "best heroes",
    "most played hero",
    "most played heroes",
    "damage heroes",
    "support heroes",
    "tank heroes",
    "ultimate efficiency",
    "ult efficiency",
  ],
  hero_diversity: [
    "hero diversity",
    "hero pool diversity",
    "diverse hero pool",
    "diversity score",
    "unique heroes",
    "effective hero pool",
    "heroes per role",
    "role hero pool",
    "thin hero pool",
    "thinnest hero pool",
    "shared heroes",
    "specialist heroes",
  ],
  hero_pickrate: [
    "hero pickrate",
    "hero pick rate",
    "pickrate",
    "pick rate",
    "pick rates",
    "hero ownership",
    "ownership rate",
    "owns our",
    "owned by",
    "player hero share",
    "hero pool share",
  ],
  hero_trend: [
    "hero trend",
    "hero trends",
    "hero usage trend",
    "hero usage trends",
    "hero pick trend",
    "hero pick trends",
    "pick rate trend",
    "playtime trend",
    "trending hero",
    "trending heroes",
    "heroes trending",
    "hero meta",
    "meta trend",
  ],
  player_intelligence: [
    "player intelligence",
    "hero depth",
    "hero depths",
    "hero pool depth",
    "hero pool size",
    "deep hero pool",
    "deepest hero pool",
    "flexible",
    "flexibility",
    "one trick",
    "one-trick",
    "primary hero",
    "primary time share",
    "hero dependency",
    "hero dependence",
    "forced off",
    "forced maps",
    "substitution rate",
    "forced substitution",
    "forced substitutions",
    "composite z score",
    "z score",
    "z-score",
  ],
  enemy_hero: [
    "against",
    "against enemy",
    "against enemy hero",
    "enemy heroes",
    "enemy hero win rate",
    "enemy hero winrate",
    "win rate against",
    "winrate against",
    "weak against",
    "worst against",
    "best against",
  ],
  ban_impact: [
    "ban",
    "bans",
    "banned",
    "hero ban",
    "ban impact",
    "ban rate",
    "most banned",
    "weak point",
    "weak points",
    "strong ban",
    "strong bans",
  ],
};

const METRIC_ALIASES: Record<string, string[]> = {
  final_blows: ["final blow", "final blows", "finals"],
  eliminations: ["eliminations", "elims"],
  deaths: ["deaths", "deaths per 10"],
  assists: ["assists", "offensive assists"],
  mvp_score: ["mvp", "mvp score", "average mvp score"],
  map_mvp_count: ["map mvps", "map mvp count"],
  fleta_deadlift: ["fleta", "fleta deadlift", "deadlift"],
  first_pick_pct: [
    "first pick",
    "first pick percentage",
    "first pick rate",
    "opening pick rate",
  ],
  first_pick_count: ["first picks", "first pick count", "opening picks"],
  first_pick_percentage: [
    "first pick",
    "first pick percentage",
    "first pick rate",
    "opening pick rate",
  ],
  first_death_pct: [
    "first death",
    "first death percentage",
    "first death rate",
    "opening death rate",
  ],
  first_death_count: ["first deaths", "first death count", "opening deaths"],
  first_death_percentage: [
    "first death",
    "first death percentage",
    "first death rate",
    "opening death rate",
  ],
  ajax_count: ["ajax", "ajaxes", "ajax count"],
  ult_charge_time: [
    "ult charge time",
    "ultimate charge time",
    "average ult charge time",
    "average ultimate charge time",
  ],
  average_ult_charge_time: [
    "ult charge time",
    "ultimate charge time",
    "average ult charge time",
    "average ultimate charge time",
  ],
  time_to_use_ult: [
    "time to use ult",
    "time to use ultimate",
    "average time to use ult",
    "average time to use ultimate",
  ],
  drought_time: ["drought time", "average drought time"],
  kills_per_ult: [
    "kills per ult",
    "kills per ultimate",
    "elims per ult",
    "eliminations per ultimate",
  ],
  duel_winrate: ["duel winrate", "duel win rate", "duel rate"],
  fight_reversal: [
    "fight reversal",
    "fight reversal percentage",
    "fight reversal rate",
  ],
  time_played: ["time played", "playtime", "played it", "played them"],
  hero_damage: ["hero damage", "damage dealt", "damage per 10"],
  all_damage: ["all damage", "total damage"],
  damage_taken: ["damage taken", "damage taken per 10"],
  healing: ["healing", "heals", "healing per 10"],
  environmental_deaths: [
    "environmental death",
    "environmental deaths",
    "boop deaths",
    "booped deaths",
  ],
  multikill_best: ["best multikill", "biggest multikill", "multikill best"],
  ults_used: [
    "ults used",
    "ultimates used",
    "ultimate usage",
    "most ults",
    "most ultimates",
    "total ultimates",
  ],
  ultimates_used: ["ults used", "ultimates used", "ultimate usage"],
  ultimates_earned: ["ults earned", "ultimates earned"],
  weapon_accuracy: ["weapon accuracy", "shot accuracy"],
  critical_hit_accuracy: [
    "critical hit accuracy",
    "crit accuracy",
    "critical accuracy",
  ],
  scoped_accuracy: ["scoped accuracy", "scope accuracy", "scoped acc"],
  scoped_critical_hit_accuracy: [
    "scoped critical hit accuracy",
    "scoped crit accuracy",
    "scoped critical accuracy",
  ],
  ult_efficiency: [
    "ultimate efficiency",
    "ult efficiency",
    "eliminations per ultimate",
    "elims per ult",
  ],
  kd: ["kd", "k d", "final blows per death"],
  diversity_score: ["diversity", "diversity score", "hero diversity"],
  role_coverage: ["role coverage", "coverage"],
  unique_heroes: ["unique heroes", "hero count", "heroes per role"],
  effective_hero_pool: ["effective hero pool", "effective heroes"],
  average_maps_per_hero: ["average maps per hero", "maps per hero"],
  specialist_heroes: ["specialist heroes", "one player heroes"],
  shared_heroes: ["shared heroes", "shared hero pool"],
  pick_rate: ["pickrate", "pick rate", "pick rates", "hero pool share"],
  ownership_rate: [
    "ownership",
    "ownership rate",
    "owns",
    "owned by",
    "share of hero",
  ],
  hero_pool_size: [
    "hero pool size",
    "hero depth",
    "hero depths",
    "hero pool depth",
    "deep hero pool",
    "deepest hero pool",
    "flexibility",
    "flexible",
  ],
  primary_time_share: [
    "primary time share",
    "primary share",
    "most played share",
    "one trick",
    "one-trick",
    "hero dependency",
    "hero dependence",
    "dependent",
  ],
  substitution_rate: [
    "substitution rate",
    "forced off",
    "forced substitution",
    "forced substitutions",
  ],
  maps_forced: ["forced maps", "maps forced", "forced off maps"],
  primary_secondary_delta: [
    "primary secondary delta",
    "primary-secondary delta",
    "secondary delta",
    "hero depth delta",
  ],
  composite_z_score: [
    "composite z score",
    "composite z-score",
    "z score",
    "z-score",
    "hero score",
    "best hero",
    "best heroes",
  ],
  ban_rate: ["ban rate", "banned rate", "most banned"],
  maps_banned: ["maps banned", "bans", "ban count", "total bans"],
  win_rate_delta: [
    "delta",
    "win rate delta",
    "winrate delta",
    "difference",
    "deviation",
    "impact",
    "weak point",
    "weak points",
    "strong ban",
    "strong bans",
  ],
  win_rate_with: ["win rate with ban", "winrate with ban"],
  win_rate_without: ["win rate without ban", "winrate without ban"],
  overall_win_rate: ["overall win rate", "overall winrate", "baseline"],
  uses: [
    "uses",
    "used",
    "usage",
    "how often",
    "most common",
    "combo count",
    "response count",
  ],
  games: ["games", "maps", "maps played", "sample", "sample size"],
  playtime: [
    "playtime",
    "time played",
    "map playtime",
    "map time played",
    "most played",
    "most time",
    "played most",
    "played the most",
  ],
  ults_per_map: ["ults per map", "ultimates per map"],
  fight_openings: [
    "fight openings",
    "fight opener",
    "fight openers",
    "open fights",
    "opening ult",
    "opening ultimate",
  ],
  fight_openings_per_map: [
    "fight openings per map",
    "fight opener per map",
    "fight openers per map",
    "opening ults per map",
    "opening ultimates per map",
    "open fights with ult per map",
  ],
  avg_wasted_ults: ["wasted ult", "wasted ults", "wasted ultimates"],
  first_pick_rate: ["first pick rate", "first-pick rate", "opening pick rate"],
  first_death_rate: [
    "first death rate",
    "first-death rate",
    "opening death rate",
  ],
  first_ult_rate: ["first ult rate", "first ultimate rate"],
  dry_fight_rate: ["dry fight rate", "dry-fight rate"],
  reversal_rate: ["reversal rate", "fight reversal rate"],
  dry_fight_reversal_rate: [
    "dry fight reversal rate",
    "dry-fight reversal rate",
    "dry reversal rate",
  ],
  non_dry_fight_reversal_rate: [
    "non dry fight reversal rate",
    "non-dry fight reversal rate",
    "non dry reversal rate",
  ],
  ultimate_efficiency: [
    "ultimate efficiency",
    "ult efficiency",
    "fight wins per ultimate",
    "fight wins per ult",
  ],
  avg_ults_per_non_dry_fight: [
    "average ults per non dry fight",
    "average ultimates per non dry fight",
    "ults per non dry fight",
    "ultimates per non dry fight",
  ],
  avg_ults_in_won_fights: [
    "average ults in won fights",
    "average ultimates in won fights",
    "ults in won fights",
  ],
  avg_ults_in_lost_fights: [
    "average ults in lost fights",
    "average ultimates in lost fights",
    "ults in lost fights",
  ],
  first_events: ["opening kill", "opening kills", "first kill", "first kills"],
  first_deaths: [
    "first death",
    "first deaths",
    "opening death",
    "opening deaths",
    "dies first",
    "died first",
    "die first",
    "first to die",
    "picked first",
    "first picked",
  ],
  first_picks: [
    "first pick",
    "first picks",
    "opening pick",
    "opening picks",
    "opening kills secured",
    "gets first pick",
    "got first pick",
  ],
  losses: ["losses", "lost", "lose"],
  rotation_deaths: [
    "rotation death",
    "rotation deaths",
    "rotational death",
    "rotational deaths",
    "caught rotating",
  ],
  rotation_death_rate: [
    "rotation death rate",
    "rotation deaths rate",
    "rotational death rate",
    "rotation rate",
  ],
  early_death_rate: ["early death rate", "early fight death rate"],
  pre_fight_damage: ["pre fight damage", "pre-fight damage"],
  kill_distance: ["kill distance", "death distance"],
  final_blows_per10: ["final blows per 10", "finals per 10"],
  eliminations_per10: ["eliminations per 10", "elims per 10", "kills per 10"],
  hero_damage_per10: [
    "hero damage per 10",
    "damage per 10",
    "damage dealt per 10",
  ],
  deaths_per10: ["deaths per 10", "deaths per 10 minutes"],
  all_damage_per10: [
    "all damage per 10",
    "total damage per 10",
    "all damage per 10 minutes",
  ],
  damage_taken_per10: ["damage taken per 10", "damage taken per 10 minutes"],
  healing_per10: ["healing per 10", "healing per 10 minutes"],
  healing_received_per10: ["healing received per 10", "heals received per 10"],
  assists_per10: ["assists per 10", "offensive assists per 10"],
  solo_kills_per10: ["solo kills per 10", "solo kill per 10"],
  objective_kills_per10: ["objective kills per 10", "objective kill per 10"],
  offensive_assists_per10: [
    "offensive assists per 10",
    "offensive assist per 10",
  ],
  defensive_assists_per10: [
    "defensive assists per 10",
    "defensive assist per 10",
  ],
  ults_earned_per10: [
    "ults earned per 10",
    "ultimates earned per 10",
    "ult charge per 10",
  ],
  ults_used_per10: [
    "ults used per 10",
    "ultimates used per 10",
    "ult usage per 10",
  ],
  first_picks_per10: [
    "first picks per 10",
    "opening picks per 10",
    "first pick count per 10",
  ],
  first_deaths_per10: [
    "first deaths per 10",
    "opening deaths per 10",
    "first death count per 10",
  ],
  ajax_per10: ["ajax per 10", "ajaxes per 10", "ajax count per 10"],
  damage_per10: [
    "damage per 10",
    "hero damage per 10",
    "damage per 10 minutes",
  ],
  win_rate: ["winrate", "winrates", "win rate", "win rates", "wr"],
  weighted_win_rate: [
    "weighted win rate",
    "time weighted win rate",
    "time-decayed win rate",
    "decayed win rate",
    "strength weighted",
  ],
  recent_win_rate: ["recent win rate", "recent form", "last 10 win rate"],
  trend_delta: ["trend delta", "recent delta", "change", "improvement"],
  playtime_trend: ["playtime trend", "usage trend", "hero usage trend"],
  pick_rate_trend: ["pick rate trend", "pickrate trend", "pick trend"],
  improvement_percentage: [
    "improvement percentage",
    "improvement %",
    "change percentage",
    "trend percentage",
  ],
  improvement: ["improvement", "trend change"],
  raw_change: ["raw change", "late minus early"],
  early_value: ["early value", "early sample", "first half"],
  late_value: ["late value", "late sample", "second half"],
  abs_z_score: [
    "outlier",
    "outliers",
    "absolute z score",
    "absolute z-score",
    "distance from baseline",
  ],
  z_score: ["z score", "z-score", "above baseline", "below baseline"],
  percentile: ["percentile", "hero percentile"],
  per10_value: ["per 10 value", "actual per 10"],
  baseline_per10: ["baseline", "baseline per 10", "hero baseline"],
  progress_percent: ["progress", "progress percentage", "progress %"],
  current_value: ["current value", "current stat", "current"],
  baseline_value: ["baseline value", "baseline"],
  target_value: ["target value", "goal value"],
  gap_to_target: ["gap to target", "remaining", "distance to target"],
  sample_scrims: ["sample scrims", "scrim sample"],
  consistency_score: [
    "consistency",
    "consistent",
    "consistency score",
    "steady",
    "stable output",
  ],
  eliminations_per10_stddev: [
    "eliminations volatility",
    "elims volatility",
    "eliminations standard deviation",
  ],
  deaths_per10_stddev: ["deaths volatility", "deaths standard deviation"],
  all_damage_per10_stddev: [
    "damage volatility",
    "damage standard deviation",
    "volatile damage",
  ],
  healing_per10_stddev: [
    "healing volatility",
    "healing standard deviation",
    "volatile healing",
  ],
  map_mvp_rate: ["map mvp rate", "map mvp percentage"],
  fleta_deadlift_percentage: ["fleta deadlift", "fleta deadlift percentage"],
  fight_reversal_percentage: ["fight reversal", "fight reversal percentage"],
  length: ["length", "streak length", "streak count"],
  fights: ["fights", "teamfights", "team fights"],
  duration: [
    "duration",
    "fight duration",
    "teamfight duration",
    "team fight duration",
    "average fight length",
    "average fight duration",
    "fight length",
  ],
  maps: ["maps", "map count", "maps played"],
  kills: ["kills", "kill count"],
};

const DIMENSION_ALIASES: Record<string, string[]> = {
  player: ["player", "who"],
  hero: ["hero"],
  our_hero: ["our hero", "hero"],
  enemy_hero: ["enemy hero", "opponent hero"],
  attacker_hero: ["attacker hero", "killing hero"],
  victim_hero: ["victim hero", "death hero"],
  map: ["map", "maps"],
  map_type: ["map type", "mode"],
  opponent: ["opponent"],
  scrim: ["scrim", "scrims"],
  date: ["date"],
  week: ["week", "weekly"],
  month: ["month", "monthly"],
  day_of_week: ["day", "day of week"],
  recent_bucket: ["recent bucket", "recent form"],
  result: ["result", "win loss"],
  dry_fight: ["dry fight"],
  first_pick: ["first pick"],
  first_death: ["first death"],
  first_ult: ["first ult", "first ultimate"],
  advantage_bucket: ["advantage bucket", "ult advantage"],
  ability: ["ability", "cooldown"],
  phase: ["phase", "timing", "fight phase"],
  impact_rating: ["impact rating", "impact"],
  side: ["side", "team"],
  death_type: ["death type", "rotation death"],
  attacker: ["attacker", "killer"],
  attacker_side: ["attacker side", "killer side"],
  type: ["type"],
  combo: ["combo", "ult combo", "ultimate combo"],
  roster: ["roster", "lineup"],
  hero_a: ["first hero"],
  hero_b: ["second hero"],
  response_hero: ["response hero", "counter hero"],
  trio: ["lineup", "role trio", "roster combo", "player combination"],
  tank: ["tank"],
  dps1: ["damage 1", "dps 1"],
  dps2: ["damage 2", "dps 2"],
  support1: ["support 1"],
  support2: ["support 2"],
  used: ["used", "usage"],
  scenario: ["scenario", "used vs not used"],
  mirrored: ["mirrored", "mirror ult", "mirror ultimate"],
  first_side: ["first ult side", "first ultimate side"],
  row_type: ["summary type"],
  top_fight_opening_hero: ["top fight-opening hero", "fight opener"],
  role: ["role"],
  primary_hero: ["primary hero", "best hero"],
  most_played_hero: ["most played hero"],
  is_primary: ["is primary", "primary"],
  is_most_played: ["is most played", "most played"],
  had_swap: ["had swap", "with swaps", "without swaps"],
  swap_count: ["swap count", "number of swaps"],
  swap_count_bucket: ["swap count bucket", "swaps"],
  first_swap_timing: ["first swap timing", "swap timing"],
  streak: ["streak"],
  trend: ["trend"],
  direction: ["direction"],
  trending: ["trending"],
  status: ["status", "target status", "goal status"],
  confidence: ["confidence", "sample confidence"],
  start_date: ["start date", "started"],
  end_date: ["end date", "ended"],
};

const FILLER_WORDS = new Set([
  "a",
  "about",
  "all",
  "and",
  "are",
  "as",
  "at",
  "by",
  "data",
  "find",
  "for",
  "has",
  "have",
  "he",
  "her",
  "hero",
  "heroes",
  "his",
  "i",
  "in",
  "it",
  "is",
  "know",
  "least",
  "less",
  "map",
  "maps",
  "me",
  "minimum",
  "more",
  "need",
  "number",
  "of",
  "on",
  "our",
  "over",
  "damage",
  "player",
  "players",
  "role",
  "scrim",
  "scrims",
  "support",
  "stat",
  "stats",
  "tank",
  "team",
  "the",
  "their",
  "them",
  "time",
  "to",
  "type",
  "than",
  "ult",
  "ults",
  "ultimate",
  "ultimates",
  "under",
  "up",
  "us",
  "versus",
  "vs",
  "we",
  "what",
  "when",
  "which",
  "who",
  "with",
  "you",
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function includesPhrase(haystack: string, phrase: string): boolean {
  const normalized = normalize(phrase);
  return new RegExp(`(^|\\s)${escapeRegExp(normalized)}(\\s|$)`).test(haystack);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twenty: 20,
};

const NUMBER_WORD_TOKEN =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty";
const NUMBER_TOKEN = `\\d+(?:\\.\\d+)?|${NUMBER_WORD_TOKEN}`;
const INTEGER_TOKEN = `\\d{1,3}|${NUMBER_WORD_TOKEN}`;

const HERO_BY_NORMALIZED = new Map(
  allHeroes.flatMap((hero) => {
    const base = normalize(hero.name);
    const abilityAliases = [hero.ability1.name, hero.ability2.name].flatMap(
      (name) => {
        const normalized = normalize(name);
        return [
          normalized,
          ...normalized
            .split(/\s+/)
            .filter((word) => word.length > 3 && !FILLER_WORDS.has(word)),
        ];
      }
    );
    const aliases = [base, ...abilityAliases];
    if (base === "soldier 76") aliases.push("soldier", "soldier76");
    if (base === "wrecking ball") aliases.push("ball", "hammond");
    if (base === "junker queen") aliases.push("jq");
    if (base === "widowmaker") aliases.push("widow");
    return aliases.map((alias) => [alias, hero.name] as const);
  })
);

const ABILITY_BY_NORMALIZED = new Map(
  allHeroes.flatMap((hero) =>
    [hero.ability1.name, hero.ability2.name].flatMap((name) => {
      const normalized = normalize(name);
      return [
        [normalized, name] as const,
        ...normalized
          .split(/\s+/)
          .filter((word) => word.length > 3 && !FILLER_WORDS.has(word))
          .map((word) => [word, name] as const),
      ];
    })
  )
);

const MAP_BY_NORMALIZED = new Map(
  Object.keys(mapNameToMapTypeMapping).map(
    (mapName) => [normalize(mapName), mapName] as const
  )
);

type HeroMention = {
  hero: string;
  index: number;
  aliasLength: number;
};

function findPhraseIndex(haystack: string, phrase: string): number {
  const normalized = normalize(phrase);
  const match = new RegExp(`(^|\\s)${escapeRegExp(normalized)}(?=\\s|$)`).exec(
    haystack
  );
  if (!match) return -1;
  return match.index + (match[1] ? match[1].length : 0);
}

function findHeroMentions(question: string): HeroMention[] {
  const normalized = normalize(question);
  const matches = Array.from(HERO_BY_NORMALIZED.entries())
    .map(([alias, hero]) => ({
      hero,
      index: findPhraseIndex(normalized, alias),
      aliasLength: alias.length,
    }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const seen = new Set<string>();
  const mentions: HeroMention[] = [];
  for (const mention of matches) {
    if (seen.has(mention.hero)) continue;
    seen.add(mention.hero);
    mentions.push(mention);
  }
  return mentions;
}

function findAbility(question: string): string | null {
  const normalized = normalize(question);
  const matches = Array.from(ABILITY_BY_NORMALIZED.entries())
    .filter(([alias]) => includesPhrase(normalized, alias))
    .sort((a, b) => b[0].length - a[0].length);
  return matches[0]?.[1] ?? null;
}

function findMapName(question: string): string | null {
  const normalized = normalize(question);
  const matches = Array.from(MAP_BY_NORMALIZED.entries())
    .filter(([alias]) => includesPhrase(normalized, alias))
    .sort((a, b) => b[0].length - a[0].length);
  return matches[0]?.[1] ?? null;
}

function findPlayer(question: string, hero: string | null): string | null {
  const heroWords = new Set(normalize(hero ?? "").split(/\s+/));
  const mapWords = new Set(normalize(findMapName(question) ?? "").split(/\s+/));
  const nonPlayerWords = new Set([
    "hero",
    "map",
    "role",
    "team",
    "player",
    "target",
    "targets",
    "goal",
    "goals",
    "progress",
    "status",
    "track",
    "final",
    "blow",
    "blows",
    "damage",
    "healing",
    "death",
    "deaths",
    "elimination",
    "eliminations",
    "elim",
    "elims",
    "ultimate",
    "ultimates",
    "ult",
    "ults",
  ]);
  const candidates = [
    ...question.matchAll(
      /\b(?:for|player|by)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\b/gi
    ),
    ...question.matchAll(
      /\b(?:with|alongside)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\b/gi
    ),
    ...question.matchAll(
      /\b(?:is|was|are|were)\s+([A-Z][A-Za-z0-9_.-]{1,})\b/g
    ),
    ...question.matchAll(
      /\b(?:does|did)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:have|has|record|recorded)\b/gi
    ),
    ...question.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:has|had)\b/gi),
    ...question.matchAll(
      /\b([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:dies|died|die|gets|got)\b/gi
    ),
    ...question.matchAll(
      /\b([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:improving|improve|improved|declining|decline|declined|trending)\b/gi
    ),
    ...question.matchAll(
      /\b([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:target|targets|goal|goals|progress)\b/gi
    ),
    ...question.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,})'s\s+/gi),
  ];

  for (const match of candidates) {
    const candidate = match[1];
    const normalized = normalize(candidate);
    if (
      !normalized ||
      FILLER_WORDS.has(normalized) ||
      nonPlayerWords.has(normalized) ||
      heroWords.has(normalized) ||
      mapWords.has(normalized)
    ) {
      continue;
    }
    return candidate === candidate.toUpperCase()
      ? candidate
      : titleCase(candidate);
  }
  return null;
}

function formatEntityName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed === trimmed.toUpperCase() ? trimmed : titleCase(trimmed);
}

function findOpponent(question: string): string | null {
  const match = question.match(
    /\b(?:against|vs|versus)\s+([A-Za-z0-9][A-Za-z0-9_.&' -]*?)(?=\s+(?:on|by|per|with|in|over|for|across|when|where)\b|[?.!,]|$)/i
  );
  if (!match) return null;
  const opponent = formatEntityName(match[1]);
  if (!opponent || FILLER_WORDS.has(normalize(opponent))) return null;
  return opponent;
}

function mentionsFightContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "fight") ||
    includesPhrase(normalized, "fights") ||
    includesPhrase(normalized, "teamfight") ||
    includesPhrase(normalized, "teamfights") ||
    includesPhrase(normalized, "team fight") ||
    includesPhrase(normalized, "team fights")
  );
}

function mentionsTrendContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "trend") ||
    includesPhrase(normalized, "trends") ||
    includesPhrase(normalized, "over time") ||
    includesPhrase(normalized, "recent form") ||
    includesPhrase(normalized, "last 5 maps") ||
    includesPhrase(normalized, "last 10 maps") ||
    includesPhrase(normalized, "last 20 maps") ||
    includesPhrase(normalized, "last 5 games") ||
    includesPhrase(normalized, "last 10 games") ||
    includesPhrase(normalized, "last 20 games") ||
    includesPhrase(normalized, "last five") ||
    includesPhrase(normalized, "last ten") ||
    includesPhrase(normalized, "recent games") ||
    includesPhrase(normalized, "weekly") ||
    includesPhrase(normalized, "by week") ||
    includesPhrase(normalized, "monthly") ||
    includesPhrase(normalized, "by month") ||
    includesPhrase(normalized, "day of week") ||
    includesPhrase(normalized, "by day")
  );
}

function mentionsMapIntelligenceContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "map intelligence") ||
    includesPhrase(normalized, "weighted map win rate") ||
    includesPhrase(normalized, "weighted win rate by map") ||
    includesPhrase(normalized, "strength weighted") ||
    includesPhrase(normalized, "time weighted") ||
    includesPhrase(normalized, "time-decayed") ||
    includesPhrase(normalized, "decayed win rate") ||
    includesPhrase(normalized, "map trend") ||
    includesPhrase(normalized, "map trends") ||
    includesPhrase(normalized, "improving maps") ||
    includesPhrase(normalized, "maps are improving") ||
    includesPhrase(normalized, "declining maps") ||
    includesPhrase(normalized, "maps are declining") ||
    ((includesPhrase(normalized, "improving") ||
      includesPhrase(normalized, "declining")) &&
      (includesPhrase(normalized, "map") ||
        includesPhrase(normalized, "maps"))) ||
    includesPhrase(normalized, "map type dependency") ||
    includesPhrase(normalized, "map type dependencies")
  );
}

function mentionsTeamPerformanceContext(normalized: string): boolean {
  if (
    includesPhrase(normalized, "teamfight") ||
    includesPhrase(normalized, "teamfights") ||
    includesPhrase(normalized, "team fight") ||
    includesPhrase(normalized, "team fights")
  ) {
    return false;
  }

  const teamContext =
    includesPhrase(normalized, "team performance") ||
    includesPhrase(normalized, "team stats") ||
    includesPhrase(normalized, "team stat") ||
    includesPhrase(normalized, "team aggregate") ||
    includesPhrase(normalized, "team comparison") ||
    includesPhrase(normalized, "our team") ||
    includesPhrase(normalized, "opponent team") ||
    includesPhrase(normalized, "enemy team") ||
    includesPhrase(normalized, "us vs them") ||
    includesPhrase(normalized, "us versus them") ||
    includesPhrase(normalized, "we compared to them");
  const teamMetric =
    includesPhrase(normalized, "win rate") ||
    includesPhrase(normalized, "winrate") ||
    includesPhrase(normalized, "final blows") ||
    includesPhrase(normalized, "eliminations") ||
    includesPhrase(normalized, "solo kills") ||
    includesPhrase(normalized, "objective kills") ||
    includesPhrase(normalized, "assists") ||
    includesPhrase(normalized, "damage") ||
    includesPhrase(normalized, "healing") ||
    includesPhrase(normalized, "deaths") ||
    includesPhrase(normalized, "first pick") ||
    includesPhrase(normalized, "first death") ||
    includesPhrase(normalized, "ajax") ||
    includesPhrase(normalized, "mvp") ||
    includesPhrase(normalized, "ult") ||
    includesPhrase(normalized, "ultimate");

  return teamContext && teamMetric;
}

function mentionsPlayerTrendContext(normalized: string): boolean {
  if (
    includesPhrase(normalized, "player trend") ||
    includesPhrase(normalized, "player trends")
  ) {
    return true;
  }

  const trendIntent =
    includesPhrase(normalized, "improving") ||
    includesPhrase(normalized, "improve") ||
    includesPhrase(normalized, "improved") ||
    includesPhrase(normalized, "declining") ||
    includesPhrase(normalized, "decline") ||
    includesPhrase(normalized, "declined") ||
    includesPhrase(normalized, "trending up") ||
    includesPhrase(normalized, "trending down");
  const playerContext =
    includesPhrase(normalized, "who") ||
    includesPhrase(normalized, "whose") ||
    includesPhrase(normalized, "which player") ||
    includesPhrase(normalized, "which players") ||
    includesPhrase(normalized, "player") ||
    includesPhrase(normalized, "players");
  const mapContext =
    includesPhrase(normalized, "map") ||
    includesPhrase(normalized, "maps") ||
    includesPhrase(normalized, "map type") ||
    includesPhrase(normalized, "map mode");

  return trendIntent && playerContext && !mapContext;
}

function mentionsPlayerOutlierContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "outlier") ||
    includesPhrase(normalized, "outliers") ||
    includesPhrase(normalized, "hero baseline") ||
    includesPhrase(normalized, "above baseline") ||
    includesPhrase(normalized, "below baseline") ||
    includesPhrase(normalized, "far above") ||
    includesPhrase(normalized, "far below") ||
    (includesPhrase(normalized, "percentile") &&
      (includesPhrase(normalized, "player") ||
        includesPhrase(normalized, "players") ||
        includesPhrase(normalized, "who") ||
        includesPhrase(normalized, "whose")))
  );
}

function mentionsStatVersusPlaytimeContext(normalized: string): boolean {
  return (
    (includesPhrase(normalized, "versus time") ||
      /\b(?:versus|vs|against)\s+(?:the\s+)?(?:time|playtime)\b/.test(
        normalized
      ) ||
      includesPhrase(normalized, "vs time") ||
      includesPhrase(normalized, "against time") ||
      includesPhrase(normalized, "compared to time") ||
      /\b(?:compared|relative)\s+to\s+(?:the\s+)?(?:time|playtime)\b/.test(
        normalized
      ) ||
      includesPhrase(normalized, "relative to time") ||
      includesPhrase(normalized, "relative to playtime") ||
      includesPhrase(normalized, "compared to playtime") ||
      includesPhrase(normalized, "versus playtime") ||
      includesPhrase(normalized, "vs playtime")) &&
    (includesPhrase(normalized, "time played") ||
      includesPhrase(normalized, "playtime") ||
      includesPhrase(normalized, "played it") ||
      includesPhrase(normalized, "played them") ||
      includesPhrase(normalized, "time"))
  );
}

function mentionsPlayerStatMetricContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "final blow") ||
    includesPhrase(normalized, "final blows") ||
    includesPhrase(normalized, "eliminations") ||
    includesPhrase(normalized, "elims") ||
    includesPhrase(normalized, "deaths") ||
    includesPhrase(normalized, "assists") ||
    includesPhrase(normalized, "damage") ||
    includesPhrase(normalized, "healing") ||
    includesPhrase(normalized, "time played") ||
    includesPhrase(normalized, "playtime") ||
    includesPhrase(normalized, "accuracy") ||
    includesPhrase(normalized, "best multikill") ||
    includesPhrase(normalized, "multikill best")
  );
}

function mentionsPlayerTargetContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "player target") ||
    includesPhrase(normalized, "player targets") ||
    includesPhrase(normalized, "target progress") ||
    includesPhrase(normalized, "goal progress") ||
    includesPhrase(normalized, "progress toward target") ||
    includesPhrase(normalized, "progress toward goal") ||
    includesPhrase(normalized, "saved target") ||
    includesPhrase(normalized, "saved goal") ||
    includesPhrase(normalized, "on track") ||
    includesPhrase(normalized, "off track") ||
    includesPhrase(normalized, "stalled target") ||
    includesPhrase(normalized, "stalled goal")
  );
}

function mentionsHeroTrendContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "hero trend") ||
    includesPhrase(normalized, "hero trends") ||
    includesPhrase(normalized, "hero usage trend") ||
    includesPhrase(normalized, "hero usage trends") ||
    includesPhrase(normalized, "hero pick trend") ||
    includesPhrase(normalized, "hero pick trends") ||
    includesPhrase(normalized, "pick rate trend") ||
    includesPhrase(normalized, "pickrate trend") ||
    includesPhrase(normalized, "playtime trend") ||
    includesPhrase(normalized, "trending hero") ||
    includesPhrase(normalized, "trending heroes") ||
    includesPhrase(normalized, "heroes trending") ||
    includesPhrase(normalized, "hero meta") ||
    includesPhrase(normalized, "meta trend") ||
    (includesPhrase(normalized, "which heroes") &&
      (includesPhrase(normalized, "trending up") ||
        includesPhrase(normalized, "trending down") ||
        includesPhrase(normalized, "increasing") ||
        includesPhrase(normalized, "declining")))
  );
}

function mentionsStreakContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "streak") ||
    includesPhrase(normalized, "streaks") ||
    includesPhrase(normalized, "win streak") ||
    includesPhrase(normalized, "loss streak") ||
    includesPhrase(normalized, "current streak") ||
    includesPhrase(normalized, "longest streak")
  );
}

function mentionsRosterContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "roster") ||
    includesPhrase(normalized, "rosters") ||
    includesPhrase(normalized, "lineup") ||
    includesPhrase(normalized, "lineups") ||
    includesPhrase(normalized, "five stack") ||
    includesPhrase(normalized, "starting five")
  );
}

function mentionsMapPlaytimeContext(normalized: string): boolean {
  const mapContext =
    includesPhrase(normalized, "map") ||
    includesPhrase(normalized, "maps") ||
    includesPhrase(normalized, "map type") ||
    includesPhrase(normalized, "map mode");
  const playtimeIntent =
    includesPhrase(normalized, "map playtime") ||
    includesPhrase(normalized, "map time played") ||
    includesPhrase(normalized, "time played") ||
    includesPhrase(normalized, "playtime") ||
    includesPhrase(normalized, "played most") ||
    includesPhrase(normalized, "played the most") ||
    includesPhrase(normalized, "most time") ||
    includesPhrase(normalized, "most played") ||
    /\btime\b.*\bplayed\b/.test(normalized) ||
    /\bplayed\b.*\btime\b/.test(normalized);

  return (
    playtimeIntent &&
    (mapContext ||
      includesPhrase(normalized, "played on") ||
      includesPhrase(normalized, "time on"))
  );
}

function mentionsPlayerMapPerformanceContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "player map performance") ||
    includesPhrase(normalized, "player map winrate") ||
    includesPhrase(normalized, "player map win rate") ||
    includesPhrase(normalized, "map performance") ||
    includesPhrase(normalized, "players by map") ||
    includesPhrase(normalized, "player by map") ||
    includesPhrase(normalized, "perform best on") ||
    includesPhrase(normalized, "performance on") ||
    ((includesPhrase(normalized, "who") ||
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players") ||
      includesPhrase(normalized, "player") ||
      includesPhrase(normalized, "players")) &&
      (includesPhrase(normalized, "best") ||
        includesPhrase(normalized, "worst") ||
        includesPhrase(normalized, "perform") ||
        includesPhrase(normalized, "performance")))
  );
}

function mentionsHeroPickrateContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "hero pickrate") ||
    includesPhrase(normalized, "hero pick rate") ||
    includesPhrase(normalized, "pickrate") ||
    includesPhrase(normalized, "pick rate") ||
    includesPhrase(normalized, "pick rates") ||
    includesPhrase(normalized, "hero ownership") ||
    includesPhrase(normalized, "ownership rate") ||
    includesPhrase(normalized, "owns our") ||
    includesPhrase(normalized, "owned by") ||
    includesPhrase(normalized, "player hero share") ||
    includesPhrase(normalized, "hero pool share")
  );
}

function mentionsHeroDiversityContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "hero diversity") ||
    includesPhrase(normalized, "hero pool diversity") ||
    includesPhrase(normalized, "diverse hero pool") ||
    includesPhrase(normalized, "diversity score") ||
    includesPhrase(normalized, "unique heroes") ||
    includesPhrase(normalized, "effective hero pool") ||
    includesPhrase(normalized, "heroes per role") ||
    includesPhrase(normalized, "role hero pool") ||
    includesPhrase(normalized, "thin hero pool") ||
    includesPhrase(normalized, "thinnest hero pool") ||
    includesPhrase(normalized, "shared heroes") ||
    includesPhrase(normalized, "specialist heroes") ||
    (includesPhrase(normalized, "hero pool") &&
      (includesPhrase(normalized, "by role") ||
        includesPhrase(normalized, "per role") ||
        includesPhrase(normalized, "which role") ||
        includesPhrase(normalized, "roles")))
  );
}

function mentionsRotationDeathContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "rotation death") ||
    includesPhrase(normalized, "rotation deaths") ||
    includesPhrase(normalized, "rotational death") ||
    includesPhrase(normalized, "rotational deaths") ||
    includesPhrase(normalized, "caught rotating") ||
    includesPhrase(normalized, "caught on rotation") ||
    includesPhrase(normalized, "died rotating") ||
    includesPhrase(normalized, "dies rotating") ||
    includesPhrase(normalized, "early death with low damage")
  );
}

function mentionsFirstPickAttribution(normalized: string): boolean {
  return (
    includesPhrase(normalized, "opening pick") ||
    includesPhrase(normalized, "opening picks") ||
    includesPhrase(normalized, "first pick") ||
    includesPhrase(normalized, "first picks") ||
    includesPhrase(normalized, "gets first pick") ||
    includesPhrase(normalized, "got first pick") ||
    includesPhrase(normalized, "get first pick") ||
    includesPhrase(normalized, "secured first pick") ||
    includesPhrase(normalized, "secures first pick")
  );
}

function mentionsFirstDeathAttribution(normalized: string): boolean {
  return (
    includesPhrase(normalized, "opening death") ||
    includesPhrase(normalized, "opening deaths") ||
    includesPhrase(normalized, "first death") ||
    includesPhrase(normalized, "first deaths") ||
    includesPhrase(normalized, "dies first") ||
    includesPhrase(normalized, "died first") ||
    includesPhrase(normalized, "die first") ||
    includesPhrase(normalized, "first to die") ||
    includesPhrase(normalized, "gets picked first") ||
    includesPhrase(normalized, "got picked first") ||
    includesPhrase(normalized, "picked first") ||
    includesPhrase(normalized, "first picked")
  );
}

function mentionsOpeningKillContext(normalized: string): boolean {
  if (
    includesPhrase(normalized, "first pick rate") ||
    includesPhrase(normalized, "first pick percentage") ||
    includesPhrase(normalized, "first death rate") ||
    includesPhrase(normalized, "first death percentage")
  ) {
    return false;
  }

  const teamScenario =
    includesPhrase(normalized, "we get first pick") ||
    includesPhrase(normalized, "we got first pick") ||
    includesPhrase(normalized, "we have first pick") ||
    includesPhrase(normalized, "we get first death") ||
    includesPhrase(normalized, "we got first death") ||
    includesPhrase(normalized, "we have first death");
  const attributionIntent =
    includesPhrase(normalized, "who") ||
    includesPhrase(normalized, "which player") ||
    includesPhrase(normalized, "which players") ||
    includesPhrase(normalized, "which hero") ||
    includesPhrase(normalized, "which heroes") ||
    includesPhrase(normalized, "by player") ||
    includesPhrase(normalized, "by hero") ||
    includesPhrase(normalized, "attacker") ||
    includesPhrase(normalized, "killer") ||
    includesPhrase(normalized, "victim");

  return (
    !teamScenario &&
    (includesPhrase(normalized, "opening kill") ||
      includesPhrase(normalized, "opening kills") ||
      includesPhrase(normalized, "first kill") ||
      includesPhrase(normalized, "first kills") ||
      includesPhrase(normalized, "dies first") ||
      includesPhrase(normalized, "died first") ||
      includesPhrase(normalized, "die first") ||
      includesPhrase(normalized, "first to die") ||
      includesPhrase(normalized, "gets picked first") ||
      includesPhrase(normalized, "got picked first") ||
      includesPhrase(normalized, "picked first") ||
      includesPhrase(normalized, "first picked") ||
      includesPhrase(normalized, "gets first pick") ||
      includesPhrase(normalized, "got first pick") ||
      ((mentionsFirstPickAttribution(normalized) ||
        mentionsFirstDeathAttribution(normalized)) &&
        attributionIntent))
  );
}

function mentionsAbilityTimingContext(normalized: string): boolean {
  const abilityContext =
    includesPhrase(normalized, "ability") ||
    includesPhrase(normalized, "abilities") ||
    includesPhrase(normalized, "cooldown") ||
    includesPhrase(normalized, "cooldowns") ||
    includesPhrase(normalized, "suzu") ||
    includesPhrase(normalized, "sleep") ||
    includesPhrase(normalized, "nade") ||
    includesPhrase(normalized, "grenade") ||
    includesPhrase(normalized, "lamp");

  const timingIntent =
    includesPhrase(normalized, "ability timing") ||
    includesPhrase(normalized, "cooldown timing") ||
    includesPhrase(normalized, "when should") ||
    includesPhrase(normalized, "when to use") ||
    includesPhrase(normalized, "best phase") ||
    includesPhrase(normalized, "which phase") ||
    includesPhrase(normalized, "which phases") ||
    includesPhrase(normalized, "phase timing") ||
    includesPhrase(normalized, "by phase") ||
    includesPhrase(normalized, "per phase");

  const phaseMention =
    includesPhrase(normalized, "pre fight") ||
    includesPhrase(normalized, "pre-fight") ||
    includesPhrase(normalized, "early fight") ||
    includesPhrase(normalized, "mid fight") ||
    includesPhrase(normalized, "late fight") ||
    includesPhrase(normalized, "cleanup") ||
    /\b(?:early|mid|late)\b.*\b(?:ability|abilities|cooldown|cooldowns|suzu|sleep|nade|grenade|lamp)\b/.test(
      normalized
    ) ||
    /\b(?:ability|abilities|cooldown|cooldowns|suzu|sleep|nade|grenade|lamp)\b.*\b(?:early|mid|late)\b/.test(
      normalized
    );

  return (timingIntent && abilityContext) || phaseMention;
}

function mentionsTeamfightUltContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "ults did we use") ||
    includesPhrase(normalized, "ultimates did we use") ||
    includesPhrase(normalized, "ults we use") ||
    includesPhrase(normalized, "ultimates we use") ||
    includesPhrase(normalized, "ults used in") ||
    includesPhrase(normalized, "ultimates used in") ||
    includesPhrase(normalized, "first ult") ||
    includesPhrase(normalized, "first ultimate") ||
    includesPhrase(normalized, "wasted ult") ||
    includesPhrase(normalized, "wasted ults") ||
    includesPhrase(normalized, "wasted ultimate") ||
    includesPhrase(normalized, "wasted ultimates") ||
    includesPhrase(normalized, "dry fight") ||
    includesPhrase(normalized, "reversal") ||
    includesPhrase(normalized, "reverse fight") ||
    includesPhrase(normalized, "ults used") ||
    includesPhrase(normalized, "ultimates used") ||
    /\b(?:use|used|using|spend|spent|with|without|no|zero|one|two|three|four|five|six|\d+)\s+(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    )
  );
}

function mentionsUltEconomyContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "ult economy") ||
    includesPhrase(normalized, "ultimate economy") ||
    includesPhrase(normalized, "ult advantage") ||
    includesPhrase(normalized, "ultimate advantage") ||
    includesPhrase(normalized, "ult bank") ||
    includesPhrase(normalized, "ultimate bank") ||
    /\b(?:ahead|behind|even)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    ) ||
    /\b(?:ult|ults|ultimate|ultimates)\b.*\b(?:ahead|behind|even)\b/.test(
      normalized
    )
  );
}

function mentionsRolePerformanceContext(normalized: string): boolean {
  if (
    includesPhrase(normalized, "role trio") ||
    includesPhrase(normalized, "role trios") ||
    includesPhrase(normalized, "lineup") ||
    includesPhrase(normalized, "lineups")
  ) {
    return false;
  }

  const roleGrouping =
    includesPhrase(normalized, "role performance") ||
    includesPhrase(normalized, "role stats") ||
    includesPhrase(normalized, "role stat") ||
    includesPhrase(normalized, "role line") ||
    includesPhrase(normalized, "role lines") ||
    includesPhrase(normalized, "which role") ||
    includesPhrase(normalized, "which roles") ||
    includesPhrase(normalized, "by role") ||
    includesPhrase(normalized, "per role");

  const roleSpecific =
    includesPhrase(normalized, "tank role") ||
    includesPhrase(normalized, "damage role") ||
    includesPhrase(normalized, "support role") ||
    includesPhrase(normalized, "tank line") ||
    includesPhrase(normalized, "damage line") ||
    includesPhrase(normalized, "support line");

  const roleMetric =
    includesPhrase(normalized, "performance") ||
    includesPhrase(normalized, "stats") ||
    includesPhrase(normalized, "stat") ||
    includesPhrase(normalized, "win rate") ||
    includesPhrase(normalized, "winrate") ||
    includesPhrase(normalized, "damage") ||
    includesPhrase(normalized, "healing") ||
    includesPhrase(normalized, "deaths") ||
    includesPhrase(normalized, "final blows") ||
    includesPhrase(normalized, "ult efficiency") ||
    includesPhrase(normalized, "ultimate efficiency");

  return roleGrouping || (roleSpecific && roleMetric);
}

function mentionsPlayerIntelligenceContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "player intelligence") ||
    includesPhrase(normalized, "hero depth") ||
    includesPhrase(normalized, "hero depths") ||
    includesPhrase(normalized, "hero pool depth") ||
    includesPhrase(normalized, "hero pool size") ||
    includesPhrase(normalized, "deep hero pool") ||
    includesPhrase(normalized, "deepest hero pool") ||
    includesPhrase(normalized, "flexibility") ||
    includesPhrase(normalized, "flexible") ||
    includesPhrase(normalized, "one trick") ||
    includesPhrase(normalized, "one-trick") ||
    includesPhrase(normalized, "primary time share") ||
    includesPhrase(normalized, "primary share") ||
    includesPhrase(normalized, "hero dependency") ||
    includesPhrase(normalized, "hero dependence") ||
    includesPhrase(normalized, "forced off") ||
    includesPhrase(normalized, "forced maps") ||
    includesPhrase(normalized, "substitution rate") ||
    includesPhrase(normalized, "forced substitution") ||
    includesPhrase(normalized, "forced substitutions") ||
    includesPhrase(normalized, "composite z score") ||
    includesPhrase(normalized, "z score") ||
    includesPhrase(normalized, "z-score")
  );
}

function mentionsPlayerImpactContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "player impact") ||
    includesPhrase(normalized, "impact metrics") ||
    includesPhrase(normalized, "consistency") ||
    includesPhrase(normalized, "consistent") ||
    includesPhrase(normalized, "volatile") ||
    includesPhrase(normalized, "volatility") ||
    includesPhrase(normalized, "variance") ||
    includesPhrase(normalized, "standard deviation") ||
    includesPhrase(normalized, "stddev") ||
    includesPhrase(normalized, "swingy") ||
    includesPhrase(normalized, "streaky") ||
    includesPhrase(normalized, "map mvp rate") ||
    includesPhrase(normalized, "first picks per 10") ||
    includesPhrase(normalized, "first pick count per 10") ||
    includesPhrase(normalized, "first deaths per 10") ||
    includesPhrase(normalized, "first death count per 10") ||
    includesPhrase(normalized, "ajax per 10") ||
    includesPhrase(normalized, "ajaxes per 10")
  );
}

function mentionsCalculatedStatContext(normalized: string): boolean {
  const wantsPlayerDuelStat =
    (includesPhrase(normalized, "duel winrate") ||
      includesPhrase(normalized, "duel win rate")) &&
    (includesPhrase(normalized, "who") ||
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players") ||
      includesPhrase(normalized, "by player") ||
      includesPhrase(normalized, "per player")) &&
    !includesPhrase(normalized, "against") &&
    !includesPhrase(normalized, "vs") &&
    !includesPhrase(normalized, "versus");

  return (
    wantsPlayerDuelStat ||
    includesPhrase(normalized, "mvp") ||
    includesPhrase(normalized, "map mvp") ||
    includesPhrase(normalized, "fleta") ||
    includesPhrase(normalized, "first pick percentage") ||
    includesPhrase(normalized, "first pick rate") ||
    includesPhrase(normalized, "first picks") ||
    includesPhrase(normalized, "first death percentage") ||
    includesPhrase(normalized, "first death rate") ||
    includesPhrase(normalized, "first deaths") ||
    includesPhrase(normalized, "ult charge time") ||
    includesPhrase(normalized, "ultimate charge time") ||
    includesPhrase(normalized, "time to use ult") ||
    includesPhrase(normalized, "time to use ultimate") ||
    includesPhrase(normalized, "drought time") ||
    includesPhrase(normalized, "kills per ult") ||
    includesPhrase(normalized, "kills per ultimate") ||
    includesPhrase(normalized, "ajax") ||
    includesPhrase(normalized, "ajaxes") ||
    includesPhrase(normalized, "fight reversal percentage") ||
    includesPhrase(normalized, "fight reversal rate")
  );
}

function pickDataset(question: string): DatasetId {
  const normalized = normalize(question);
  const mapName = findMapName(question);
  const heroMentions = findHeroMentions(question);
  const player = findPlayer(question, heroMentions[0]?.hero ?? null);
  const mentionsSwap =
    includesPhrase(normalized, "swap") ||
    includesPhrase(normalized, "swaps") ||
    includesPhrase(normalized, "swapped") ||
    includesPhrase(normalized, "swapping");
  if (
    mentionsSwap &&
    (includesPhrase(normalized, "win rate") ||
      includesPhrase(normalized, "winrate") ||
      includesPhrase(normalized, "wins") ||
      includesPhrase(normalized, "losses") ||
      includesPhrase(normalized, "lose") ||
      includesPhrase(normalized, "lost") ||
      includesPhrase(normalized, "maps") ||
      includesPhrase(normalized, "per map") ||
      includesPhrase(normalized, "swap count") ||
      includesPhrase(normalized, "swap counts"))
  ) {
    return "swap_impact";
  }
  if (
    (includesPhrase(normalized, "which heroes") ||
      includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "hero wins") ||
      includesPhrase(normalized, "hero losses")) &&
    (includesPhrase(normalized, "win rate") ||
      includesPhrase(normalized, "winrate") ||
      includesPhrase(normalized, "wins") ||
      includesPhrase(normalized, "losses") ||
      includesPhrase(normalized, "lose") ||
      includesPhrase(normalized, "lost"))
  ) {
    return "hero_pool";
  }
  if (
    pickResultScope(normalized) &&
    (heroMentions.length > 0 || player) &&
    (includesPhrase(normalized, "final blow") ||
      includesPhrase(normalized, "final blows") ||
      includesPhrase(normalized, "eliminations") ||
      includesPhrase(normalized, "elims") ||
      includesPhrase(normalized, "deaths") ||
      includesPhrase(normalized, "assists") ||
      includesPhrase(normalized, "damage") ||
      includesPhrase(normalized, "healing") ||
      includesPhrase(normalized, "time played") ||
      includesPhrase(normalized, "playtime") ||
      includesPhrase(normalized, "ultimates"))
  ) {
    return "hero_pool";
  }
  if (mentionsTeamPerformanceContext(normalized)) return "team_performance";
  if (
    mentionsPlayerImpactContext(normalized) &&
    (includesPhrase(normalized, "first picks per 10") ||
      includesPhrase(normalized, "first pick count per 10") ||
      includesPhrase(normalized, "first deaths per 10") ||
      includesPhrase(normalized, "first death count per 10") ||
      includesPhrase(normalized, "ajax per 10") ||
      includesPhrase(normalized, "ajaxes per 10"))
  ) {
    return "player_impact";
  }
  if (mentionsOpeningKillContext(normalized)) return "opening_kill";
  if (
    mentionsPlayerTrendContext(normalized) ||
    (player &&
      (includesPhrase(normalized, "improving") ||
        includesPhrase(normalized, "improve") ||
        includesPhrase(normalized, "declining") ||
        includesPhrase(normalized, "decline") ||
        includesPhrase(normalized, "trending up") ||
        includesPhrase(normalized, "trending down")))
  ) {
    return "player_trend";
  }
  if (mentionsPlayerOutlierContext(normalized)) return "player_outlier";
  if (mentionsPlayerTargetContext(normalized)) return "player_target";
  if (mentionsPlayerImpactContext(normalized)) return "player_impact";
  if (
    mentionsFightContext(normalized) &&
    (includesPhrase(normalized, "first pick rate") ||
      includesPhrase(normalized, "first death rate") ||
      includesPhrase(normalized, "first ult rate") ||
      includesPhrase(normalized, "first ultimate rate") ||
      includesPhrase(normalized, "dry fight rate") ||
      includesPhrase(normalized, "reversal rate") ||
      includesPhrase(normalized, "ultimate efficiency") ||
      includesPhrase(normalized, "ult efficiency") ||
      includesPhrase(normalized, "ults in won fights") ||
      includesPhrase(normalized, "ults in lost fights") ||
      includesPhrase(normalized, "ults per non dry fight") ||
      includesPhrase(normalized, "ultimates per non dry fight"))
  ) {
    return "teamfight";
  }
  if (mentionsCalculatedStatContext(normalized)) return "calculated_stat";
  if (mentionsHeroTrendContext(normalized)) return "hero_trend";
  if (mentionsStreakContext(normalized)) return "streak";
  if (mentionsMapIntelligenceContext(normalized)) return "map_intelligence";
  if (
    (heroMentions.length > 0 || player) &&
    mentionsPlayerStatMetricContext(normalized) &&
    new RegExp(
      `\\b(?:last|past|recent)\\s+(?:${INTEGER_TOKEN})\\s+scrims?\\b`
    ).test(normalized)
  ) {
    return "player_stat";
  }
  if (mentionsTrendContext(normalized)) return "trend";
  if (mentionsRotationDeathContext(normalized)) return "rotation_death";
  if (
    mentionsAbilityTimingContext(normalized) ||
    (findAbility(question) &&
      (includesPhrase(normalized, "when should") ||
        includesPhrase(normalized, "when to use") ||
        includesPhrase(normalized, "best phase") ||
        includesPhrase(normalized, "by phase") ||
        includesPhrase(normalized, "per phase")))
  ) {
    return "ability_timing";
  }
  if (findAbility(question)) return "ability_impact";

  if (
    mentionsHeroDiversityContext(normalized) &&
    !includesPhrase(normalized, "who") &&
    !includesPhrase(normalized, "which player") &&
    !includesPhrase(normalized, "which players") &&
    !player
  ) {
    return "hero_diversity";
  }

  if (mentionsPlayerIntelligenceContext(normalized)) {
    return "player_intelligence";
  }

  const mentionsUlt =
    includesPhrase(normalized, "ult") ||
    includesPhrase(normalized, "ults") ||
    includesPhrase(normalized, "ultimate") ||
    includesPhrase(normalized, "ultimates");

  if (
    includesPhrase(normalized, "duel") ||
    includesPhrase(normalized, "duels") ||
    includesPhrase(normalized, "1v1") ||
    includesPhrase(normalized, "1 v 1") ||
    includesPhrase(normalized, "one v one") ||
    includesPhrase(normalized, "hero matchup")
  ) {
    return "duel";
  }

  if (mentionsUltEconomyContext(normalized)) return "ult_economy";

  if (
    mentionsUlt &&
    (includesPhrase(normalized, "fight opener") ||
      includesPhrase(normalized, "fight openers") ||
      includesPhrase(normalized, "open fights") ||
      includesPhrase(normalized, "opening ult") ||
      includesPhrase(normalized, "opening ultimate"))
  ) {
    return "ult_usage";
  }

  if (
    mentionsRolePerformanceContext(normalized) &&
    !includesPhrase(normalized, "which hero") &&
    !includesPhrase(normalized, "which heroes") &&
    !includesPhrase(normalized, "hero win")
  ) {
    return "role_performance";
  }

  if (
    mentionsFightContext(normalized) &&
    mentionsTeamfightUltContext(normalized)
  ) {
    return "teamfight";
  }

  if (
    mentionsFightContext(normalized) &&
    (includesPhrase(normalized, "duration") ||
      includesPhrase(normalized, "fight length") ||
      includesPhrase(normalized, "fight duration") ||
      includesPhrase(normalized, "teamfight duration") ||
      includesPhrase(normalized, "team fight duration") ||
      includesPhrase(normalized, "average fight length") ||
      includesPhrase(normalized, "average fight duration"))
  ) {
    return "teamfight";
  }

  if (
    includesPhrase(normalized, "map mode") ||
    includesPhrase(normalized, "map modes") ||
    includesPhrase(normalized, "map type") ||
    includesPhrase(normalized, "map types") ||
    includesPhrase(normalized, "mode win rate") ||
    includesPhrase(normalized, "mode winrate")
  ) {
    return "map_result";
  }

  if (
    mentionsMapPlaytimeContext(normalized) &&
    heroMentions.length === 0 &&
    !player
  ) {
    return "map_result";
  }

  if (
    mentionsPlayerMapPerformanceContext(normalized) &&
    !includesPhrase(normalized, "which hero") &&
    !includesPhrase(normalized, "which heroes") &&
    heroMentions.length === 0
  ) {
    return "player_map_performance";
  }

  if (mentionsHeroPickrateContext(normalized)) {
    return "hero_pickrate";
  }

  if (mapName) {
    if (mentionsRosterContext(normalized)) {
      return "roster_variant";
    }

    if (
      !includesPhrase(normalized, "which hero") &&
      !includesPhrase(normalized, "which heroes") &&
      (includesPhrase(normalized, "who") ||
        includesPhrase(normalized, "which player") ||
        includesPhrase(normalized, "which players") ||
        includesPhrase(normalized, "player") ||
        includesPhrase(normalized, "players") ||
        includesPhrase(normalized, "perform") ||
        includesPhrase(normalized, "performance"))
    ) {
      return heroMentions.length > 0 ? "hero_pool" : "player_map_performance";
    }

    if (
      includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "which heroes")
    ) {
      return "hero_pool";
    }

    if (mentionsFightContext(normalized)) {
      return "teamfight";
    }

    if (
      includesPhrase(normalized, "swap") ||
      includesPhrase(normalized, "swaps") ||
      includesPhrase(normalized, "swapped") ||
      includesPhrase(normalized, "swapping")
    ) {
      return "swap_impact";
    }

    if (
      findHeroMentions(question).length > 0 &&
      (includesPhrase(normalized, "against") ||
        includesPhrase(normalized, "versus") ||
        includesPhrase(normalized, "vs") ||
        includesPhrase(normalized, "enemy"))
    ) {
      return "enemy_hero";
    }

    if (
      includesPhrase(normalized, "win rate") ||
      includesPhrase(normalized, "winrate") ||
      includesPhrase(normalized, "record") ||
      includesPhrase(normalized, "wins") ||
      includesPhrase(normalized, "losses")
    ) {
      return "map_result";
    }
  }

  if (
    (includesPhrase(normalized, "which map") ||
      includesPhrase(normalized, "which maps") ||
      includesPhrase(normalized, "map win") ||
      includesPhrase(normalized, "map win rate") ||
      includesPhrase(normalized, "map record") ||
      includesPhrase(normalized, "match record") ||
      includesPhrase(normalized, "record against") ||
      includesPhrase(normalized, "record versus")) &&
    (includesPhrase(normalized, "against") ||
      includesPhrase(normalized, "versus") ||
      includesPhrase(normalized, "vs"))
  ) {
    return "map_result";
  }

  if (
    mentionsUlt &&
    (includesPhrase(normalized, "counter ult") ||
      includesPhrase(normalized, "counter ultimate") ||
      includesPhrase(normalized, "response ult") ||
      includesPhrase(normalized, "ult combo") ||
      includesPhrase(normalized, "ultimate combo"))
  ) {
    return "ult_combo";
  }

  if (
    mentionsUlt &&
    (includesPhrase(normalized, "mirror") ||
      includesPhrase(normalized, "mirrored") ||
      includesPhrase(normalized, "uncontested") ||
      includesPhrase(normalized, "when") ||
      includesPhrase(normalized, "impact"))
  ) {
    return "ult_impact";
  }

  let best: { dataset: DatasetId; score: number } = {
    dataset: "player_stat",
    score: 0,
  };

  for (const [dataset, hints] of Object.entries(DATASET_HINTS) as [
    DatasetId,
    string[],
  ][]) {
    let score = 0;
    for (const hint of hints) {
      if (includesPhrase(normalized, hint)) score += hint.length;
    }
    if (score > best.score) best = { dataset, score };
  }

  return best.dataset;
}

function pickMetricAgg(dataset: DatasetId, metricId: string, question: string) {
  const metric = getMetric(dataset, metricId);
  if (!metric) return null;
  const normalized = normalize(question);
  if (metric.allowedAggs.length === 1) return metric.allowedAggs[0];
  if (
    includesPhrase(normalized, "per 10") &&
    metric.allowedAggs.includes("per10")
  ) {
    return "per10";
  }
  if (
    (includesPhrase(normalized, "average") ||
      includesPhrase(normalized, "avg")) &&
    metric.allowedAggs.includes("avg")
  ) {
    return "avg";
  }
  if (
    (includesPhrase(normalized, "number") ||
      includesPhrase(normalized, "total") ||
      includesPhrase(normalized, "how many") ||
      includesPhrase(normalized, "how often") ||
      includesPhrase(normalized, "most")) &&
    metric.allowedAggs.includes("sum")
  ) {
    return "sum";
  }
  if (metricId === "time_played" && metric.allowedAggs.includes("sum")) {
    return "sum";
  }
  return metric.defaultAgg;
}

function metricAliasCore(alias: string) {
  return normalize(alias)
    .replace(/\bper 10(?: minutes?)?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMetrics(dataset: DatasetId, question: string): MetricRef[] {
  const normalized = normalize(question);
  const ds = getDataset(dataset);
  const matches: { ref: MetricRef; aliases: string[] }[] = [];

  for (const metric of ds.metrics) {
    const aliases = [
      metric.id.replace(/_/g, " "),
      metric.label,
      ...(METRIC_ALIASES[metric.id] ?? []),
    ];
    const matchedAliases = aliases.filter((alias) =>
      includesPhrase(normalized, alias)
    );
    if (matchedAliases.length > 0) {
      const agg = pickMetricAgg(dataset, metric.id, question);
      if (agg) matches.push({ ref: { metric: metric.id, agg }, aliases });
    }
  }

  const refs = matches
    .filter(({ aliases }, index) => {
      const matchedAliases = aliases.filter((alias) =>
        includesPhrase(normalized, alias)
      );
      return matchedAliases.some((alias) => {
        const normalizedAlias = metricAliasCore(alias);
        return !matches.some((other, otherIndex) => {
          if (otherIndex === index) return false;
          return other.aliases.some((otherAlias) => {
            const normalizedOtherAlias = metricAliasCore(otherAlias);
            return (
              normalizedOtherAlias.length > normalizedAlias.length &&
              includesPhrase(normalized, otherAlias) &&
              includesPhrase(normalizedOtherAlias, normalizedAlias)
            );
          });
        });
      });
    })
    .map(({ ref }) => ref);

  if (
    dataset === "player_stat" &&
    refs.length === 0 &&
    includesPhrase(normalized, "accuracy")
  ) {
    refs.push({ metric: "weapon_accuracy", agg: "ratio" });
  }

  if (dataset === "teamfight" && includesPhrase(normalized, "wasted ult")) {
    refs.push({ metric: "avg_wasted_ults", agg: "avg" });
  }

  if (dataset === "teamfight") {
    if (
      (includesPhrase(normalized, "ults did we use") ||
        includesPhrase(normalized, "ultimates did we use") ||
        includesPhrase(normalized, "ults we use") ||
        includesPhrase(normalized, "ultimates we use")) &&
      !refs.some((ref) => ref.metric === "ults_used")
    ) {
      refs.push({ metric: "ults_used", agg: "sum" });
    }

    const wantsFightCount =
      includesPhrase(normalized, "how many fights") ||
      includesPhrase(normalized, "number of fights") ||
      includesPhrase(normalized, "fight count") ||
      includesPhrase(normalized, "count fights");
    if (!wantsFightCount && refs.length > 1) {
      for (let i = refs.length - 1; i >= 0; i--) {
        if (refs[i].metric === "fights") refs.splice(i, 1);
      }
    }

    const preferredTeamfightMetric =
      includesPhrase(normalized, "non dry fight reversal rate") ||
      includesPhrase(normalized, "non-dry fight reversal rate") ||
      includesPhrase(normalized, "non dry reversal rate")
        ? "non_dry_fight_reversal_rate"
        : includesPhrase(normalized, "dry fight reversal rate") ||
            includesPhrase(normalized, "dry-fight reversal rate") ||
            includesPhrase(normalized, "dry reversal rate")
          ? "dry_fight_reversal_rate"
          : includesPhrase(normalized, "ultimate efficiency") ||
              includesPhrase(normalized, "ult efficiency") ||
              includesPhrase(normalized, "fight wins per ultimate") ||
              includesPhrase(normalized, "fight wins per ult")
            ? "ultimate_efficiency"
            : null;
    if (preferredTeamfightMetric) {
      for (let i = refs.length - 1; i >= 0; i--) {
        if (refs[i].metric !== preferredTeamfightMetric) refs.splice(i, 1);
      }
      if (!refs.some((ref) => ref.metric === preferredTeamfightMetric)) {
        const agg = pickMetricAgg(dataset, preferredTeamfightMetric, question);
        if (agg) refs.push({ metric: preferredTeamfightMetric, agg });
      }
    }
  }

  if (
    dataset === "map_intelligence" &&
    (includesPhrase(normalized, "improving") ||
      includesPhrase(normalized, "declining") ||
      includesPhrase(normalized, "map trend") ||
      includesPhrase(normalized, "map trends") ||
      includesPhrase(normalized, "trend delta"))
  ) {
    refs.unshift({ metric: "trend_delta", agg: "avg" });
  }

  if (dataset === "opening_kill") {
    if (mentionsFirstPickAttribution(normalized)) {
      refs.unshift({ metric: "first_picks", agg: "sum" });
    } else if (mentionsFirstDeathAttribution(normalized)) {
      refs.unshift({ metric: "first_deaths", agg: "sum" });
    }
  }

  if (refs.length === 0) {
    const fallback = DEFAULT_METRIC[dataset];
    const agg = pickMetricAgg(dataset, fallback, question);
    if (agg) refs.push({ metric: fallback, agg });
  }

  if (
    dataset === "trend" &&
    refs.some((ref) => ref.metric === "win_rate") &&
    !refs.some((ref) => ref.metric === "maps") &&
    (includesPhrase(normalized, "last 5 games") ||
      includesPhrase(normalized, "last 10 games") ||
      includesPhrase(normalized, "last 20 games") ||
      includesPhrase(normalized, "recent games") ||
      includesPhrase(normalized, "day of week") ||
      includesPhrase(normalized, "best day") ||
      includesPhrase(normalized, "worst day"))
  ) {
    refs.push({ metric: "maps", agg: "count" });
  }

  const deduped = dedupeMetrics(refs);
  if (
    pickResultScope(normalized) &&
    getDataset(dataset).filters.some((filter) => filter.id === "result")
  ) {
    const hasScopedMetric = deduped.some(
      (ref) => ref.metric !== "wins" && ref.metric !== "losses"
    );
    if (hasScopedMetric) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "wins" || deduped[i].metric === "losses") {
          deduped.splice(i, 1);
        }
      }
    }
  }
  if (dataset === "map_intelligence") {
    const wantsCount =
      includesPhrase(normalized, "how many") ||
      includesPhrase(normalized, "number") ||
      includesPhrase(normalized, "count") ||
      includesPhrase(normalized, "total");
    const hasWeighted = deduped.some(
      (ref) => ref.metric === "weighted_win_rate"
    );
    const hasTrendDelta = deduped.some((ref) => ref.metric === "trend_delta");
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (!wantsCount && ["maps", "wins", "losses"].includes(deduped[i].metric))
        deduped.splice(i, 1);
      else if (hasWeighted && deduped[i].metric === "win_rate")
        deduped.splice(i, 1);
    }
    if (hasTrendDelta || hasWeighted) {
      const priority = hasTrendDelta ? "trend_delta" : "weighted_win_rate";
      deduped.sort((a, b) =>
        a.metric === priority ? -1 : b.metric === priority ? 1 : 0
      );
    }
  }
  if (dataset === "team_performance") {
    const per10ToRaw: Record<string, string> = {
      eliminations_per10: "eliminations",
      final_blows_per10: "final_blows",
      deaths_per10: "deaths",
      hero_damage_per10: "hero_damage",
      all_damage_per10: "all_damage",
      healing_per10: "healing",
      healing_received_per10: "healing_received",
      damage_taken_per10: "damage_taken",
      damage_blocked_per10: "damage_blocked",
      ults_earned_per10: "ultimates_earned",
      ults_used_per10: "ultimates_used",
      solo_kills_per10: "solo_kills",
      objective_kills_per10: "objective_kills",
      offensive_assists_per10: "offensive_assists",
      defensive_assists_per10: "defensive_assists",
      first_picks_per10: "first_pick_count",
      first_deaths_per10: "first_death_count",
      ajax_per10: "ajax_count",
    };
    const per10Metrics = new Set(
      deduped
        .filter((ref) => ref.metric.endsWith("_per10"))
        .map((ref) => ref.metric)
    );
    if (per10Metrics.size > 0) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        const raw = Array.from(per10Metrics).some(
          (metric) => per10ToRaw[metric] === deduped[i].metric
        );
        if (raw) deduped.splice(i, 1);
      }
      deduped.sort((a, b) =>
        a.metric.endsWith("_per10") ? -1 : b.metric.endsWith("_per10") ? 1 : 0
      );
    }
  }
  if (dataset === "player_impact") {
    const per10ToRaw: Record<string, string> = {
      eliminations_per10: "eliminations",
      final_blows_per10: "final_blows",
      deaths_per10: "deaths",
      hero_damage_per10: "hero_damage",
      all_damage_per10: "all_damage",
      healing_per10: "healing",
      damage_taken_per10: "damage_taken",
      ults_used_per10: "ultimates_used",
      first_picks_per10: "first_pick_count",
      first_deaths_per10: "first_death_count",
      ajax_per10: "ajax_count",
    };
    const per10Metrics = new Set(
      deduped
        .filter((ref) => ref.metric.endsWith("_per10"))
        .map((ref) => ref.metric)
    );
    if (per10Metrics.size > 0) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        const raw = Array.from(per10Metrics).some(
          (metric) => per10ToRaw[metric] === deduped[i].metric
        );
        if (raw) deduped.splice(i, 1);
      }
      deduped.sort((a, b) =>
        a.metric.endsWith("_per10") ? -1 : b.metric.endsWith("_per10") ? 1 : 0
      );
    }
  }
  if (mentionsStatVersusPlaytimeContext(normalized)) {
    const hasTimePlayedMetric = Boolean(getMetric(dataset, "time_played"));
    for (const ref of deduped) {
      if (ref.metric === "time_played" || ref.metric === "maps") continue;
      const metric = getMetric(dataset, ref.metric);
      if (ref.agg === "avg" && metric?.allowedAggs.includes("sum")) {
        ref.agg = "sum";
      }
    }
    const rateableRefs = deduped.filter((ref) => {
      if (ref.metric === "time_played" || ref.metric === "maps") return false;
      return getMetric(dataset, ref.metric)?.allowedAggs.includes("per10");
    });
    for (const ref of rateableRefs) {
      if (
        !deduped.some(
          (candidate) =>
            candidate.metric === ref.metric && candidate.agg === "per10"
        )
      ) {
        deduped.push({ metric: ref.metric, agg: "per10" });
      }
    }
    if (
      hasTimePlayedMetric &&
      !deduped.some((ref) => ref.metric === "time_played")
    ) {
      deduped.push({ metric: "time_played", agg: "sum" });
    }
    if (hasTimePlayedMetric && rateableRefs.length > 0) {
      deduped.sort((a, b) => {
        function priority(ref: MetricRef) {
          return ref.metric === "time_played" ? 1 : ref.agg === "per10" ? 2 : 0;
        }
        return priority(a) - priority(b);
      });
    }
  }
  if (
    dataset === "player_impact" &&
    (includesPhrase(normalized, "volatile") ||
      includesPhrase(normalized, "volatility") ||
      includesPhrase(normalized, "variance") ||
      includesPhrase(normalized, "standard deviation") ||
      includesPhrase(normalized, "stddev"))
  ) {
    const volatilityMetrics = new Set([
      "eliminations_per10_stddev",
      "deaths_per10_stddev",
      "all_damage_per10_stddev",
      "healing_per10_stddev",
    ]);
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (!volatilityMetrics.has(deduped[i].metric)) deduped.splice(i, 1);
    }
    deduped.sort((a, b) =>
      volatilityMetrics.has(a.metric)
        ? -1
        : volatilityMetrics.has(b.metric)
          ? 1
          : 0
    );
  }
  if (
    dataset === "player_outlier" &&
    (includesPhrase(normalized, "outlier") ||
      includesPhrase(normalized, "outliers") ||
      includesPhrase(normalized, "far above") ||
      includesPhrase(normalized, "far below") ||
      includesPhrase(normalized, "above baseline") ||
      includesPhrase(normalized, "below baseline"))
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "baseline_per10") deduped.splice(i, 1);
    }
    if (!deduped.some((ref) => ref.metric === "abs_z_score")) {
      const agg = pickMetricAgg(dataset, "abs_z_score", question);
      if (agg) deduped.unshift({ metric: "abs_z_score", agg });
    }
    deduped.sort((a, b) =>
      a.metric === "abs_z_score" ? -1 : b.metric === "abs_z_score" ? 1 : 0
    );
  }
  if (dataset === "role_performance") {
    const per10ToRaw: Record<string, string> = {
      final_blows_per10: "final_blows",
      eliminations_per10: "eliminations",
      assists_per10: "assists",
      deaths_per10: "deaths",
      damage_per10: "hero_damage",
      healing_per10: "healing",
      damage_taken_per10: "damage_taken",
      ults_earned_per10: "ultimates_earned",
      ults_used_per10: "ultimates_used",
    };
    const per10Metrics = new Set(
      deduped
        .filter((ref) => ref.metric.endsWith("_per10"))
        .map((ref) => ref.metric)
    );
    if (per10Metrics.size > 0) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        const raw = Array.from(per10Metrics).some(
          (metric) => per10ToRaw[metric] === deduped[i].metric
        );
        if (raw) deduped.splice(i, 1);
      }
      deduped.sort((a, b) =>
        a.metric.endsWith("_per10") ? -1 : b.metric.endsWith("_per10") ? 1 : 0
      );
    }
  }
  if (
    deduped.some((ref) => ref.metric === "win_rate") &&
    (includesPhrase(normalized, "win rate") ||
      includesPhrase(normalized, "win rates") ||
      includesPhrase(normalized, "winrate") ||
      includesPhrase(normalized, "winrates"))
  ) {
    deduped.sort((a, b) =>
      a.metric === "win_rate" ? -1 : b.metric === "win_rate" ? 1 : 0
    );
  }
  if (
    deduped.some((ref) => ref.metric === "losses") &&
    (includesPhrase(normalized, "losses") ||
      includesPhrase(normalized, "lost") ||
      includesPhrase(normalized, "lose"))
  ) {
    deduped.sort((a, b) =>
      a.metric === "losses" ? -1 : b.metric === "losses" ? 1 : 0
    );
  }
  if (
    dataset === "hero_pickrate" &&
    deduped.some((ref) => ref.metric === "ownership_rate") &&
    (includesPhrase(normalized, "ownership") ||
      includesPhrase(normalized, "owns") ||
      includesPhrase(normalized, "owned by") ||
      includesPhrase(normalized, "share of hero"))
  ) {
    deduped.sort((a, b) =>
      a.metric === "ownership_rate" ? -1 : b.metric === "ownership_rate" ? 1 : 0
    );
  }
  if (
    dataset === "rotation_death" &&
    extractRotationDeathSignalFilters(normalized).length > 0 &&
    deduped.some((ref) => ref.metric === "rotation_deaths")
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (
        deduped[i].metric === "pre_fight_damage" ||
        deduped[i].metric === "kill_distance"
      ) {
        deduped.splice(i, 1);
      }
    }
  }
  if (
    dataset === "swap_impact" &&
    extractSwapCountFilter(normalized) &&
    deduped.some((ref) => ref.metric === "win_rate")
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "maps") deduped.splice(i, 1);
    }
  }
  if (
    dataset === "rotation_death" &&
    deduped.some((ref) => ref.metric === "rotation_death_rate") &&
    (includesPhrase(normalized, "rate") ||
      includesPhrase(normalized, "percentage") ||
      includesPhrase(normalized, "pct"))
  ) {
    deduped.sort((a, b) =>
      a.metric === "rotation_death_rate"
        ? -1
        : b.metric === "rotation_death_rate"
          ? 1
          : 0
    );
  }
  if (
    dataset === "ban_impact" &&
    (includesPhrase(normalized, "weak point") ||
      includesPhrase(normalized, "weak points") ||
      includesPhrase(normalized, "strong ban") ||
      includesPhrase(normalized, "strong bans") ||
      includesPhrase(normalized, "impact"))
  ) {
    deduped.sort((a, b) =>
      a.metric === "win_rate_delta" ? -1 : b.metric === "win_rate_delta" ? 1 : 0
    );
  }
  if (
    dataset === "ult_impact" &&
    !deduped.some((ref) => ref.metric === "win_rate") &&
    (includesPhrase(normalized, "what happens") ||
      includesPhrase(normalized, "impact") ||
      includesPhrase(normalized, "mirror") ||
      includesPhrase(normalized, "mirrored") ||
      includesPhrase(normalized, "uncontested"))
  ) {
    const agg = pickMetricAgg(dataset, "win_rate", question);
    if (agg) deduped.unshift({ metric: "win_rate", agg });
  }
  if (
    dataset === "map_result" &&
    mentionsMapPlaytimeContext(normalized) &&
    !deduped.some((ref) => ref.metric === "playtime")
  ) {
    const agg = pickMetricAgg(dataset, "playtime", question);
    if (agg) deduped.unshift({ metric: "playtime", agg });
  }
  if (dataset === "map_result" && mentionsMapPlaytimeContext(normalized)) {
    deduped.sort((a, b) =>
      a.metric === "playtime" ? -1 : b.metric === "playtime" ? 1 : 0
    );
    const wantsWinRate =
      includesPhrase(normalized, "win rate") ||
      includesPhrase(normalized, "win rates") ||
      includesPhrase(normalized, "winrate") ||
      includesPhrase(normalized, "winrates") ||
      includesPhrase(normalized, "record");
    if (!wantsWinRate) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric !== "playtime") deduped.splice(i, 1);
      }
    }
  }
  if (
    dataset === "map_result" &&
    (includesPhrase(normalized, "best") ||
      includesPhrase(normalized, "worst") ||
      includesPhrase(normalized, "top") ||
      includesPhrase(normalized, "highest") ||
      includesPhrase(normalized, "lowest"))
  ) {
    const wantsCount =
      includesPhrase(normalized, "how many") ||
      includesPhrase(normalized, "number") ||
      includesPhrase(normalized, "count") ||
      includesPhrase(normalized, "total") ||
      includesPhrase(normalized, "most maps");
    const wantsPlaytime = deduped.some((ref) => ref.metric === "playtime");
    if (!wantsCount && !wantsPlaytime) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "maps") deduped.splice(i, 1);
      }
      if (!deduped.some((ref) => ref.metric === "win_rate")) {
        const agg = pickMetricAgg(dataset, "win_rate", question);
        if (agg) deduped.unshift({ metric: "win_rate", agg });
      }
    }
  }
  if (dataset === "ult_usage" && includesPhrase(normalized, "per map")) {
    const priority = deduped.some(
      (ref) => ref.metric === "fight_openings_per_map"
    )
      ? "fight_openings_per_map"
      : "ults_per_map";
    deduped.sort((a, b) =>
      a.metric === priority ? -1 : b.metric === priority ? 1 : 0
    );
  }
  if (
    dataset === "hero_trend" &&
    deduped.some((ref) => ref.metric === "pick_rate_trend")
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "pick_rate") deduped.splice(i, 1);
    }
    deduped.sort((a, b) =>
      a.metric === "pick_rate_trend"
        ? -1
        : b.metric === "pick_rate_trend"
          ? 1
          : 0
    );
  }
  if (dataset === "duel") {
    const wantsCount =
      includesPhrase(normalized, "how many") ||
      includesPhrase(normalized, "number") ||
      includesPhrase(normalized, "count") ||
      includesPhrase(normalized, "total");
    const wantsLosses =
      includesPhrase(normalized, "losses") ||
      includesPhrase(normalized, "lost") ||
      includesPhrase(normalized, "lose") ||
      includesPhrase(normalized, "deaths") ||
      includesPhrase(normalized, "died");
    if (!wantsCount) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "duels") deduped.splice(i, 1);
      }
      if (wantsLosses && !deduped.some((ref) => ref.metric === "losses")) {
        const agg = pickMetricAgg(dataset, "losses", question);
        if (agg) deduped.unshift({ metric: "losses", agg });
      }
      if (!wantsLosses && !deduped.some((ref) => ref.metric === "win_rate")) {
        const agg = pickMetricAgg(dataset, "win_rate", question);
        if (agg) deduped.unshift({ metric: "win_rate", agg });
      }
    }
    if (wantsLosses) {
      deduped.sort((a, b) =>
        a.metric === "losses" ? -1 : b.metric === "losses" ? 1 : 0
      );
    }
  }
  return deduped.slice(0, 4);
}

function dedupeMetrics(refs: MetricRef[]): MetricRef[] {
  const seen = new Set<string>();
  const out: MetricRef[] = [];
  for (const ref of refs) {
    const key = metricKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function filterFor(
  dataset: DatasetId,
  kind:
    | "hero"
    | "player"
    | "map"
    | "map_type"
    | "ability"
    | "phase"
    | "impact_rating"
    | "side"
    | "death_type"
    | "attacker_hero"
    | "attacker_side"
    | "used"
    | "had_swap"
    | "role",
  value: string | string[]
): QueryFilter | null {
  const candidates: Partial<Record<typeof kind, string[]>> = {
    hero: [
      "hero",
      "our_hero",
      "enemy_hero",
      "attacker_hero",
      "victim_hero",
      "to_hero",
      "from_hero",
    ],
    player: ["player", "attacker"],
    map: ["map"],
    map_type: ["map_type"],
    ability: ["ability"],
    phase: ["phase"],
    impact_rating: ["impact_rating"],
    side: ["side"],
    death_type: ["death_type"],
    attacker_hero: ["attacker_hero"],
    attacker_side: ["attacker_side"],
    used: ["used"],
    had_swap: ["had_swap"],
    role: ["role", "enemy_role"],
  };
  const field = candidates[kind]
    ?.map((id) => getDataset(dataset).filters.find((f) => f.id === id))
    .find((f): f is FilterDef => Boolean(f));
  if (!field) return null;
  const values = Array.isArray(value) ? value : [value];
  return {
    field: field.id,
    op: field.operators.includes("in") ? "in" : "eq",
    value: field.operators.includes("in") ? values : values[0],
  };
}

function pickDuelHeroFilters(heroMentions: HeroMention[], question: string) {
  const filters: QueryFilter[] = [];
  if (heroMentions.length === 0) return filters;

  const normalized = normalize(question);
  const against = /\b(?:against|vs|versus)\s+/g;
  let enemyHero: string | null = null;
  for (const match of normalized.matchAll(against)) {
    const startsAfterAgainst = match.index + match[0].length;
    const mention = heroMentions.find(
      (heroMention) => heroMention.index >= startsAfterAgainst
    );
    if (mention) {
      enemyHero = mention.hero;
      break;
    }
  }

  let ourHero: string | null = null;
  if (enemyHero) {
    ourHero =
      heroMentions.find((mention) => mention.hero !== enemyHero)?.hero ?? null;
  } else if (heroMentions.length >= 2) {
    ourHero = heroMentions[0].hero;
    enemyHero = heroMentions[1].hero;
  } else if (
    includesPhrase(normalized, "against") ||
    includesPhrase(normalized, "vs") ||
    includesPhrase(normalized, "versus") ||
    includesPhrase(normalized, "enemy")
  ) {
    enemyHero = heroMentions[0].hero;
  } else {
    ourHero = heroMentions[0].hero;
  }

  if (ourHero) filters.push({ field: "our_hero", op: "in", value: [ourHero] });
  if (enemyHero) {
    filters.push({ field: "enemy_hero", op: "in", value: [enemyHero] });
  }
  return filters;
}

function numberFromToken(token: string): number | null {
  const normalized = normalize(token);
  if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  return NUMBER_WORDS[normalized] ?? null;
}

function durationSeconds(value: string, unit: string): number | null {
  const amount = numberFromToken(value);
  if (amount == null) return null;
  const normalizedUnit = normalize(unit);
  let scale = 1;
  if (
    normalizedUnit.startsWith("hour") ||
    normalizedUnit.startsWith("hr") ||
    normalizedUnit.startsWith("h")
  ) {
    scale = 3600;
  } else if (normalizedUnit.startsWith("min") || normalizedUnit === "m") {
    scale = 60;
  }
  return Math.round(amount * scale);
}

function extractTimePlayedFilter(
  dataset: DatasetId,
  normalized: string
): QueryFilter | null {
  const field = getDataset(dataset).filters.find(
    (filter) => filter.id === "min_time_played" || filter.id === "time_played"
  );
  if (!field) return null;

  const timeIntent =
    includesPhrase(normalized, "time played") ||
    includesPhrase(normalized, "playtime") ||
    includesPhrase(normalized, "minutes played") ||
    includesPhrase(normalized, "minute played") ||
    includesPhrase(normalized, "seconds played") ||
    includesPhrase(normalized, "second played");
  if (!timeIntent) return null;

  const duration = `(${NUMBER_TOKEN})`;
  const unit = "(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)";
  const patterns: [RegExp, QueryFilter["op"]][] = [
    [
      new RegExp(
        `\\b(?:at\\s+least|minimum|min)\\s+${duration}\\s*${unit}\\s+(?:of\\s+)?(?:time\\s+played|playtime|played)\\b`
      ),
      "gte",
    ],
    [
      new RegExp(
        `\\b(?:more\\s+than|over)\\s+${duration}\\s*${unit}\\s+(?:of\\s+)?(?:time\\s+played|playtime|played)\\b`
      ),
      "gt",
    ],
    [
      new RegExp(
        `\\b(?:at\\s+most|maximum|max|up\\s+to)\\s+${duration}\\s*${unit}\\s+(?:of\\s+)?(?:time\\s+played|playtime|played)\\b`
      ),
      "lte",
    ],
    [
      new RegExp(
        `\\b(?:less\\s+than|under)\\s+${duration}\\s*${unit}\\s+(?:of\\s+)?(?:time\\s+played|playtime|played)\\b`
      ),
      "lt",
    ],
    [
      new RegExp(
        `\\b(?:time\\s+played|playtime)\\s+(?:of\\s+)?(?:at\\s+least|minimum|min)\\s+${duration}\\s*${unit}\\b`
      ),
      "gte",
    ],
    [
      new RegExp(
        `\\b(?:time\\s+played|playtime)\\s+(?:of\\s+)?(?:more\\s+than|over)\\s+${duration}\\s*${unit}\\b`
      ),
      "gt",
    ],
    [
      new RegExp(
        `\\b(?:time\\s+played|playtime)\\s+(?:of\\s+)?(?:at\\s+most|maximum|max|up\\s+to)\\s+${duration}\\s*${unit}\\b`
      ),
      "lte",
    ],
    [
      new RegExp(
        `\\b(?:time\\s+played|playtime)\\s+(?:of\\s+)?(?:less\\s+than|under)\\s+${duration}\\s*${unit}\\b`
      ),
      "lt",
    ],
  ];

  for (const [pattern, op] of patterns) {
    const match = normalized.match(pattern);
    if (!match || !field.operators.includes(op)) continue;
    const seconds = durationSeconds(match[1], match[2]);
    if (seconds == null) continue;
    return { field: field.id, op, value: seconds };
  }

  return null;
}

function extractOpeningKillTimeFilters(normalized: string): QueryFilter[] {
  const duration = `(${NUMBER_TOKEN})`;
  const unit = "(seconds?|secs?|s|minutes?|mins?|m)";
  const filters: QueryFilter[] = [];

  function fieldForContext(context: string): "fight_time" | "kill_time" {
    return /\b(?:fight|fights|teamfight|teamfights|team fight|team fights)\b/.test(
      context
    )
      ? "fight_time"
      : "kill_time";
  }

  const firstWindow = new RegExp(
    `\\b(?:within|in|during)\\s+(?:the\\s+)?first\\s+${duration}\\s*${unit}(?:\\s+(?:of|into|in)\\s+(?:the\\s+)?(fight|fights|teamfight|teamfights|team\\s+fight|team\\s+fights|map|maps|round|rounds|match|matches))?\\b`
  );
  const firstMatch = normalized.match(firstWindow);
  if (firstMatch) {
    const seconds = durationSeconds(firstMatch[1], firstMatch[2]);
    if (seconds != null) {
      filters.push({
        field: fieldForContext(firstMatch[3] ?? ""),
        op: "lte",
        value: seconds,
      });
    }
  }

  const afterWindow = new RegExp(
    `\\b(?:after|later\\s+than|more\\s+than|over)\\s+${duration}\\s*${unit}\\s+(?:into|in|of)\\s+(?:the\\s+)?(fight|fights|teamfight|teamfights|team\\s+fight|team\\s+fights|map|maps|round|rounds|match|matches)\\b`
  );
  const afterMatch = normalized.match(afterWindow);
  if (afterMatch) {
    const seconds = durationSeconds(afterMatch[1], afterMatch[2]);
    if (seconds != null) {
      filters.push({
        field: fieldForContext(afterMatch[3]),
        op: "gt",
        value: seconds,
      });
    }
  }

  return filters;
}

function extractRotationDeathSignalFilters(normalized: string): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const number = `(${NUMBER_TOKEN})`;
  const preFightDamage = "(?:pre\\s+fight|pre-fight)\\s+damage(?:\\s+events?)?";
  const distance = "(?:kill\\s+distance|death\\s+distance|meters?|metres?)";
  const patterns: [RegExp, QueryFilter["op"], QueryFilter["field"]][] = [
    [
      new RegExp(
        `\\b(?:at\\s+most|maximum|max|up\\s+to)\\s+${number}\\s+${preFightDamage}\\b`
      ),
      "lte",
      "pre_fight_damage",
    ],
    [
      new RegExp(
        `\\b(?:less\\s+than|under)\\s+${number}\\s+${preFightDamage}\\b`
      ),
      "lt",
      "pre_fight_damage",
    ],
    [
      new RegExp(
        `\\b(?:at\\s+least|minimum|min)\\s+${number}\\s+${preFightDamage}\\b`
      ),
      "gte",
      "pre_fight_damage",
    ],
    [
      new RegExp(
        `\\b(?:more\\s+than|over)\\s+${number}\\s+${preFightDamage}\\b`
      ),
      "gt",
      "pre_fight_damage",
    ],
    [
      new RegExp(`\\b${preFightDamage}\\s+(?:at\\s+most|max)\\s+${number}\\b`),
      "lte",
      "pre_fight_damage",
    ],
    [
      new RegExp(
        `\\b${preFightDamage}\\s+(?:under|less\\s+than)\\s+${number}\\b`
      ),
      "lt",
      "pre_fight_damage",
    ],
    [
      new RegExp(
        `\\b(?:from\\s+)?(?:more\\s+than|over)\\s+${number}\\s+${distance}(?:\\s+away)?\\b`
      ),
      "gt",
      "kill_distance",
    ],
    [
      new RegExp(
        `\\b(?:from\\s+)?(?:at\\s+least|minimum|min)\\s+${number}\\s+${distance}(?:\\s+away)?\\b`
      ),
      "gte",
      "kill_distance",
    ],
    [
      new RegExp(
        `\\b(?:within|under|less\\s+than)\\s+${number}\\s+${distance}(?:\\s+away)?\\b`
      ),
      "lt",
      "kill_distance",
    ],
    [
      new RegExp(`\\b${distance}\\s+(?:over|more\\s+than)\\s+${number}\\b`),
      "gt",
      "kill_distance",
    ],
    [
      new RegExp(`\\b${distance}\\s+(?:under|less\\s+than)\\s+${number}\\b`),
      "lt",
      "kill_distance",
    ],
  ];

  const seen = new Set<string>();
  for (const [pattern, op, field] of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = numberFromToken(match[1]);
    if (value == null) continue;
    const key = `${field}:${op}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    filters.push({ field, op, value });
  }

  return filters;
}

function extractUltCountFilter(normalized: string): QueryFilter | null {
  if (
    includesPhrase(normalized, "no ults") ||
    includesPhrase(normalized, "no ultimates") ||
    includesPhrase(normalized, "without ults") ||
    includesPhrase(normalized, "without ultimates") ||
    includesPhrase(normalized, "zero ults") ||
    includesPhrase(normalized, "zero ultimates")
  ) {
    return { field: "ults_used", op: "eq", value: 0 };
  }

  const patterns: [RegExp, QueryFilter["op"]][] = [
    [
      /\b(?:exactly|use|used|using|spend|spent|with)\s+(\d+|zero|one|two|three|four|five|six)\s+(?:ult|ults|ultimate|ultimates)\b/,
      "eq",
    ],
    [
      /\bat\s+least\s+(\d+|one|two|three|four|five|six)\s+(?:ult|ults|ultimate|ultimates)\b/,
      "gte",
    ],
    [
      /\b(?:more\s+than|over)\s+(\d+|zero|one|two|three|four|five|six)\s+(?:ult|ults|ultimate|ultimates)\b/,
      "gt",
    ],
    [
      /\b(?:at\s+most|up\s+to)\s+(\d+|zero|one|two|three|four|five|six)\s+(?:ult|ults|ultimate|ultimates)\b/,
      "lte",
    ],
    [
      /\b(?:less\s+than|under)\s+(\d+|one|two|three|four|five|six)\s+(?:ult|ults|ultimate|ultimates)\b/,
      "lt",
    ],
  ];

  for (const [pattern, op] of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = numberFromToken(match[1]);
    if (value == null) continue;
    return { field: "ults_used", op, value };
  }

  return null;
}

function extractSwapCountFilter(normalized: string): QueryFilter | null {
  const patterns: [RegExp, QueryFilter["op"]][] = [
    [
      new RegExp(
        `\\b(?:exactly|with|have|had|make|made|after)\\s+(${INTEGER_TOKEN})\\s+(?:swap|swaps)\\b`
      ),
      "eq",
    ],
    [
      new RegExp(`\\bat\\s+least\\s+(${INTEGER_TOKEN})\\s+(?:swap|swaps)\\b`),
      "gte",
    ],
    [
      new RegExp(
        `\\b(?:more\\s+than|over)\\s+(${INTEGER_TOKEN})\\s+(?:swap|swaps)\\b`
      ),
      "gt",
    ],
    [
      new RegExp(
        `\\b(?:at\\s+most|up\\s+to)\\s+(${INTEGER_TOKEN})\\s+(?:swap|swaps)\\b`
      ),
      "lte",
    ],
    [
      new RegExp(
        `\\b(?:less\\s+than|under)\\s+(${INTEGER_TOKEN})\\s+(?:swap|swaps)\\b`
      ),
      "lt",
    ],
  ];

  for (const [pattern, op] of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = numberFromToken(match[1]);
    if (value == null) continue;
    return { field: "swap_count", op, value };
  }

  return null;
}

function extractWastedUltFilter(normalized: string): QueryFilter | null {
  if (
    includesPhrase(normalized, "no wasted ults") ||
    includesPhrase(normalized, "no wasted ultimates") ||
    includesPhrase(normalized, "without wasted ults") ||
    includesPhrase(normalized, "without wasted ultimates")
  ) {
    return { field: "wasted_ults", op: "eq", value: 0 };
  }
  if (
    includesPhrase(normalized, "wasted ult") ||
    includesPhrase(normalized, "wasted ults") ||
    includesPhrase(normalized, "wasted ultimate") ||
    includesPhrase(normalized, "wasted ultimates") ||
    includesPhrase(normalized, "waste an ult") ||
    includesPhrase(normalized, "waste ult") ||
    includesPhrase(normalized, "waste ults") ||
    includesPhrase(normalized, "waste ultimate") ||
    includesPhrase(normalized, "waste ultimates")
  ) {
    return { field: "wasted_ults", op: "gte", value: 1 };
  }
  return null;
}

function hasNegatedFightContext(
  normalized: string,
  phrases: string[]
): boolean {
  return phrases.some(
    (phrase) =>
      includesPhrase(normalized, `no ${phrase}`) ||
      includesPhrase(normalized, `without ${phrase}`) ||
      includesPhrase(normalized, `don t ${phrase}`) ||
      includesPhrase(normalized, `do not ${phrase}`) ||
      includesPhrase(normalized, `didn t ${phrase}`) ||
      includesPhrase(normalized, `did not ${phrase}`)
  );
}

function pickResultScope(normalized: string): "win" | "loss" | null {
  if (
    /\b(?:in|during|on|for|from)\s+(?:our\s+)?(?:won|winning)\s+(?:fights?|teamfights?|team fights?|maps?|games?)\b/.test(
      normalized
    ) ||
    /\bwhen\s+we\s+(?:win|won)\b/.test(normalized)
  ) {
    return "win";
  }
  if (
    /\b(?:in|during|on|for|from)\s+(?:our\s+)?(?:lost|losing)\s+(?:fights?|teamfights?|team fights?|maps?|games?)\b/.test(
      normalized
    ) ||
    /\bwhen\s+we\s+(?:lose|lost)\b/.test(normalized)
  ) {
    return "loss";
  }
  return null;
}

function pickUltEconomyBucket(normalized: string): string | null {
  if (
    includesPhrase(normalized, "2 behind") ||
    includesPhrase(normalized, "two behind") ||
    includesPhrase(normalized, "2 ults behind") ||
    includesPhrase(normalized, "two ults behind") ||
    includesPhrase(normalized, "2+ behind") ||
    includesPhrase(normalized, "down 2") ||
    includesPhrase(normalized, "down two")
  ) {
    return "2+ behind";
  }
  if (
    includesPhrase(normalized, "1 behind") ||
    includesPhrase(normalized, "one behind") ||
    includesPhrase(normalized, "1 ult behind") ||
    includesPhrase(normalized, "one ult behind") ||
    includesPhrase(normalized, "down 1") ||
    includesPhrase(normalized, "down one")
  ) {
    return "1 behind";
  }
  if (
    includesPhrase(normalized, "2 ahead") ||
    includesPhrase(normalized, "two ahead") ||
    includesPhrase(normalized, "2 ults ahead") ||
    includesPhrase(normalized, "two ults ahead") ||
    includesPhrase(normalized, "2+ ahead") ||
    includesPhrase(normalized, "up 2") ||
    includesPhrase(normalized, "up two")
  ) {
    return "2+ ahead";
  }
  if (
    includesPhrase(normalized, "1 ahead") ||
    includesPhrase(normalized, "one ahead") ||
    includesPhrase(normalized, "1 ult ahead") ||
    includesPhrase(normalized, "one ult ahead") ||
    includesPhrase(normalized, "up 1") ||
    includesPhrase(normalized, "up one")
  ) {
    return "1 ahead";
  }
  if (
    includesPhrase(normalized, "even ults") ||
    includesPhrase(normalized, "even ultimates") ||
    includesPhrase(normalized, "even ult economy") ||
    includesPhrase(normalized, "even ultimate economy")
  ) {
    return "even";
  }
  return null;
}

function pickFightPhase(normalized: string): string | null {
  if (
    includesPhrase(normalized, "pre fight") ||
    includesPhrase(normalized, "pre-fight") ||
    includesPhrase(normalized, "before fight")
  ) {
    return "pre-fight";
  }
  if (
    includesPhrase(normalized, "early") ||
    includesPhrase(normalized, "early fight")
  ) {
    return "early";
  }
  if (
    includesPhrase(normalized, "mid") ||
    includesPhrase(normalized, "mid fight") ||
    includesPhrase(normalized, "middle")
  ) {
    return "mid";
  }
  if (
    includesPhrase(normalized, "late") ||
    includesPhrase(normalized, "late fight")
  ) {
    return "late";
  }
  if (includesPhrase(normalized, "cleanup")) return "cleanup";
  return null;
}

function pickPlayerTrendMetric(normalized: string): string | null {
  if (
    includesPhrase(normalized, "damage taken") ||
    includesPhrase(normalized, "damage taken per 10")
  ) {
    return "damage_taken_per10";
  }
  if (
    includesPhrase(normalized, "hero damage") ||
    includesPhrase(normalized, "damage dealt") ||
    includesPhrase(normalized, "damage per 10") ||
    includesPhrase(normalized, "damage")
  ) {
    return "hero_damage_per10";
  }
  if (
    includesPhrase(normalized, "first death") ||
    includesPhrase(normalized, "first deaths") ||
    includesPhrase(normalized, "opening death") ||
    includesPhrase(normalized, "opening deaths")
  ) {
    return "first_death_percentage";
  }
  if (
    includesPhrase(normalized, "first pick") ||
    includesPhrase(normalized, "first picks") ||
    includesPhrase(normalized, "opening pick") ||
    includesPhrase(normalized, "opening picks")
  ) {
    return "first_pick_percentage";
  }
  if (
    includesPhrase(normalized, "deaths") ||
    includesPhrase(normalized, "death rate")
  ) {
    return "deaths_per10";
  }
  if (
    includesPhrase(normalized, "eliminations") ||
    includesPhrase(normalized, "elims")
  ) {
    return "eliminations_per10";
  }
  if (includesPhrase(normalized, "mvp")) return "mvp_score";
  if (
    includesPhrase(normalized, "fight reversal") ||
    includesPhrase(normalized, "reversal")
  ) {
    return "fight_reversal_percentage";
  }
  if (
    includesPhrase(normalized, "fleta") ||
    includesPhrase(normalized, "deadlift")
  ) {
    return "fleta_deadlift_percentage";
  }
  if (
    includesPhrase(normalized, "kills per ult") ||
    includesPhrase(normalized, "kills per ultimate")
  ) {
    return "kills_per_ultimate";
  }
  return null;
}

function pickPlayerOutlierStat(normalized: string): string | null {
  if (
    includesPhrase(normalized, "damage blocked") ||
    includesPhrase(normalized, "mitigation") ||
    includesPhrase(normalized, "mitigated")
  ) {
    return "damage_blocked";
  }
  if (
    includesPhrase(normalized, "hero damage") ||
    includesPhrase(normalized, "damage dealt") ||
    includesPhrase(normalized, "damage")
  ) {
    return "hero_damage_dealt";
  }
  if (
    includesPhrase(normalized, "healing") ||
    includesPhrase(normalized, "heals")
  ) {
    return "healing_dealt";
  }
  if (
    includesPhrase(normalized, "deaths") ||
    includesPhrase(normalized, "death")
  ) {
    return "deaths";
  }
  if (
    includesPhrase(normalized, "eliminations") ||
    includesPhrase(normalized, "elims")
  ) {
    return "eliminations";
  }
  return null;
}

function pickPlayerTargetStat(normalized: string): string | null {
  if (
    includesPhrase(normalized, "damage taken") ||
    includesPhrase(normalized, "taking damage")
  ) {
    return "damage_taken";
  }
  if (
    includesPhrase(normalized, "damage blocked") ||
    includesPhrase(normalized, "mitigation") ||
    includesPhrase(normalized, "mitigated")
  ) {
    return "damage_blocked";
  }
  if (
    includesPhrase(normalized, "hero damage") ||
    includesPhrase(normalized, "damage dealt") ||
    includesPhrase(normalized, "damage")
  ) {
    return "hero_damage_dealt";
  }
  if (
    includesPhrase(normalized, "healing") ||
    includesPhrase(normalized, "heals")
  ) {
    return "healing_dealt";
  }
  if (
    includesPhrase(normalized, "final blows") ||
    includesPhrase(normalized, "final blow") ||
    includesPhrase(normalized, "finals")
  ) {
    return "final_blows";
  }
  if (
    includesPhrase(normalized, "ultimates earned") ||
    includesPhrase(normalized, "ults earned") ||
    includesPhrase(normalized, "ult charge")
  ) {
    return "ultimates_earned";
  }
  if (
    includesPhrase(normalized, "deaths") ||
    includesPhrase(normalized, "death")
  ) {
    return "deaths";
  }
  if (
    includesPhrase(normalized, "eliminations") ||
    includesPhrase(normalized, "elims")
  ) {
    return "eliminations";
  }
  return null;
}

function pickFilters(dataset: DatasetId, question: string): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const heroMentions = findHeroMentions(question);
  const heroes = heroMentions.map((mention) => mention.hero);
  const hero = heroes[0] ?? null;
  const ability = findAbility(question);
  const mapName = findMapName(question);
  const player = findPlayer(question, hero);
  const normalized = normalize(question);

  if (heroes.length > 0) {
    if (dataset === "duel") {
      filters.push(...pickDuelHeroFilters(heroMentions, question));
    } else {
      const exactUltCombo =
        dataset === "ult_combo" &&
        heroes.length === 2 &&
        (includesPhrase(normalized, "ult combo") ||
          includesPhrase(normalized, "ult combos") ||
          includesPhrase(normalized, "ultimate combo") ||
          includesPhrase(normalized, "ultimate combos") ||
          includesPhrase(normalized, "combo"));

      if (exactUltCombo) {
        const [heroA, heroB] = [...heroes].sort((a, b) => a.localeCompare(b));
        filters.push({ field: "hero_a", op: "in", value: [heroA] });
        filters.push({ field: "hero_b", op: "in", value: [heroB] });
      } else {
        const filter = filterFor(dataset, "hero", heroes);
        if (filter) filters.push(filter);
      }
    }
  }
  if (player) {
    const filter = filterFor(dataset, "player", player);
    if (filter) filters.push(filter);
  }
  if (ability) {
    const filter = filterFor(dataset, "ability", ability);
    if (filter) filters.push(filter);
  }
  if (mapName) {
    const filter = filterFor(dataset, "map", mapName);
    if (filter) filters.push(filter);
  }

  for (const mapType of [
    "Clash",
    "Control",
    "Escort",
    "Flashpoint",
    "Hybrid",
    "Push",
  ]) {
    if (includesPhrase(normalized, mapType)) {
      const filter = filterFor(dataset, "map_type", mapType);
      if (filter) filters.push(filter);
    }
  }

  const timePlayedFilter = extractTimePlayedFilter(dataset, normalized);
  if (timePlayedFilter) filters.push(timePlayedFilter);

  const resultScope = pickResultScope(normalized);
  if (
    resultScope &&
    getDataset(dataset).filters.some((filter) => filter.id === "result")
  ) {
    filters.push({ field: "result", op: "eq", value: resultScope });
  }

  if (dataset === "opening_kill") {
    const firstPickIntent =
      mentionsFirstPickAttribution(normalized) &&
      !mentionsFirstDeathAttribution(normalized);
    const enemyContext =
      includesPhrase(normalized, "enemy") ||
      includesPhrase(normalized, "their") ||
      includesPhrase(normalized, "opponent");

    if (firstPickIntent) {
      for (let i = filters.length - 1; i >= 0; i--) {
        if (filters[i].field === "player" || filters[i].field === "hero") {
          filters.splice(i, 1);
        }
      }
      if (player) {
        filters.push({ field: "attacker", op: "in", value: [player] });
      }
      if (heroes.length > 0) {
        filters.push({ field: "attacker_hero", op: "in", value: heroes });
      }
      filters.push({
        field: "attacker_side",
        op: "eq",
        value: enemyContext ? "enemy" : "us",
      });
    } else if (mentionsFirstDeathAttribution(normalized)) {
      filters.push({
        field: "side",
        op: "eq",
        value: enemyContext ? "enemy" : "us",
      });
    }
    filters.push(...extractOpeningKillTimeFilters(normalized));
  }

  if (dataset === "teamfight") {
    const asksFirstPickRate =
      includesPhrase(normalized, "first pick rate") ||
      includesPhrase(normalized, "opening pick rate");
    const asksFirstDeathRate =
      includesPhrase(normalized, "first death rate") ||
      includesPhrase(normalized, "opening death rate");
    const asksFirstUltRate =
      includesPhrase(normalized, "first ult rate") ||
      includesPhrase(normalized, "first ultimate rate");
    const asksDryFightRate =
      includesPhrase(normalized, "dry fight rate") ||
      includesPhrase(normalized, "dry-fight rate") ||
      includesPhrase(normalized, "dry fight reversal rate") ||
      includesPhrase(normalized, "dry-fight reversal rate");
    const asksReversalRate =
      includesPhrase(normalized, "reversal rate") ||
      includesPhrase(normalized, "fight reversal rate");

    const noFirstDeath = hasNegatedFightContext(normalized, [
      "first death",
      "have first death",
      "opening death",
      "have opening death",
    ]);
    const noFirstPick = hasNegatedFightContext(normalized, [
      "first pick",
      "get first pick",
      "opening pick",
      "get opening pick",
    ]);
    const noFirstUlt = hasNegatedFightContext(normalized, [
      "first ult",
      "use first ult",
      "get first ult",
      "first ultimate",
      "use first ultimate",
      "get first ultimate",
    ]);
    const noDryFight = hasNegatedFightContext(normalized, ["dry fight"]);
    const noReversal = hasNegatedFightContext(normalized, [
      "reversal",
      "reverse fight",
    ]);

    if (includesPhrase(normalized, "first death") && !asksFirstDeathRate) {
      filters.push({
        field: "first_death",
        op: "eq",
        value: noFirstDeath ? "no" : "yes",
      });
    }
    if (includesPhrase(normalized, "first pick") && !asksFirstPickRate) {
      filters.push({
        field: "first_pick",
        op: "eq",
        value: noFirstPick ? "no" : "yes",
      });
    }
    if (includesPhrase(normalized, "dry fight") && !asksDryFightRate) {
      filters.push({
        field: "dry_fight",
        op: "eq",
        value: noDryFight ? "no" : "yes",
      });
    }
    if (
      (includesPhrase(normalized, "first ult") ||
        includesPhrase(normalized, "first ultimate")) &&
      !asksFirstUltRate
    ) {
      filters.push({
        field: "first_ult",
        op: "eq",
        value: noFirstUlt ? "no" : "yes",
      });
    }
    if (
      (includesPhrase(normalized, "reversal") ||
        includesPhrase(normalized, "reverse fight")) &&
      !asksReversalRate
    ) {
      filters.push({
        field: "reversal",
        op: "eq",
        value: noReversal ? "no" : "yes",
      });
    }
    const ultCountFilter = extractUltCountFilter(normalized);
    if (ultCountFilter) filters.push(ultCountFilter);
    const wastedUltFilter = extractWastedUltFilter(normalized);
    if (wastedUltFilter) filters.push(wastedUltFilter);
  }

  if (dataset === "rotation_death") {
    const enemySide =
      includesPhrase(normalized, "enemy rotation") ||
      includesPhrase(normalized, "enemy deaths") ||
      includesPhrase(normalized, "their rotation") ||
      includesPhrase(normalized, "their deaths") ||
      includesPhrase(normalized, "opponent rotation") ||
      includesPhrase(normalized, "opponent deaths");
    const sideFilter = filterFor(dataset, "side", enemySide ? "enemy" : "us");
    if (sideFilter) filters.push(sideFilter);

    if (
      includesPhrase(normalized, "normal deaths") ||
      includesPhrase(normalized, "non rotation") ||
      includesPhrase(normalized, "non-rotation")
    ) {
      const typeFilter = filterFor(dataset, "death_type", "normal");
      if (typeFilter) filters.push(typeFilter);
    }

    if (
      hero &&
      (includesPhrase(normalized, "killed by") ||
        includesPhrase(normalized, "dying to") ||
        includesPhrase(normalized, "died to") ||
        includesPhrase(normalized, "against"))
    ) {
      filters.push({ field: "attacker_hero", op: "in", value: [hero] });
      for (let i = filters.length - 1; i >= 0; i--) {
        if (filters[i].field === "hero") filters.splice(i, 1);
      }
    }

    filters.push(...extractRotationDeathSignalFilters(normalized));
  }

  if (dataset === "map_result") {
    const opponent = findOpponent(question);
    if (opponent) {
      filters.push({ field: "opponent", op: "in", value: [opponent] });
    }
  }

  if (dataset === "team_performance") {
    const wantsSideComparison =
      includesPhrase(normalized, "vs") ||
      includesPhrase(normalized, "versus") ||
      includesPhrase(normalized, "compared to") ||
      includesPhrase(normalized, "compare");
    if (
      !wantsSideComparison &&
      (includesPhrase(normalized, "opponent") ||
        includesPhrase(normalized, "opponents") ||
        includesPhrase(normalized, "enemy") ||
        includesPhrase(normalized, "their team") ||
        includesPhrase(normalized, "them"))
    ) {
      filters.push({ field: "side", op: "in", value: ["opponent"] });
    } else if (
      !wantsSideComparison &&
      (includesPhrase(normalized, "our team") ||
        includesPhrase(normalized, "we") ||
        includesPhrase(normalized, "us"))
    ) {
      filters.push({ field: "side", op: "in", value: ["our team"] });
    }
  }

  if (dataset === "map_intelligence") {
    if (includesPhrase(normalized, "improving")) {
      filters.push({ field: "trend", op: "in", value: ["improving"] });
    } else if (includesPhrase(normalized, "declining")) {
      filters.push({ field: "trend", op: "in", value: ["declining"] });
    } else if (includesPhrase(normalized, "stable")) {
      filters.push({ field: "trend", op: "in", value: ["stable"] });
    }
  }

  if (dataset === "player_impact") {
    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesPhrase(normalized, `${roleWord} players`) ||
        includesPhrase(normalized, `${roleWord}s`) ||
        includesPhrase(normalized, `${roleWord} role`) ||
        includesPhrase(normalized, `for ${roleWord}`) ||
        includesPhrase(normalized, `as ${roleWord}`)
      ) {
        const filter = filterFor(dataset, "role", role);
        if (filter) filters.push(filter);
      }
    }
  }

  if (dataset === "player_trend") {
    if (
      includesPhrase(normalized, "improving") ||
      includesPhrase(normalized, "improve") ||
      includesPhrase(normalized, "improved") ||
      includesPhrase(normalized, "trending up")
    ) {
      filters.push({ field: "direction", op: "in", value: ["improving"] });
    } else if (
      includesPhrase(normalized, "declining") ||
      includesPhrase(normalized, "decline") ||
      includesPhrase(normalized, "declined") ||
      includesPhrase(normalized, "trending down")
    ) {
      filters.push({ field: "direction", op: "in", value: ["declining"] });
    } else if (includesPhrase(normalized, "stable")) {
      filters.push({ field: "direction", op: "in", value: ["stable"] });
    }

    const trendMetric = pickPlayerTrendMetric(normalized);
    if (trendMetric) {
      filters.push({ field: "metric", op: "in", value: [trendMetric] });
    }

    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesPhrase(normalized, `${roleWord} players`) ||
        includesPhrase(normalized, `${roleWord}s`) ||
        includesPhrase(normalized, `${roleWord} role`) ||
        includesPhrase(normalized, `for ${roleWord}`) ||
        includesPhrase(normalized, `as ${roleWord}`)
      ) {
        const filter = filterFor(dataset, "role", role);
        if (filter) filters.push(filter);
      }
    }
  }

  if (dataset === "player_outlier") {
    if (
      includesPhrase(normalized, "outlier") ||
      includesPhrase(normalized, "outliers")
    ) {
      filters.push({ field: "outlier", op: "eq", value: "yes" });
    }
    if (
      includesPhrase(normalized, "above baseline") ||
      includesPhrase(normalized, "far above") ||
      includesPhrase(normalized, "high")
    ) {
      filters.push({ field: "direction", op: "in", value: ["high"] });
    } else if (
      includesPhrase(normalized, "below baseline") ||
      includesPhrase(normalized, "far below") ||
      includesPhrase(normalized, "low")
    ) {
      filters.push({ field: "direction", op: "in", value: ["low"] });
    }

    const outlierStat = pickPlayerOutlierStat(normalized);
    if (outlierStat) {
      filters.push({ field: "stat", op: "in", value: [outlierStat] });
    }

    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesPhrase(normalized, `${roleWord} players`) ||
        includesPhrase(normalized, `${roleWord}s`) ||
        includesPhrase(normalized, `${roleWord} role`) ||
        includesPhrase(normalized, `for ${roleWord}`) ||
        includesPhrase(normalized, `as ${roleWord}`)
      ) {
        const filter = filterFor(dataset, "role", role);
        if (filter) filters.push(filter);
      }
    }
  }

  if (dataset === "player_target") {
    if (includesPhrase(normalized, "on track")) {
      filters.push({ field: "status", op: "in", value: ["on track"] });
    } else if (includesPhrase(normalized, "off track")) {
      filters.push({ field: "status", op: "in", value: ["off track"] });
    } else if (includesPhrase(normalized, "complete")) {
      filters.push({ field: "status", op: "in", value: ["complete"] });
    } else if (
      includesPhrase(normalized, "stalled") ||
      includesPhrase(normalized, "neutral")
    ) {
      filters.push({ field: "status", op: "in", value: ["stalled"] });
    }

    if (
      includesPhrase(normalized, "toward") ||
      includesPhrase(normalized, "improving toward")
    ) {
      filters.push({ field: "trending", op: "in", value: ["toward"] });
    } else if (
      includesPhrase(normalized, "away") ||
      includesPhrase(normalized, "moving away")
    ) {
      filters.push({ field: "trending", op: "in", value: ["away"] });
    }

    const targetStat = pickPlayerTargetStat(normalized);
    if (targetStat) {
      filters.push({ field: "stat", op: "in", value: [targetStat] });
    }
  }

  if (dataset === "hero_trend") {
    if (
      includesPhrase(normalized, "trending up") ||
      includesPhrase(normalized, "increasing") ||
      includesPhrase(normalized, "rising") ||
      includesPhrase(normalized, "more popular")
    ) {
      filters.push({ field: "trend", op: "in", value: ["increasing"] });
    } else if (
      includesPhrase(normalized, "trending down") ||
      includesPhrase(normalized, "declining") ||
      includesPhrase(normalized, "falling") ||
      includesPhrase(normalized, "less popular")
    ) {
      filters.push({ field: "trend", op: "in", value: ["declining"] });
    } else if (includesPhrase(normalized, "stable")) {
      filters.push({ field: "trend", op: "in", value: ["stable"] });
    }
  }

  if (dataset === "ult_economy") {
    const bucket = pickUltEconomyBucket(normalized);
    if (bucket) {
      filters.push({ field: "advantage_bucket", op: "in", value: [bucket] });
    }
  }

  if (dataset === "ability_impact") {
    const side = includesPhrase(normalized, "enemy") ? "enemy" : "us";
    const sideFilter = filterFor(dataset, "side", side);
    if (sideFilter) filters.push(sideFilter);

    const wantsComparison =
      includesPhrase(normalized, "affect") ||
      includesPhrase(normalized, "impact") ||
      includesPhrase(normalized, "compare") ||
      includesPhrase(normalized, "used vs not used");
    if (!wantsComparison) {
      if (
        includesPhrase(normalized, "not using") ||
        includesPhrase(normalized, "not used") ||
        includesPhrase(normalized, "without")
      ) {
        const usedFilter = filterFor(dataset, "used", "no");
        if (usedFilter) filters.push(usedFilter);
      } else if (
        includesPhrase(normalized, "using") ||
        includesPhrase(normalized, "used")
      ) {
        const usedFilter = filterFor(dataset, "used", "yes");
        if (usedFilter) filters.push(usedFilter);
      }
    }
  }

  if (dataset === "ability_timing") {
    const phase = pickFightPhase(normalized);
    if (
      phase &&
      !includesPhrase(normalized, "by phase") &&
      !includesPhrase(normalized, "per phase")
    ) {
      const filter = filterFor(dataset, "phase", phase);
      if (filter) filters.push(filter);
    }

    if (includesPhrase(normalized, "critical")) {
      const filter = filterFor(dataset, "impact_rating", "critical");
      if (filter) filters.push(filter);
    } else if (includesPhrase(normalized, "high impact")) {
      const filter = filterFor(dataset, "impact_rating", "high");
      if (filter) filters.push(filter);
    }
  }

  if (dataset === "swap_impact") {
    const swapCountFilter = extractSwapCountFilter(normalized);
    if (
      includesPhrase(normalized, "without swaps") ||
      includesPhrase(normalized, "no swaps") ||
      includesPhrase(normalized, "not swap")
    ) {
      const filter = filterFor(dataset, "had_swap", "no");
      if (filter) filters.push(filter);
    } else if (swapCountFilter && swapCountFilter.value !== 0) {
      const filter = filterFor(dataset, "had_swap", "yes");
      if (filter) filters.push(filter);
    } else if (
      includesPhrase(normalized, "with swaps") ||
      includesPhrase(normalized, "when we swap") ||
      includesPhrase(normalized, "when swapping")
    ) {
      const filter = filterFor(dataset, "had_swap", "yes");
      if (filter) filters.push(filter);
    }
    if (swapCountFilter) filters.push(swapCountFilter);
  }

  if (dataset === "role_performance") {
    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesPhrase(normalized, `${roleWord} role`) ||
        includesPhrase(normalized, `${roleWord} line`) ||
        includesPhrase(normalized, `for ${roleWord}`) ||
        includesPhrase(normalized, `as ${roleWord}`)
      ) {
        const filter = filterFor(dataset, "role", role);
        if (filter) filters.push(filter);
      }
    }
  }

  if (
    dataset === "hero_pool" ||
    dataset === "hero_diversity" ||
    dataset === "player_intelligence"
  ) {
    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesPhrase(normalized, `${roleWord} heroes`) ||
        includesPhrase(normalized, `${roleWord} players`) ||
        includesPhrase(normalized, `${roleWord}s`) ||
        includesPhrase(normalized, `${roleWord} role`) ||
        includesPhrase(normalized, `for ${roleWord}`) ||
        includesPhrase(normalized, `as ${roleWord}`)
      ) {
        const filter = filterFor(dataset, "role", role);
        if (filter) filters.push(filter);
      }
    }
  }

  if (dataset === "ban_impact") {
    if (
      includesPhrase(normalized, "banned by us") ||
      includesPhrase(normalized, "we ban") ||
      includesPhrase(normalized, "we banned") ||
      includesPhrase(normalized, "by us") ||
      includesPhrase(normalized, "our bans") ||
      includesPhrase(normalized, "strong ban")
    ) {
      const sideFilter = filterFor(dataset, "side", "banned by us");
      if (sideFilter) filters.push(sideFilter);
    } else if (
      includesPhrase(normalized, "banned by enemy") ||
      includesPhrase(normalized, "enemy ban") ||
      includesPhrase(normalized, "enemy bans") ||
      includesPhrase(normalized, "opponent ban") ||
      includesPhrase(normalized, "opponent bans") ||
      includesPhrase(normalized, "banned from us") ||
      includesPhrase(normalized, "weak point")
    ) {
      const sideFilter = filterFor(dataset, "side", "banned by enemy");
      if (sideFilter) filters.push(sideFilter);
    }

    if (
      includesPhrase(normalized, "weak point") ||
      includesPhrase(normalized, "weak points")
    ) {
      filters.push({ field: "tag", op: "eq", value: "weak point" });
    }
    if (
      includesPhrase(normalized, "strong ban") ||
      includesPhrase(normalized, "strong bans")
    ) {
      filters.push({ field: "tag", op: "eq", value: "strong ban" });
    }
  }

  if (dataset === "ult_combo") {
    if (
      includesPhrase(normalized, "counter ult") ||
      includesPhrase(normalized, "counter ultimate") ||
      includesPhrase(normalized, "response ult") ||
      includesPhrase(normalized, "respond to ult") ||
      includesPhrase(normalized, "respond to ultimate") ||
      includesPhrase(normalized, "answer ult") ||
      includesPhrase(normalized, "answer ultimate")
    ) {
      filters.push({ field: "type", op: "eq", value: "response" });
    } else if (
      includesPhrase(normalized, "ult combo") ||
      includesPhrase(normalized, "ult combos") ||
      includesPhrase(normalized, "ultimate combo") ||
      includesPhrase(normalized, "ultimate combos") ||
      includesPhrase(normalized, "combo win rate") ||
      includesPhrase(normalized, "combo winrate")
    ) {
      filters.push({ field: "type", op: "eq", value: "combo" });
    }

    if (
      hero &&
      (includesPhrase(normalized, "enemy ult") ||
        includesPhrase(normalized, "enemy ultimate") ||
        includesPhrase(normalized, "against") ||
        includesPhrase(normalized, "respond to"))
    ) {
      filters.push({ field: "enemy_hero", op: "in", value: [hero] });
    }
  }

  if (dataset === "ult_impact") {
    if (
      includesPhrase(normalized, "enemy ult") ||
      includesPhrase(normalized, "enemy ults") ||
      includesPhrase(normalized, "enemy ultimate") ||
      includesPhrase(normalized, "enemy ultimates") ||
      includesPhrase(normalized, "their ult") ||
      includesPhrase(normalized, "their ults") ||
      includesPhrase(normalized, "their ultimate") ||
      /\benemy\s+ults?\b/.test(normalized)
    ) {
      filters.push({ field: "side", op: "in", value: ["enemy", "both"] });
    } else if (
      includesPhrase(normalized, "we ult") ||
      includesPhrase(normalized, "we ults") ||
      includesPhrase(normalized, "we use ult") ||
      includesPhrase(normalized, "we used ult") ||
      includesPhrase(normalized, "our ult") ||
      includesPhrase(normalized, "our ultimate") ||
      /\bwe\s+(?:use|used)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
        normalized
      )
    ) {
      filters.push({ field: "side", op: "in", value: ["us", "both"] });
    }

    if (
      includesPhrase(normalized, "uncontested ult") ||
      includesPhrase(normalized, "uncontested ultimate") ||
      includesPhrase(normalized, "not mirrored") ||
      includesPhrase(normalized, "without mirror")
    ) {
      filters.push({ field: "mirrored", op: "eq", value: "no" });
    } else if (
      includesPhrase(normalized, "mirror ult") ||
      includesPhrase(normalized, "mirror ultimate") ||
      includesPhrase(normalized, "mirrored ult") ||
      includesPhrase(normalized, "mirrored ultimate")
    ) {
      filters.push({ field: "mirrored", op: "eq", value: "yes" });
    }

    if (
      includesPhrase(normalized, "we first") ||
      includesPhrase(normalized, "ours first") ||
      includesPhrase(normalized, "our ult first") ||
      includesPhrase(normalized, "we ult first")
    ) {
      filters.push({ field: "first_side", op: "eq", value: "us" });
    } else if (
      includesPhrase(normalized, "enemy first") ||
      includesPhrase(normalized, "they first") ||
      includesPhrase(normalized, "enemy ult first") ||
      includesPhrase(normalized, "enemy ults first") ||
      includesPhrase(normalized, "they ult first")
    ) {
      filters.push({ field: "first_side", op: "eq", value: "enemy" });
    }
  }

  if (dataset === "ult_usage") {
    if (
      includesPhrase(normalized, "fight openings") ||
      includesPhrase(normalized, "fight opener") ||
      includesPhrase(normalized, "fight openers") ||
      includesPhrase(normalized, "open fights") ||
      includesPhrase(normalized, "opening ult") ||
      includesPhrase(normalized, "opening ultimate")
    ) {
      if (
        includesPhrase(normalized, "which hero") ||
        includesPhrase(normalized, "which heroes") ||
        includesPhrase(normalized, "by hero")
      ) {
        filters.push({
          field: "row_type",
          op: "eq",
          value: "fight opening hero",
        });
      } else {
        filters.push({ field: "row_type", op: "eq", value: "player" });
      }
    } else {
      filters.push({ field: "row_type", op: "eq", value: "player" });
    }
  }

  if (dataset === "trend") {
    const lastMatch = normalized.match(
      /\blast\s+(\d{1,2})\s+(?:maps?|games?)\b/
    );
    const lastWord = includesPhrase(normalized, "last five")
      ? 5
      : includesPhrase(normalized, "last ten")
        ? 10
        : includesPhrase(normalized, "last twenty")
          ? 20
          : null;
    const recent = lastMatch ? Number(lastMatch[1]) : lastWord;
    if (recent && recent <= 5) {
      filters.push({ field: "recent_bucket", op: "eq", value: "last 5" });
    } else if (recent && recent <= 10) {
      filters.push({ field: "recent_bucket", op: "eq", value: "last 10" });
    } else if (recent && recent <= 20) {
      filters.push({ field: "recent_bucket", op: "eq", value: "last 20" });
    }

    for (const day of [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]) {
      if (includesPhrase(normalized, day)) {
        filters.push({ field: "day_of_week", op: "in", value: [day] });
      }
    }
  }

  if (dataset === "streak") {
    if (includesPhrase(normalized, "current")) {
      filters.push({ field: "streak", op: "eq", value: "current streak" });
    } else if (
      includesPhrase(normalized, "longest") &&
      (includesPhrase(normalized, "loss") ||
        includesPhrase(normalized, "losses") ||
        includesPhrase(normalized, "losing"))
    ) {
      filters.push({
        field: "streak",
        op: "eq",
        value: "longest loss streak",
      });
    } else if (includesPhrase(normalized, "longest")) {
      filters.push({
        field: "streak",
        op: "eq",
        value: "longest win streak",
      });
    }
  }

  return filters.slice(0, 8);
}

function pickDimensions(
  dataset: DatasetId,
  question: string,
  filters: QueryFilter[]
): string[] {
  const normalized = normalize(question);
  const ds = getDataset(dataset);
  const dims: string[] = [];

  function hasFilter(field: string): boolean {
    return filters.some((f) => f.field === field);
  }

  function add(id: string) {
    if (dims.includes(id)) return;
    if (ds.dimensions.some((d) => d.id === id)) dims.push(id);
  }

  for (const dim of ds.dimensions) {
    if (
      dim.id === "map" &&
      (includesPhrase(normalized, "map type") ||
        includesPhrase(normalized, "map types") ||
        includesPhrase(normalized, "map mode") ||
        includesPhrase(normalized, "map modes"))
    ) {
      continue;
    }
    const aliases = [
      dim.id.replace(/_/g, " "),
      dim.label,
      ...(DIMENSION_ALIASES[dim.id] ?? []),
    ];
    if (
      aliases.some((alias) => includesPhrase(normalized, `by ${alias}`)) ||
      aliases.some((alias) => includesPhrase(normalized, `per ${alias}`))
    ) {
      add(dim.id);
    }
  }

  if (
    (includesPhrase(normalized, "who") ||
      includesPhrase(normalized, "whose") ||
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players")) &&
    !hasFilter("player")
  ) {
    add(
      dataset === "opening_kill" && mentionsFirstPickAttribution(normalized)
        ? "attacker"
        : "player"
    );
  }
  if (
    (includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "which heroes") ||
      includesPhrase(normalized, "by hero")) &&
    !hasFilter("hero") &&
    !hasFilter("our_hero")
  ) {
    if (dataset === "opening_kill" && mentionsFirstPickAttribution(normalized))
      add("attacker_hero");
    else
      add(ds.dimensions.some((d) => d.id === "our_hero") ? "our_hero" : "hero");
  }
  if (
    (includesPhrase(normalized, "which role") ||
      includesPhrase(normalized, "which roles")) &&
    !hasFilter("role")
  ) {
    add("role");
  }
  if (
    (includesPhrase(normalized, "which map") ||
      includesPhrase(normalized, "which maps") ||
      includesPhrase(normalized, "what map") ||
      includesPhrase(normalized, "what maps") ||
      includesPhrase(normalized, "by map") ||
      includesPhrase(normalized, "by maps")) &&
    !includesPhrase(normalized, "map type") &&
    !includesPhrase(normalized, "map types") &&
    !includesPhrase(normalized, "map mode") &&
    !includesPhrase(normalized, "map modes")
  ) {
    add("map");
  }
  if (
    dataset === "map_result" &&
    (includesPhrase(normalized, "map mode") ||
      includesPhrase(normalized, "map modes") ||
      includesPhrase(normalized, "map type") ||
      includesPhrase(normalized, "map types") ||
      includesPhrase(normalized, "by mode") ||
      includesPhrase(normalized, "by map mode") ||
      includesPhrase(normalized, "by map type") ||
      includesPhrase(normalized, "per mode") ||
      includesPhrase(normalized, "per map mode") ||
      includesPhrase(normalized, "per map type"))
  ) {
    add("map_type");
  }
  if (
    dataset === "map_result" &&
    dims.length === 0 &&
    (includesPhrase(normalized, "best map mode") ||
      includesPhrase(normalized, "best map type") ||
      includesPhrase(normalized, "worst map mode") ||
      includesPhrase(normalized, "worst map type"))
  ) {
    add("map_type");
  }
  if (
    dataset === "team_performance" &&
    dims.length === 0 &&
    !hasFilter("side")
  ) {
    add("side");
  }
  if (dataset === "map_intelligence" && dims.length === 0) {
    if (
      includesPhrase(normalized, "map type") ||
      includesPhrase(normalized, "map types") ||
      includesPhrase(normalized, "map type dependency") ||
      includesPhrase(normalized, "map type dependencies")
    ) {
      add("map_type");
    } else {
      add("map");
    }
  }
  if (
    dataset === "ult_economy" &&
    dims.length === 0 &&
    !hasFilter("advantage_bucket")
  ) {
    add("advantage_bucket");
  }
  if (dataset === "duel" && dims.length === 0) {
    const hasOurHeroFilter = hasFilter("our_hero");
    const hasEnemyHeroFilter = hasFilter("enemy_hero");
    const wantsOurHeroes =
      includesPhrase(normalized, "our heroes") ||
      includesPhrase(normalized, "our hero") ||
      includesPhrase(normalized, "which heroes") ||
      includesPhrase(normalized, "which of our heroes") ||
      includesPhrase(normalized, "who on");
    const wantsEnemyHeroes =
      includesPhrase(normalized, "enemy heroes") ||
      includesPhrase(normalized, "enemy hero") ||
      includesPhrase(normalized, "opponent heroes") ||
      includesPhrase(normalized, "opponent hero") ||
      includesPhrase(normalized, "against who") ||
      includesPhrase(normalized, "against which");
    if (!hasOurHeroFilter && (!wantsEnemyHeroes || wantsOurHeroes)) {
      add("our_hero");
    }
    if (!hasEnemyHeroFilter && (!wantsOurHeroes || wantsEnemyHeroes)) {
      add("enemy_hero");
    }
  }
  if (dataset === "rotation_death" && dims.length === 0) {
    if (hasFilter("player")) {
      add("map");
    } else if (hasFilter("hero")) {
      add("player");
    } else {
      add("player");
    }
  }
  if (dataset === "opening_kill" && dims.length === 0) {
    if (mentionsFirstPickAttribution(normalized)) {
      if (!hasFilter("attacker") && !hasFilter("attacker_hero")) {
        add("attacker");
      }
    } else if (mentionsFirstDeathAttribution(normalized)) {
      if (!hasFilter("player") && !hasFilter("hero")) {
        add("player");
      }
    } else {
      add("player");
      add("attacker");
    }
  }
  if (dataset === "ability_impact" && dims.length === 0) {
    add(hasFilter("used") ? "ability" : "used");
  }
  if (dataset === "ability_timing" && dims.length === 0) {
    if (hasFilter("phase")) {
      add(hasFilter("ability") ? "hero" : "ability");
    } else if (hasFilter("ability")) {
      add("phase");
    } else {
      add("ability");
      add("phase");
    }
  }
  if (dataset === "swap_impact" && dims.length === 0) {
    if (hasFilter("swap_count") || hasFilter("swap_count_bucket")) {
      // The count is already scoped exactly/thresholded; don't re-split it.
    } else if (
      hasFilter("had_swap") ||
      includesPhrase(normalized, "swap count") ||
      includesPhrase(normalized, "swap counts") ||
      includesPhrase(normalized, "swap bucket") ||
      includesPhrase(normalized, "swap buckets") ||
      includesPhrase(normalized, "how many swaps")
    ) {
      add("swap_count_bucket");
    } else {
      add("had_swap");
    }
  }
  if (dataset === "hero_pool" && dims.length === 0) {
    if (!hasFilter("hero")) add("hero");
  }
  if (dataset === "hero_diversity" && dims.length === 0) {
    add("role");
  }
  if (dataset === "hero_pickrate" && dims.length === 0) {
    if (!hasFilter("player")) add("player");
    if (!hasFilter("hero")) add("hero");
  }
  if (dataset === "hero_trend" && dims.length === 0) {
    if (
      includesPhrase(normalized, "which map") ||
      includesPhrase(normalized, "which maps") ||
      includesPhrase(normalized, "by map")
    ) {
      if (!hasFilter("map")) add("map");
    } else {
      if (!hasFilter("hero")) add("hero");
      if (includesPhrase(normalized, "by map type") && !hasFilter("map_type")) {
        add("map_type");
      }
    }
  }
  if (dataset === "player_intelligence" && dims.length === 0) {
    if (
      hasFilter("player") ||
      includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "which heroes") ||
      includesPhrase(normalized, "best hero") ||
      includesPhrase(normalized, "best heroes") ||
      includesPhrase(normalized, "by hero")
    ) {
      if (!hasFilter("hero")) add("hero");
    } else {
      if (!hasFilter("player")) add("player");
    }
  }
  if (dataset === "player_map_performance" && dims.length === 0) {
    if (!hasFilter("player")) add("player");
    if (!hasFilter("map")) add("map");
  }
  if (
    dataset === "player_impact" &&
    dims.length === 0 &&
    !hasFilter("player")
  ) {
    add("player");
  }
  if (dataset === "player_trend" && dims.length === 0) {
    if (
      hasFilter("player") ||
      includesPhrase(normalized, "what") ||
      includesPhrase(normalized, "which metric") ||
      includesPhrase(normalized, "which metrics") ||
      includesPhrase(normalized, "at")
    ) {
      add("metric");
    } else if (!hasFilter("player")) {
      add("player");
    }
  }
  if (dataset === "player_outlier" && dims.length === 0) {
    if (
      hasFilter("player") ||
      includesPhrase(normalized, "which stat") ||
      includesPhrase(normalized, "which stats") ||
      includesPhrase(normalized, "what stat") ||
      includesPhrase(normalized, "what stats")
    ) {
      add("stat");
    } else if (!hasFilter("player")) {
      add("player");
    }
  }
  if (dataset === "player_target" && dims.length === 0) {
    if (
      hasFilter("player") ||
      includesPhrase(normalized, "which stat") ||
      includesPhrase(normalized, "which stats") ||
      includesPhrase(normalized, "what stat") ||
      includesPhrase(normalized, "what stats")
    ) {
      add("stat");
    } else {
      if (!hasFilter("player")) add("player");
      if (
        includesPhrase(normalized, "target") ||
        includesPhrase(normalized, "targets") ||
        includesPhrase(normalized, "goal") ||
        includesPhrase(normalized, "goals") ||
        hasFilter("stat")
      ) {
        add("stat");
      } else if (
        includesPhrase(normalized, "status") ||
        includesPhrase(normalized, "on track") ||
        includesPhrase(normalized, "off track")
      ) {
        add("status");
      }
    }
  }
  if (
    dataset === "player_target" &&
    dims.length > 0 &&
    !dims.includes("stat") &&
    !hasFilter("player") &&
    (includesPhrase(normalized, "target") ||
      includesPhrase(normalized, "targets") ||
      includesPhrase(normalized, "goal") ||
      includesPhrase(normalized, "goals") ||
      hasFilter("stat"))
  ) {
    add("stat");
  }
  if (dataset === "role_performance" && dims.length === 0) {
    if (!hasFilter("role")) add("role");
  }
  if (
    dataset === "enemy_hero" &&
    dims.length === 0 &&
    !hasFilter("enemy_hero")
  ) {
    add("enemy_hero");
  }
  if (dataset === "ban_impact" && dims.length === 0 && !hasFilter("hero")) {
    add("hero");
  }
  if (dataset === "ult_combo" && dims.length === 0) {
    if (hasFilter("type") && filters.some((f) => f.value === "response")) {
      add("enemy_hero");
      add("response_hero");
    } else {
      add("combo");
    }
  }
  if (dataset === "role_trio" && dims.length === 0) add("trio");
  if (dataset === "roster_variant" && dims.length === 0) add("roster");
  if (dataset === "ult_impact" && dims.length === 0) {
    add(hasFilter("hero") ? "scenario" : "hero");
  }
  if (dataset === "ult_usage" && dims.length === 0) {
    const openingHeroRows = filters.some(
      (f) => f.field === "row_type" && f.value === "fight opening hero"
    );
    add(openingHeroRows ? "hero" : "player");
  }
  if (dataset === "streak" && dims.length === 0) {
    if (hasFilter("streak")) {
      add("result");
    } else {
      add("streak");
    }
  }
  if (dataset === "trend" && dims.length === 0) {
    if (
      includesPhrase(normalized, "weekly") ||
      includesPhrase(normalized, "by week") ||
      includesPhrase(normalized, "over time")
    ) {
      add("week");
    } else if (
      includesPhrase(normalized, "monthly") ||
      includesPhrase(normalized, "by month")
    ) {
      add("month");
    } else if (
      includesPhrase(normalized, "day of week") ||
      includesPhrase(normalized, "by day")
    ) {
      add("day_of_week");
    } else if (!hasFilter("recent_bucket")) {
      add("date");
    }
  }

  return dims.slice(0, 4);
}

function pickTimeScope(
  question: string,
  dataset: DatasetId
): QuerySpec["timeScope"] {
  const normalized = normalize(question);
  if (includesPhrase(normalized, "all scrims")) return { kind: "all" };
  const lastN = normalized.match(
    new RegExp(`\\b(?:last|past|recent)\\s+(${INTEGER_TOKEN})\\s+scrims?\\b`)
  );
  if (lastN) {
    const value = numberFromToken(lastN[1]);
    if (value != null) return { kind: "lastN", lastN: value };
  }
  if (dataset === "rotation_death") return { kind: "lastN", lastN: 5 };
  return { kind: "all" };
}

function pickSort(
  dataset: DatasetId,
  question: string,
  metrics: MetricRef[],
  dimensions: string[]
): QuerySpec["sort"] {
  if (dimensions.length === 0 || metrics.length === 0) return null;
  const normalized = normalize(question);
  if (
    !includesPhrase(normalized, "top") &&
    !includesPhrase(normalized, "most") &&
    !includesPhrase(normalized, "highest") &&
    !includesPhrase(normalized, "deepest") &&
    !includesPhrase(normalized, "thinnest") &&
    !includesPhrase(normalized, "best") &&
    !includesPhrase(normalized, "lowest") &&
    !includesPhrase(normalized, "worst") &&
    !includesPhrase(normalized, "fastest") &&
    !includesPhrase(normalized, "slowest") &&
    !includesPhrase(normalized, "one trick") &&
    !includesPhrase(normalized, "one-trick") &&
    !includesPhrase(normalized, "forced off") &&
    !includesPhrase(normalized, "improving") &&
    !includesPhrase(normalized, "increasing") &&
    !includesPhrase(normalized, "declining") &&
    !includesPhrase(normalized, "trending up") &&
    !includesPhrase(normalized, "trending down") &&
    !includesPhrase(normalized, "outlier") &&
    !includesPhrase(normalized, "outliers") &&
    !includesPhrase(normalized, "far above") &&
    !includesPhrase(normalized, "far below") &&
    !includesPhrase(normalized, "consistent") &&
    !includesPhrase(normalized, "volatile") &&
    !includesPhrase(normalized, "volatility") &&
    !(
      dataset === "hero_pickrate" &&
      (includesPhrase(normalized, "owns") ||
        includesPhrase(normalized, "ownership") ||
        includesPhrase(normalized, "owned by"))
    ) &&
    !(
      dataset === "ability_timing" &&
      (includesPhrase(normalized, "when should") ||
        includesPhrase(normalized, "when to use") ||
        includesPhrase(normalized, "best phase"))
    ) &&
    !(
      dataset === "opening_kill" &&
      (mentionsFirstPickAttribution(normalized) ||
        mentionsFirstDeathAttribution(normalized))
    )
  ) {
    return null;
  }
  const metric = getMetric(dataset, metrics[0].metric);
  const wantsHigh =
    includesPhrase(normalized, "top") ||
    includesPhrase(normalized, "most") ||
    includesPhrase(normalized, "highest") ||
    includesPhrase(normalized, "deepest") ||
    includesPhrase(normalized, "slowest") ||
    includesPhrase(normalized, "one trick") ||
    includesPhrase(normalized, "one-trick") ||
    includesPhrase(normalized, "forced off") ||
    includesPhrase(normalized, "improving") ||
    includesPhrase(normalized, "increasing") ||
    includesPhrase(normalized, "trending up") ||
    includesPhrase(normalized, "outlier") ||
    includesPhrase(normalized, "outliers") ||
    includesPhrase(normalized, "far above") ||
    includesPhrase(normalized, "far below") ||
    includesPhrase(normalized, "consistent") ||
    includesPhrase(normalized, "volatile") ||
    includesPhrase(normalized, "volatility") ||
    (dataset === "ability_timing" &&
      (includesPhrase(normalized, "when should") ||
        includesPhrase(normalized, "when to use") ||
        includesPhrase(normalized, "best phase"))) ||
    (dataset === "opening_kill" &&
      (mentionsFirstPickAttribution(normalized) ||
        mentionsFirstDeathAttribution(normalized))) ||
    (dataset === "hero_pickrate" &&
      (includesPhrase(normalized, "owns") ||
        includesPhrase(normalized, "ownership") ||
        includesPhrase(normalized, "owned by")));
  const wantsLow =
    includesPhrase(normalized, "lowest") ||
    includesPhrase(normalized, "thinnest") ||
    includesPhrase(normalized, "fastest") ||
    includesPhrase(normalized, "declining") ||
    includesPhrase(normalized, "trending down");
  const wantsBest = includesPhrase(normalized, "best");
  const wantsWorst = includesPhrase(normalized, "worst");
  const dir = wantsHigh
    ? "desc"
    : wantsLow
      ? "asc"
      : wantsBest
        ? metric?.lowerIsBetter
          ? "asc"
          : "desc"
        : wantsWorst
          ? metric?.lowerIsBetter
            ? "desc"
            : "asc"
          : metric?.lowerIsBetter
            ? "asc"
            : "desc";
  return { key: metricKey(metrics[0]), dir };
}

function pickLimit(question: string, sort: QuerySpec["sort"]): number | null {
  const normalized = normalize(question);
  const match = normalized.match(/\btop\s+(\d{1,3})\b/);
  if (match) return Number(match[1]);
  return sort ? DEFAULT_LIMIT : null;
}

export function planQueryFromQuestion({
  question,
  teamId,
}: PlannerInput): PlannedQuery | null {
  const trimmed = question.trim();
  if (!trimmed || teamId <= 0) return null;

  const dataset = pickDataset(trimmed);
  const metrics = pickMetrics(dataset, trimmed);
  const filters = pickFilters(dataset, trimmed);
  const dimensions = pickDimensions(dataset, trimmed, filters);
  const sort = pickSort(dataset, trimmed, metrics, dimensions);
  const limit = pickLimit(trimmed, sort);
  const spec = {
    dataset,
    teamId,
    metrics,
    dimensions,
    filters,
    timeScope: pickTimeScope(trimmed, dataset),
    sort,
    limit,
  } satisfies QuerySpec;

  const ds = getDataset(dataset);
  const metricLabels = metrics
    .map((ref) => getMetric(dataset, ref.metric)?.label ?? ref.metric)
    .join(", ");
  return {
    spec,
    summary: `Planned ${metricLabels} from ${ds.label.toLowerCase()}.`,
  };
}
