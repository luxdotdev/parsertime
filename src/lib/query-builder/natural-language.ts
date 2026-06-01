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
  kill: [
    "kill feed",
    "kill event",
    "kill events",
    "kills by",
    "killed by",
    "critical kill",
    "critical kills",
    "environmental kill",
    "environmental kills",
    "killing blow",
    "kill damage",
    "victim",
    "victims",
  ],
  hero_swap: [
    "hero swap",
    "hero swaps",
    "swap event",
    "swap events",
    "swapped from",
    "swapped off",
    "swapped to",
    "swapped onto",
    "swap from",
    "swap off",
    "swap to",
    "swap onto",
    "time before swap",
  ],
  ultimate: [
    "ultimate event",
    "ultimate events",
    "ult event",
    "ult events",
    "ultimate used",
    "ultimates used",
    "ults used",
    "raw ult",
    "raw ults",
    "raw ultimate",
    "raw ultimates",
  ],
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
    "our ult win rate",
    "our ultimate win rate",
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
    "ults per game",
    "ultimates per game",
    "ults per match",
    "ultimates per match",
    "most ults",
    "most ultimates",
    "fight opener",
    "fight openers",
    "open fights with ult",
    "opens fights with ult",
    "opening ult",
    "opening ultimate",
    "fight openings per map",
    "fight openings per game",
    "fight openings per match",
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
    "best roster for each map",
    "best rosters by map",
    "best lineup for each map",
    "best lineups by map",
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
    "map duration",
    "map durations",
    "average map duration",
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
    "high confidence maps",
    "low confidence maps",
    "medium confidence maps",
    "insufficient confidence maps",
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
    "player goal",
    "player goals",
    "target progress",
    "goal progress",
    "target change",
    "goal change",
    "progress toward target",
    "progress toward goal",
    "current value",
    "baseline value",
    "target value",
    "goal value",
    "scrim window",
    "target window",
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
    "primary heroes",
    "best hero",
    "best heroes",
    "most played hero",
    "most played heroes",
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
  kill_time: [
    "opening kill time",
    "average opening kill time",
    "opening kill timing",
  ],
  fight_time: [
    "time into fight",
    "average time into fight",
    "opening pick timing",
    "opening kill fight timing",
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
  average_time_to_use_ult: [
    "time to use ult",
    "time to use ultimate",
    "average time to use ult",
    "average time to use ultimate",
  ],
  drought_time: ["drought time", "average drought time"],
  average_drought_time: ["drought time", "average drought time"],
  kills_per_ult: [
    "kills per ult",
    "kills per ultimate",
    "elims per ult",
    "eliminations per ultimate",
  ],
  kills_per_ultimate: [
    "kills per ult",
    "kills per ultimate",
    "elims per ult",
    "eliminations per ultimate",
  ],
  duel_winrate: ["duel winrate", "duel win rate", "duel rate"],
  duel_winrate_percentage: ["duel winrate", "duel win rate", "duel rate"],
  fight_reversal: [
    "fight reversal",
    "fight reversal percentage",
    "fight reversal rate",
  ],
  time_played: ["time played", "playtime", "played it", "played them"],
  hero_time_played: ["time played", "playtime", "hero time played"],
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
  kills: ["kills", "kill count", "kill events"],
  critical_kills: ["critical kill", "critical kills", "headshot kills"],
  environmental_kills: [
    "environmental kill",
    "environmental kills",
    "boop kills",
    "booped kills",
  ],
  kill_damage: [
    "kill damage",
    "killing blow damage",
    "average kill damage",
    "average killing blow damage",
  ],
  swaps: ["swaps", "hero swaps", "swap events"],
  time_before_swap: [
    "time before swap",
    "time before swapping",
    "average time before swap",
    "average time before swapping",
  ],
  ultimates: [
    "ultimates",
    "ultimates used",
    "ults",
    "ults used",
    "ultimate events",
    "ult events",
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
    "map duration",
    "map durations",
    "average map duration",
    "most played",
    "most time",
    "played most",
    "played the most",
  ],
  ults_per_map: [
    "ults per map",
    "ultimates per map",
    "ults per game",
    "ultimates per game",
    "ults per match",
    "ultimates per match",
  ],
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
    "fight openings per game",
    "fight openings per match",
    "fight opener per map",
    "fight opener per game",
    "fight opener per match",
    "fight openers per map",
    "fight openers per game",
    "fight openers per match",
    "opening ults per map",
    "opening ults per game",
    "opening ults per match",
    "opening ultimates per map",
    "opening ultimates per game",
    "opening ultimates per match",
    "open fights with ult per map",
    "open fights with ult per game",
    "open fights with ult per match",
  ],
  avg_wasted_ults: ["wasted ult", "wasted ults", "wasted ultimates"],
  avg_swaps: [
    "avg swaps",
    "average swaps",
    "swaps per map",
    "average swaps per map",
  ],
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
  avg_advantage: [
    "average ult advantage",
    "avg ult advantage",
    "average ultimate advantage",
    "avg ultimate advantage",
    "average ult bank",
    "ult bank advantage",
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
  duels: ["duels", "duel count", "duel sample"],
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
  pre_fight_damage: [
    "pre fight damage",
    "pre-fight damage",
    "average pre fight damage",
    "average pre-fight damage",
  ],
  kill_distance: [
    "kill distance",
    "death distance",
    "average kill distance",
    "average death distance",
  ],
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
  target_percent: [
    "target percent",
    "target percentage",
    "target change",
    "target change percent",
    "target change percentage",
    "goal change",
    "goal change percent",
    "goal change percentage",
  ],
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
  opponent: ["opponent", "opponents"],
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
  victim: ["victim", "killed player"],
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
  "decrease",
  "each",
  "enemy",
  "every",
  "find",
  "for",
  "from",
  "goal",
  "goals",
  "has",
  "have",
  "he",
  "her",
  "hero",
  "heroes",
  "his",
  "i",
  "increase",
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
  "target",
  "targets",
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
    .replace(/(\d)\.(\d)/g, "$1DECIMALPOINT$2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/DECIMALPOINT/g, ".")
    .trim()
    .toLowerCase()
    .replace(/\bper ten(?: minutes?| mins?)?\b/g, "per 10");
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
const NON_HERO_ABILITY_ALIAS_WORDS = new Set(["charge"]);

const HERO_BY_NORMALIZED = new Map(
  allHeroes.flatMap((hero) => {
    const base = normalize(hero.name);
    const abilityAliases = [hero.ability1.name, hero.ability2.name].flatMap(
      (name) => {
        const normalized = normalize(name);
        if (NON_HERO_ABILITY_ALIAS_WORDS.has(normalized)) return [];
        return [
          normalized,
          ...normalized
            .split(/\s+/)
            .filter(
              (word) =>
                word.length > 3 &&
                !FILLER_WORDS.has(word) &&
                !NON_HERO_ABILITY_ALIAS_WORDS.has(word)
            ),
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

type AbilityMention = {
  ability: string;
  index: number;
  aliasLength: number;
};

type MapMention = {
  map: string;
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
  return findAbilityMentions(question)[0]?.ability ?? null;
}

function findAbilityMentions(question: string): AbilityMention[] {
  const normalized = normalize(question);
  const matches = Array.from(ABILITY_BY_NORMALIZED.entries())
    .map(([alias, ability]) => ({
      ability,
      index: findPhraseIndex(normalized, alias),
      aliasLength: alias.length,
    }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const seen = new Set<string>();
  const mentions: AbilityMention[] = [];
  for (const mention of matches) {
    if (seen.has(mention.ability)) continue;
    seen.add(mention.ability);
    mentions.push(mention);
  }
  return mentions;
}

function findMapName(question: string): string | null {
  return findMapMentions(question)[0]?.map ?? null;
}

function findMapMentions(question: string): MapMention[] {
  const normalized = normalize(question);
  const matches = Array.from(MAP_BY_NORMALIZED.entries())
    .map(([alias, map]) => ({
      map,
      index: findPhraseIndex(normalized, alias),
      aliasLength: alias.length,
    }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const seen = new Set<string>();
  const mentions: MapMention[] = [];
  for (const mention of matches) {
    if (seen.has(mention.map)) continue;
    seen.add(mention.map);
    mentions.push(mention);
  }
  return mentions;
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
    "ability",
    "abilities",
    "critical",
    "distance",
    "environmental",
    "scoped",
    "accuracy",
    "per",
    "progress",
    "improvement",
    "intelligence",
    "killing",
    "opening",
    "percentage",
    "percent",
    "status",
    "track",
    "rotation",
    "rotational",
    "game",
    "games",
    "sample",
    "size",
    "average",
    "avg",
    "time",
    "timing",
    "second",
    "seconds",
    "minute",
    "minutes",
    "rate",
    "rates",
    "win",
    "wins",
    "loss",
    "losses",
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
    ...question.matchAll(
      /\b(?:does|did)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:get|gets|kill|kills|killed)\b/gi
    ),
    ...question.matchAll(
      /\b(?:does|did)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:use|uses|used)\b/gi
    ),
    ...question.matchAll(
      /\b(?:does|did|has|have)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:play|played)\b/gi
    ),
    ...question.matchAll(
      /\bcompare\s+([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:final|blow|blows|death|deaths|elimination|eliminations|elim|elims|hero|all|damage|healing|scoped|accuracy|ult|ults|ultimate|ultimates|kill|kills|assist|assists)\b/gi
    ),
    ...question.matchAll(
      /\b([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:kill|kills|killed)\b/gi
    ),
    ...question.matchAll(
      /\b(?:kill|kills|killed)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\b/gi
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

const PLAYER_PARSE_STOP_WORDS = new Set([
  "opponent",
  "opponents",
  "enemy",
  "enemies",
  "them",
  "they",
  "versus",
  "compare",
  "scoped",
  "accuracy",
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
  "kill",
  "kills",
  "assist",
  "assists",
  "win",
  "wins",
  "rate",
  "rates",
]);

function parsePlayerList(value: string): string[] {
  const normalizedValue = value
    .replace(/\b(?:and|or)\b/gi, ",")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const players: string[] = [];
  for (const part of normalizedValue) {
    const match = part.match(/^[A-Za-z][A-Za-z0-9_.-]{1,}$/);
    if (!match) continue;
    const normalized = normalize(match[0]);
    if (
      FILLER_WORDS.has(normalized) ||
      PLAYER_PARSE_STOP_WORDS.has(normalized) ||
      HERO_BY_NORMALIZED.has(normalized) ||
      MAP_BY_NORMALIZED.has(normalized)
    )
      continue;
    const player =
      match[0] === match[0].toUpperCase() ? match[0] : titleCase(match[0]);
    if (!players.includes(player)) players.push(player);
  }
  return players;
}

function parsePlayerToken(value: string): string | null {
  const token = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9_.-]{1,}$/.test(token)) return null;
  const normalized = normalize(token);
  if (
    FILLER_WORDS.has(normalized) ||
    PLAYER_PARSE_STOP_WORDS.has(normalized) ||
    HERO_BY_NORMALIZED.has(normalized) ||
    MAP_BY_NORMALIZED.has(normalized)
  ) {
    return null;
  }
  return token === token.toUpperCase() ? token : titleCase(token);
}

function extractPlayerListAfter(
  question: string,
  starters: string[]
): string[] {
  const starter = starters.map(escapeRegExp).join("|");
  const pattern = new RegExp(
    `\\b(?:${starter})\\s+([A-Za-z0-9_.\\-,\\s]+?)(?=\\s+(?:on|in|for|by|per|against|versus|vs|when|where|over|across|with|without|excluding|except|but)\\b|[?.!]|$)`,
    "gi"
  );
  const players: string[] = [];
  for (const match of question.matchAll(pattern)) {
    for (const player of parsePlayerList(match[1])) {
      if (!players.includes(player)) players.push(player);
    }
  }
  return players;
}

function extractComparedPlayers(question: string): string[] {
  const normalized = normalize(question);
  const hasCompareContext =
    includesPhrase(normalized, "compare") ||
    includesPhrase(normalized, "comparison") ||
    includesPhrase(normalized, "between") ||
    includesPhrase(normalized, " vs ") ||
    includesPhrase(normalized, "versus");
  if (!hasCompareContext) return [];

  const players: string[] = [];
  const add = (player: string | null) => {
    if (player && !players.includes(player)) players.push(player);
  };
  const playerToken = "[A-Za-z][A-Za-z0-9_.-]{1,}";
  const metricBoundary =
    "final\\s+blows?|deaths?|eliminations?|elims?|damage|healing|accuracy|ults?|ultimates?|kills?|assists?|stats?|win\\s+rates?|winrates?";

  const listPatterns = [
    new RegExp(
      `\\bcompare\\s+(.+?)(?=\\s+(?:on|in|for|by|per|with|without|over|under|above|below|at|when|where|across|${metricBoundary})\\b|[?.!]|$)`,
      "i"
    ),
    new RegExp(
      `\\bfor\\s+(.+?)(?=\\s+(?:on|in|by|per|with|without|over|under|above|below|at|when|where|across|${metricBoundary})\\b|[?.!]|$)`,
      "i"
    ),
  ];
  for (const pattern of listPatterns) {
    const match = question.match(pattern);
    if (!match) continue;
    for (const player of parsePlayerList(match[1])) add(player);
  }

  for (const match of question.matchAll(
    new RegExp(
      `\\b(${playerToken})\\s+(?:and|vs|versus|against)\\s+(${playerToken})\\b`,
      "gi"
    )
  )) {
    add(parsePlayerToken(match[1]));
    add(parsePlayerToken(match[2]));
  }

  const between = question.match(
    new RegExp(
      `\\bbetween\\s+(${playerToken})\\s+and\\s+(${playerToken})\\b`,
      "i"
    )
  );
  if (between) {
    add(parsePlayerToken(between[1]));
    add(parsePlayerToken(between[2]));
  }

  return players.length >= 2 ? players : [];
}

function extractLineupPlayerFilters(question: string): QueryFilter[] {
  const includePlayers = extractPlayerListAfter(question, [
    "with",
    "alongside",
    "including",
    "featuring",
  ]);
  const excludePlayers = extractPlayerListAfter(question, [
    "without",
    "excluding",
    "except",
    "minus",
  ]);

  const filters: QueryFilter[] = [];
  for (const player of includePlayers) {
    filters.push({ field: "player", op: "eq", value: player });
  }
  for (const player of excludePlayers) {
    filters.push({ field: "player", op: "neq", value: player });
  }
  return filters;
}

function asksBestRosterForEachMap(normalized: string): boolean {
  return (
    (includesPhrase(normalized, "best roster") ||
      includesPhrase(normalized, "best rosters") ||
      includesPhrase(normalized, "top roster") ||
      includesPhrase(normalized, "top rosters") ||
      includesPhrase(normalized, "best lineup") ||
      includesPhrase(normalized, "best lineups")) &&
    (includesPhrase(normalized, "for each map") ||
      includesPhrase(normalized, "for every map") ||
      includesPhrase(normalized, "by map") ||
      includesPhrase(normalized, "per map") ||
      includesPhrase(normalized, "on each map") ||
      includesPhrase(normalized, "on every map"))
  );
}

function formatEntityName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed === trimmed.toUpperCase() ? trimmed : titleCase(trimmed);
}

function findOpponent(question: string): string | null {
  return findOpponents(question)[0] ?? null;
}

function findOpponents(question: string): string[] {
  const match = question.match(
    /\b(?:against|vs|versus)\s+([A-Za-z0-9][A-Za-z0-9_.&' -]*?)(?=\s+(?:on|by|per|with|in|over|for|across|when|where)\b|[?.!,]|$)/i
  );
  if (!match) return [];

  const opponents: string[] = [];
  const parts = match[1]
    .replace(/\b(?:and|or)\b/gi, ",")
    .split(",")
    .map((part) => formatEntityName(part))
    .filter(Boolean);
  for (const opponent of parts) {
    const normalized = normalize(opponent);
    if (
      FILLER_WORDS.has(normalized) ||
      HERO_BY_NORMALIZED.has(normalized) ||
      MAP_BY_NORMALIZED.has(normalized)
    ) {
      continue;
    }
    if (!opponents.includes(opponent)) opponents.push(opponent);
  }
  return opponents;
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
    ((includesPhrase(normalized, "confidence") ||
      includesPhrase(normalized, "confident") ||
      includesPhrase(normalized, "thin sample") ||
      includesPhrase(normalized, "small sample") ||
      includesPhrase(normalized, "not enough data")) &&
      (includesPhrase(normalized, "map") ||
        includesPhrase(normalized, "maps"))) ||
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
      /\b(?:compared|relative)\s+to\s+(?:the\s+)?(?:time|playtime|time\s+played|minutes?\s+played|seconds?\s+played|hours?\s+played)\b/.test(
        normalized
      ) ||
      /\b(?:normalized|normalised|adjusted)\s+(?:by|for|to)\s+(?:the\s+)?(?:time|playtime|time\s+played|minutes?\s+played|seconds?\s+played|hours?\s+played)\b/.test(
        normalized
      ) ||
      includesPhrase(normalized, "relative to time") ||
      includesPhrase(normalized, "relative to playtime") ||
      includesPhrase(normalized, "compared to playtime") ||
      includesPhrase(normalized, "versus playtime") ||
      includesPhrase(normalized, "vs playtime")) &&
    (includesPhrase(normalized, "time played") ||
      includesPhrase(normalized, "playtime") ||
      includesPhrase(normalized, "minutes played") ||
      includesPhrase(normalized, "minute played") ||
      includesPhrase(normalized, "seconds played") ||
      includesPhrase(normalized, "second played") ||
      includesPhrase(normalized, "hours played") ||
      includesPhrase(normalized, "hour played") ||
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
    includesPhrase(normalized, "gap to target") ||
    includesPhrase(normalized, "gap to goal") ||
    includesPhrase(normalized, "target progress") ||
    includesPhrase(normalized, "goal progress") ||
    includesPhrase(normalized, "progress toward target") ||
    includesPhrase(normalized, "progress toward goal") ||
    includesPhrase(normalized, "current value") ||
    includesPhrase(normalized, "baseline value") ||
    includesPhrase(normalized, "target value") ||
    includesPhrase(normalized, "goal value") ||
    includesPhrase(normalized, "target percent") ||
    includesPhrase(normalized, "target percentage") ||
    includesPhrase(normalized, "target change") ||
    includesPhrase(normalized, "goal change") ||
    includesPhrase(normalized, "scrim window") ||
    includesPhrase(normalized, "target window") ||
    includesPhrase(normalized, "sample scrims") ||
    includesPhrase(normalized, "scrim sample") ||
    includesPhrase(normalized, "saved target") ||
    includesPhrase(normalized, "saved goal") ||
    includesPhrase(normalized, "on track") ||
    includesPhrase(normalized, "off track") ||
    includesPhrase(normalized, "stalled target") ||
    includesPhrase(normalized, "stalled goal") ||
    ((includesPhrase(normalized, "goal") ||
      includesPhrase(normalized, "goals") ||
      includesPhrase(normalized, "target") ||
      includesPhrase(normalized, "targets")) &&
      (includesPhrase(normalized, "progress") ||
        includesPhrase(normalized, "gap") ||
        includesPhrase(normalized, "status") ||
        includesPhrase(normalized, "value") ||
        includesPhrase(normalized, "change") ||
        includesPhrase(normalized, "toward") ||
        includesPhrase(normalized, "away") ||
        includesPhrase(normalized, "moving") ||
        includesPhrase(normalized, "increase") ||
        includesPhrase(normalized, "decrease") ||
        includesPhrase(normalized, "reduce") ||
        includesPhrase(normalized, "lower") ||
        includesPhrase(normalized, "window") ||
        includesPhrase(normalized, "sampled") ||
        includesPhrase(normalized, "scrims")))
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
    includesPhrase(normalized, "ownership") ||
    includesPhrase(normalized, "ownership rate") ||
    includesPhrase(normalized, "owns our") ||
    includesPhrase(normalized, "owned by") ||
    includesPhrase(normalized, "player hero share") ||
    includesPhrase(normalized, "hero pool share") ||
    ((includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "which heroes")) &&
      includesPhrase(normalized, "played") &&
      (includesPhrase(normalized, "map") ||
        includesPhrase(normalized, "maps") ||
        includesPhrase(normalized, "game") ||
        includesPhrase(normalized, "games")))
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

function mentionsHeroSliceStatContext(normalized: string): boolean {
  const heroSlice =
    includesPhrase(normalized, "which hero") ||
    includesPhrase(normalized, "which heroes") ||
    includesPhrase(normalized, "what hero") ||
    includesPhrase(normalized, "what heroes") ||
    includesPhrase(normalized, "hero stats") ||
    includesPhrase(normalized, "hero stat") ||
    ["tank", "damage", "support"].some((role) =>
      includesPhrase(normalized, `${role} heroes`)
    );
  const statMetric =
    includesPhrase(normalized, "final blow") ||
    includesPhrase(normalized, "final blows") ||
    includesPhrase(normalized, "finals") ||
    includesPhrase(normalized, "eliminations") ||
    includesPhrase(normalized, "elims") ||
    includesPhrase(normalized, "death") ||
    includesPhrase(normalized, "deaths") ||
    includesPhrase(normalized, "assists") ||
    includesPhrase(normalized, "damage") ||
    includesPhrase(normalized, "healing") ||
    includesPhrase(normalized, "heals") ||
    includesPhrase(normalized, "time played") ||
    includesPhrase(normalized, "playtime") ||
    includesPhrase(normalized, "ultimates") ||
    includesPhrase(normalized, "ults") ||
    includesPhrase(normalized, "per 10") ||
    includesPhrase(normalized, "final blows per death") ||
    includesPhrase(normalized, "kd");

  return heroSlice && statMetric;
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

function mentionsRawKillEventContext(normalized: string): boolean {
  if (mentionsOpeningKillContext(normalized)) return false;
  return (
    includesPhrase(normalized, "kill feed") ||
    includesPhrase(normalized, "kill event") ||
    includesPhrase(normalized, "kill events") ||
    includesPhrase(normalized, "critical kill") ||
    includesPhrase(normalized, "critical kills") ||
    includesPhrase(normalized, "environmental kill") ||
    includesPhrase(normalized, "environmental kills") ||
    includesPhrase(normalized, "killing blow") ||
    includesPhrase(normalized, "kill damage") ||
    includesPhrase(normalized, "kills by ability") ||
    includesPhrase(normalized, "kills per ability") ||
    /\bwho\s+(?:kill|kills|killed)\b/.test(normalized) ||
    /\bwho\s+(?:did|does|has|have)\b.*\b(?:kill|kills|killed)\b/.test(
      normalized
    ) ||
    /\b(?:kills?|killed)\s+(?:by|with)\b/.test(normalized)
  );
}

function asksKillVictim(normalized: string): boolean {
  return (
    includesPhrase(normalized, "victim") ||
    includesPhrase(normalized, "victims") ||
    /\bwho\s+(?:did|does|has|have)\b.*\b(?:kill|kills|killed)\b/.test(
      normalized
    ) ||
    /\bwhich\s+heroes?\s+(?:did|does|has|have)\b.*\b(?:kill|kills|killed)\b/.test(
      normalized
    )
  );
}

function isKillVictimPlayerContext(
  normalized: string,
  player: string
): boolean {
  const escapedPlayer = escapeRegExp(normalize(player));
  return (
    new RegExp(`\\b(?:kill|kills|killed)\\s+${escapedPlayer}\\b`).test(
      normalized
    ) ||
    new RegExp(
      `\\b${escapedPlayer}\\s+(?:is|was|gets?|got)?\\s*killed\\b`
    ).test(normalized)
  );
}

function mentionsRawHeroSwapEventContext(normalized: string): boolean {
  if (
    includesPhrase(normalized, "swap impact") ||
    includesPhrase(normalized, "swap win rate") ||
    includesPhrase(normalized, "swap winrate") ||
    includesPhrase(normalized, "too many swaps") ||
    includesPhrase(normalized, "when we swap") ||
    includesPhrase(normalized, "when swapping")
  ) {
    return false;
  }

  return (
    includesPhrase(normalized, "hero swap") ||
    includesPhrase(normalized, "hero swaps") ||
    includesPhrase(normalized, "swap event") ||
    includesPhrase(normalized, "swap events") ||
    includesPhrase(normalized, "time before swap") ||
    includesPhrase(normalized, "time before swapping") ||
    /\bswapp?ed\s+(?:from|off|to|onto|into)\b/.test(normalized) ||
    /\bswaps?\s+(?:from|off|to|onto|into)\b/.test(normalized)
  );
}

function mentionsRawUltimateEventContext(normalized: string): boolean {
  if (
    includesPhrase(normalized, "ult impact") ||
    includesPhrase(normalized, "ultimate impact") ||
    includesPhrase(normalized, "ult economy") ||
    includesPhrase(normalized, "ultimate economy") ||
    includesPhrase(normalized, "ult advantage") ||
    includesPhrase(normalized, "ultimate advantage") ||
    includesPhrase(normalized, "ult combo") ||
    includesPhrase(normalized, "ultimate combo") ||
    includesPhrase(normalized, "counter ult") ||
    includesPhrase(normalized, "counter ultimate") ||
    includesPhrase(normalized, "fight opener") ||
    includesPhrase(normalized, "fight openers") ||
    includesPhrase(normalized, "opening ult") ||
    includesPhrase(normalized, "opening ultimate") ||
    includesPhrase(normalized, "first ult") ||
    includesPhrase(normalized, "first ultimate") ||
    includesPhrase(normalized, "wasted ult") ||
    includesPhrase(normalized, "wasted ultimate") ||
    mentionsFightContext(normalized)
  ) {
    return false;
  }

  const explicitRawOrEvent =
    includesPhrase(normalized, "ultimate event") ||
    includesPhrase(normalized, "ultimate events") ||
    includesPhrase(normalized, "ult event") ||
    includesPhrase(normalized, "ult events") ||
    includesPhrase(normalized, "raw ult") ||
    includesPhrase(normalized, "raw ults") ||
    includesPhrase(normalized, "raw ultimate") ||
    includesPhrase(normalized, "raw ultimates");
  const namedPlayerUsage =
    /\b(?:did|does)\s+[a-z0-9_.-]+\s+(?:use|uses|used)\b/.test(normalized) ||
    /\bby\s+(?!role\b|roles\b|hero\b|heroes\b|player\b|players\b|map\b|maps\b|type\b|mode\b)[a-z0-9_.-]+\b/.test(
      normalized
    );

  return (
    explicitRawOrEvent ||
    (includesPhrase(normalized, "ultimates used") && namedPlayerUsage) ||
    (includesPhrase(normalized, "ults used") && namedPlayerUsage)
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
    /\b(?:ahead|behind|even|up|down)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    ) ||
    /\b(?:ult|ults|ultimate|ultimates)\b.*\b(?:ahead|behind|even|up|down)\b/.test(
      normalized
    )
  );
}

function mentionsOurUltSide(normalized: string): boolean {
  return (
    includesPhrase(normalized, "our ult") ||
    includesPhrase(normalized, "our ults") ||
    includesPhrase(normalized, "our ultimate") ||
    includesPhrase(normalized, "our ultimates") ||
    includesPhrase(normalized, "we ult") ||
    includesPhrase(normalized, "we ults") ||
    includesPhrase(normalized, "we ulted") ||
    includesPhrase(normalized, "we use ult") ||
    includesPhrase(normalized, "we use ults") ||
    includesPhrase(normalized, "we use ultimate") ||
    includesPhrase(normalized, "we use ultimates") ||
    includesPhrase(normalized, "we used ult") ||
    includesPhrase(normalized, "we used ults") ||
    includesPhrase(normalized, "we used ultimate") ||
    includesPhrase(normalized, "we used ultimates") ||
    /\bwe\s+(?:use|used)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    )
  );
}

function mentionsEnemyUltSide(normalized: string): boolean {
  return (
    includesPhrase(normalized, "enemy ult") ||
    includesPhrase(normalized, "enemy ults") ||
    includesPhrase(normalized, "enemy ultimate") ||
    includesPhrase(normalized, "enemy ultimates") ||
    includesPhrase(normalized, "their ult") ||
    includesPhrase(normalized, "their ults") ||
    includesPhrase(normalized, "their ultimate") ||
    includesPhrase(normalized, "their ultimates") ||
    includesPhrase(normalized, "they ult") ||
    includesPhrase(normalized, "they ulted") ||
    /\benemy\s+ults?\b/.test(normalized)
  );
}

function mentionsUltSideComparison(normalized: string): boolean {
  return (
    mentionsOurUltSide(normalized) &&
    mentionsEnemyUltSide(normalized) &&
    (includesPhrase(normalized, "compare") ||
      includesPhrase(normalized, "comparison") ||
      includesPhrase(normalized, "versus") ||
      includesPhrase(normalized, "vs") ||
      includesPhrase(normalized, "compared to"))
  );
}

function mentionsWithWithoutBanComparison(normalized: string): boolean {
  const mentionsBan =
    includesPhrase(normalized, "ban") ||
    includesPhrase(normalized, "bans") ||
    includesPhrase(normalized, "banned") ||
    includesPhrase(normalized, "available");

  return (
    mentionsBan &&
    (includesPhrase(normalized, "with and without") ||
      includesPhrase(normalized, "with vs without") ||
      includesPhrase(normalized, "with versus without") ||
      includesPhrase(normalized, "banned vs available") ||
      includesPhrase(normalized, "banned versus available") ||
      includesPhrase(normalized, "available vs banned") ||
      includesPhrase(normalized, "available versus banned"))
  );
}

function mentionsEnemyRoleMatchupContext(normalized: string): boolean {
  const mentionsEnemyRole = ["tank", "damage", "support"].some((role) => {
    return (
      includesPhrase(normalized, `${role} heroes`) ||
      includesPhrase(normalized, `${role} hero`) ||
      includesPhrase(normalized, `enemy ${role}`) ||
      includesPhrase(normalized, `enemy ${role} heroes`) ||
      includesPhrase(normalized, `enemy ${role} hero`) ||
      includesPhrase(normalized, `against ${role}`) ||
      includesPhrase(normalized, `versus ${role}`) ||
      includesPhrase(normalized, `vs ${role}`)
    );
  });
  if (!mentionsEnemyRole) return false;

  return (
    includesPhrase(normalized, "enemy") ||
    includesPhrase(normalized, "against") ||
    includesPhrase(normalized, "versus") ||
    includesPhrase(normalized, "vs") ||
    includesPhrase(normalized, "matchup") ||
    includesPhrase(normalized, "matchups")
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
    includesPhrase(normalized, "primary hero") ||
    includesPhrase(normalized, "primary heroes") ||
    includesPhrase(normalized, "most played hero") ||
    includesPhrase(normalized, "most played heroes") ||
    includesPhrase(normalized, "most-played hero") ||
    includesPhrase(normalized, "most-played heroes") ||
    includesPhrase(normalized, "non primary") ||
    includesPhrase(normalized, "non-primary") ||
    includesPhrase(normalized, "secondary hero") ||
    includesPhrase(normalized, "secondary heroes") ||
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
  const mentionsUlt =
    includesPhrase(normalized, "ult") ||
    includesPhrase(normalized, "ults") ||
    includesPhrase(normalized, "ultimate") ||
    includesPhrase(normalized, "ultimates");
  if (
    mentionsUlt &&
    (includesPhrase(normalized, "ult impact") ||
      includesPhrase(normalized, "ultimate impact") ||
      mentionsUltSideComparison(normalized) ||
      ((includesPhrase(normalized, "which heroes") ||
        includesPhrase(normalized, "which hero")) &&
        (includesPhrase(normalized, "ult win rate") ||
          includesPhrase(normalized, "ultimate win rate"))))
  ) {
    return "ult_impact";
  }
  if (mentionsRawHeroSwapEventContext(normalized)) {
    return "hero_swap";
  }
  if (mentionsUlt && mentionsRawUltimateEventContext(normalized)) {
    return "ultimate";
  }
  if (mentionsEnemyRoleMatchupContext(normalized)) {
    return "enemy_hero";
  }
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
    !mentionsUlt &&
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
  if (
    mentionsFightContext(normalized) &&
    (includesPhrase(normalized, "win rate") ||
      includesPhrase(normalized, "winrate") ||
      includesPhrase(normalized, "wins") ||
      includesPhrase(normalized, "losses")) &&
    (includesPhrase(normalized, "first pick") ||
      includesPhrase(normalized, "opening pick") ||
      includesPhrase(normalized, "first kill") ||
      includesPhrase(normalized, "opening kill") ||
      includesPhrase(normalized, "first death") ||
      includesPhrase(normalized, "opening death") ||
      includesPhrase(normalized, "first ult") ||
      includesPhrase(normalized, "first ultimate") ||
      includesPhrase(normalized, "opening ult") ||
      includesPhrase(normalized, "opening ultimate"))
  ) {
    return "teamfight";
  }
  if (mentionsRawKillEventContext(normalized)) return "kill";
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
  if (mentionsHeroSliceStatContext(normalized)) return "hero_pool";
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

  if (mentionsUlt && pickUltImpactScenario(normalized)) {
    return "ult_impact";
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
    mentionsFightContext(normalized) &&
    (includesPhrase(normalized, "win rate") ||
      includesPhrase(normalized, "winrate") ||
      includesPhrase(normalized, "wins") ||
      includesPhrase(normalized, "losses"))
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

function mentionsStandaloneLeast(normalized: string): boolean {
  for (const match of normalized.matchAll(/\bleast\b/g)) {
    const index = match.index ?? 0;
    const before = normalized.slice(Math.max(0, index - 3), index);
    if (before === "at ") continue;

    const after = normalized.slice(index + "least".length).trimStart();
    if (
      new RegExp(`^(?:${INTEGER_TOKEN}|\\d+)\\b`).test(after) ||
      after.startsWith("minute") ||
      after.startsWith("second") ||
      after.startsWith("map") ||
      after.startsWith("game") ||
      after.startsWith("scrim")
    ) {
      continue;
    }

    return true;
  }

  return false;
}

function mentionsLowRankingIntent(normalized: string): boolean {
  return (
    includesPhrase(normalized, "lowest") ||
    mentionsStandaloneLeast(normalized) ||
    includesPhrase(normalized, "fewest") ||
    includesPhrase(normalized, "bottom") ||
    includesPhrase(normalized, "thinnest") ||
    includesPhrase(normalized, "fastest") ||
    includesPhrase(normalized, "declining") ||
    includesPhrase(normalized, "trending down")
  );
}

function mentionsHighRankingIntent(normalized: string): boolean {
  return (
    includesPhrase(normalized, "top") ||
    includesPhrase(normalized, "most") ||
    includesPhrase(normalized, "highest") ||
    includesPhrase(normalized, "leader") ||
    includesPhrase(normalized, "leaders") ||
    includesPhrase(normalized, "leaderboard") ||
    includesPhrase(normalized, "leads") ||
    includesPhrase(normalized, "lead in") ||
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
    includesPhrase(normalized, "volatility")
  );
}

function mentionsRankingIntent(normalized: string): boolean {
  return (
    mentionsHighRankingIntent(normalized) ||
    mentionsLowRankingIntent(normalized) ||
    includesPhrase(normalized, "rank") ||
    includesPhrase(normalized, "ranked") ||
    includesPhrase(normalized, "ranking") ||
    includesPhrase(normalized, "best") ||
    includesPhrase(normalized, "worst")
  );
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
      includesPhrase(normalized, "hero baseline") ||
      includesPhrase(normalized, "far above") ||
      includesPhrase(normalized, "far below") ||
      includesPhrase(normalized, "above baseline") ||
      includesPhrase(normalized, "below baseline"))
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "baseline_per10") deduped.splice(i, 1);
    }
    const hasSpecificOutlierMetric = deduped.some((ref) =>
      ["z_score", "percentile", "per10_value"].includes(ref.metric)
    );
    if (hasSpecificOutlierMetric) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "abs_z_score") deduped.splice(i, 1);
      }
    }
    if (
      !hasSpecificOutlierMetric &&
      !deduped.some((ref) => ref.metric === "abs_z_score")
    ) {
      const agg = pickMetricAgg(dataset, "abs_z_score", question);
      if (agg) deduped.unshift({ metric: "abs_z_score", agg });
    }
    deduped.sort((a, b) =>
      a.metric === "abs_z_score" ? -1 : b.metric === "abs_z_score" ? 1 : 0
    );
  }
  if (dataset === "player_target") {
    const hasPrimaryTargetMetric = deduped.some(
      (ref) => !["sample_scrims", "scrim_window"].includes(ref.metric)
    );
    if (hasPrimaryTargetMetric) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (["sample_scrims", "scrim_window"].includes(deduped[i].metric)) {
          deduped.splice(i, 1);
        }
      }
    }
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
  if (dataset === "opening_kill") {
    const wantsOpeningRanking =
      includesPhrase(normalized, "most") ||
      includesPhrase(normalized, "top") ||
      includesPhrase(normalized, "highest") ||
      includesPhrase(normalized, "worst");
    const priority = wantsOpeningRanking
      ? mentionsFirstPickAttribution(normalized)
        ? "first_picks"
        : mentionsFirstDeathAttribution(normalized)
          ? "first_deaths"
          : null
      : null;
    if (priority) {
      deduped.sort((a, b) =>
        a.metric === priority ? -1 : b.metric === priority ? 1 : 0
      );
    }
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
    !hasAverageRotationSignalIntent(normalized) &&
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
    dataset === "rotation_death" &&
    hasAverageRotationSignalIntent(normalized)
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "rotation_deaths" && deduped.length > 1) {
        deduped.splice(i, 1);
      }
    }
    const priority =
      includesPhrase(normalized, "kill distance") ||
      includesPhrase(normalized, "death distance")
        ? "kill_distance"
        : includesPhrase(normalized, "pre fight damage") ||
            includesPhrase(normalized, "pre-fight damage")
          ? "pre_fight_damage"
          : null;
    if (priority) {
      deduped.sort((a, b) =>
        a.metric === priority ? -1 : b.metric === priority ? 1 : 0
      );
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
    dataset === "ban_impact" &&
    mentionsWithWithoutBanComparison(normalized)
  ) {
    for (const metric of [
      "win_rate_with",
      "win_rate_without",
      "win_rate_delta",
    ]) {
      const agg = pickMetricAgg(dataset, metric, question);
      if (agg && !deduped.some((ref) => ref.metric === metric)) {
        deduped.push({ metric, agg });
      }
    }
    deduped.sort((a, b) => {
      const priority = ["win_rate_with", "win_rate_without", "win_rate_delta"];
      return priority.indexOf(a.metric) - priority.indexOf(b.metric);
    });
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
  if (
    dataset === "ult_usage" &&
    (includesPhrase(normalized, "per map") ||
      includesPhrase(normalized, "per game") ||
      includesPhrase(normalized, "per match"))
  ) {
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
    dataset === "ult_economy" &&
    deduped.some((ref) => ref.metric === "avg_advantage") &&
    (includesPhrase(normalized, "average ult advantage") ||
      includesPhrase(normalized, "avg ult advantage") ||
      includesPhrase(normalized, "average ultimate advantage") ||
      includesPhrase(normalized, "avg ultimate advantage") ||
      includesPhrase(normalized, "average ult bank") ||
      includesPhrase(normalized, "ult bank advantage"))
  ) {
    deduped.sort((a, b) =>
      a.metric === "avg_advantage" ? -1 : b.metric === "avg_advantage" ? 1 : 0
    );
  }
  if (
    dataset === "streak" &&
    (includesPhrase(normalized, "streak length") ||
      includesPhrase(normalized, "games long") ||
      includesPhrase(normalized, "maps long"))
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "streaks") deduped.splice(i, 1);
    }
    if (!deduped.some((ref) => ref.metric === "length")) {
      const agg = pickMetricAgg(dataset, "length", question);
      if (agg) deduped.unshift({ metric: "length", agg });
    }
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
    const wantsDuelSample =
      includesPhrase(normalized, "duels") &&
      (includesPhrase(normalized, "at least") ||
        includesPhrase(normalized, "minimum") ||
        includesPhrase(normalized, "min") ||
        includesPhrase(normalized, "more than") ||
        includesPhrase(normalized, "over") ||
        includesPhrase(normalized, "at most") ||
        includesPhrase(normalized, "maximum") ||
        includesPhrase(normalized, "under"));
    const wantsCount =
      includesPhrase(normalized, "how many") ||
      includesPhrase(normalized, "number") ||
      includesPhrase(normalized, "count") ||
      includesPhrase(normalized, "total") ||
      wantsDuelSample;
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
    | "from_hero"
    | "to_hero"
    | "victim"
    | "used"
    | "had_swap"
    | "first_swap_timing"
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
    from_hero: ["from_hero"],
    to_hero: ["to_hero"],
    victim: ["victim"],
    used: ["used"],
    had_swap: ["had_swap"],
    first_swap_timing: ["first_swap_timing"],
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

function heroMentionHasPrefix(
  normalized: string,
  mention: HeroMention,
  prefixes: RegExp[]
): boolean {
  const before = normalized.slice(
    Math.max(0, mention.index - 32),
    mention.index
  );
  return prefixes.some((prefix) => prefix.test(before));
}

function pickHeroSwapHeroFilters(
  heroMentions: HeroMention[],
  question: string
): QueryFilter[] {
  const filters: QueryFilter[] = [];
  if (heroMentions.length === 0) return filters;

  const normalized = normalize(question);
  const fromHeroes = heroMentions
    .filter((mention) =>
      heroMentionHasPrefix(normalized, mention, [
        /\bfrom\s+$/,
        /\boff\s+$/,
        /\boff\s+of\s+$/,
      ])
    )
    .map((mention) => mention.hero);
  const toHeroes = heroMentions
    .filter((mention) =>
      heroMentionHasPrefix(normalized, mention, [
        /\bto\s+$/,
        /\bonto\s+$/,
        /\binto\s+$/,
      ])
    )
    .map((mention) => mention.hero);

  if (fromHeroes.length > 0) {
    filters.push({ field: "from_hero", op: "in", value: fromHeroes });
  }
  if (toHeroes.length > 0) {
    filters.push({ field: "to_hero", op: "in", value: toHeroes });
  }

  if (filters.length === 0 && heroMentions.length === 1) {
    const kind =
      includesPhrase(normalized, "swapped from") ||
      includesPhrase(normalized, "swap from") ||
      includesPhrase(normalized, "swapped off") ||
      includesPhrase(normalized, "swap off")
        ? "from_hero"
        : "to_hero";
    filters.push({ field: kind, op: "in", value: [heroMentions[0].hero] });
  }

  return filters;
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
    (filter) =>
      filter.id === "min_time_played" ||
      filter.id === "time_played" ||
      filter.id === "playtime"
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

function extractNumericThresholdFilters(
  dataset: DatasetId,
  normalized: string,
  fields: {
    field: string;
    aliases: string[];
    coerceValue?: (value: number) => number;
  }[]
): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const number = `(${NUMBER_TOKEN})(?:st|nd|rd|th)?`;
  const percent = "\\s*(?:%|percent|percentage)?";
  const seen = new Set<string>();

  for (const { field, aliases, coerceValue } of fields) {
    const def = getDataset(dataset).filters.find(
      (filter) => filter.id === field
    );
    if (!def) continue;

    const aliasPattern = aliases
      .map((alias) => normalize(alias))
      .filter(Boolean)
      .map(escapeRegExp)
      .join("|");
    if (!aliasPattern) continue;

    const patterns: [RegExp, QueryFilter["op"]][] = [
      [
        new RegExp(
          `\\b(?:at\\s+least|minimum|min|no\\s+less\\s+than)\\s+${number}${percent}\\s+(?:${aliasPattern})\\b`
        ),
        "gte",
      ],
      [
        new RegExp(
          `\\b(?:more\\s+than|over|above|greater\\s+than)\\s+${number}${percent}\\s+(?:${aliasPattern})\\b`
        ),
        "gt",
      ],
      [
        new RegExp(
          `\\b(?:at\\s+most|maximum|max|up\\s+to|no\\s+more\\s+than)\\s+${number}${percent}\\s+(?:${aliasPattern})\\b`
        ),
        "lte",
      ],
      [
        new RegExp(
          `\\b(?:less\\s+than|under|below)\\s+${number}${percent}\\s+(?:${aliasPattern})\\b`
        ),
        "lt",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:at\\s+least|minimum|min|no\\s+less\\s+than)\\s+${number}${percent}\\b`
        ),
        "gte",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:more\\s+than|over|above|greater\\s+than)\\s+${number}${percent}\\b`
        ),
        "gt",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:at\\s+most|maximum|max|up\\s+to|no\\s+more\\s+than)\\s+${number}${percent}\\b`
        ),
        "lte",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:less\\s+than|under|below)\\s+${number}${percent}\\b`
        ),
        "lt",
      ],
    ];

    for (const [pattern, op] of patterns) {
      if (!def.operators.includes(op)) continue;
      const match = normalized.match(pattern);
      if (!match) continue;
      const parsedValue = numberFromToken(match[1]);
      if (parsedValue == null) continue;
      const value = coerceValue ? coerceValue(parsedValue) : parsedValue;
      const key = `${field}:${op}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      filters.push({ field, op, value });
      break;
    }
  }

  return filters;
}

function extractDurationThresholdFilters(
  dataset: DatasetId,
  normalized: string,
  fields: { field: string; aliases: string[] }[]
): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const duration = `(${NUMBER_TOKEN})`;
  const unit = "(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)";
  const seen = new Set<string>();

  for (const { field, aliases } of fields) {
    const def = getDataset(dataset).filters.find(
      (filter) => filter.id === field
    );
    if (!def) continue;

    const aliasPattern = aliases
      .map((alias) => normalize(alias))
      .filter(Boolean)
      .map(escapeRegExp)
      .join("|");
    if (!aliasPattern) continue;

    const patterns: [RegExp, QueryFilter["op"]][] = [
      [
        new RegExp(
          `\\b(?:at\\s+least|minimum|min|no\\s+less\\s+than)\\s+${duration}\\s*${unit}\\s+(?:${aliasPattern})\\b`
        ),
        "gte",
      ],
      [
        new RegExp(
          `\\b(?:more\\s+than|over|above|greater\\s+than)\\s+${duration}\\s*${unit}\\s+(?:${aliasPattern})\\b`
        ),
        "gt",
      ],
      [
        new RegExp(
          `\\b(?:at\\s+most|maximum|max|up\\s+to|no\\s+more\\s+than)\\s+${duration}\\s*${unit}\\s+(?:${aliasPattern})\\b`
        ),
        "lte",
      ],
      [
        new RegExp(
          `\\b(?:less\\s+than|under|below)\\s+${duration}\\s*${unit}\\s+(?:${aliasPattern})\\b`
        ),
        "lt",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:at\\s+least|minimum|min|no\\s+less\\s+than)\\s+${duration}\\s*${unit}\\b`
        ),
        "gte",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:more\\s+than|over|above|greater\\s+than)\\s+${duration}\\s*${unit}\\b`
        ),
        "gt",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:at\\s+most|maximum|max|up\\s+to|no\\s+more\\s+than)\\s+${duration}\\s*${unit}\\b`
        ),
        "lte",
      ],
      [
        new RegExp(
          `\\b(?:${aliasPattern})\\s+(?:is\\s+|are\\s+)?(?:less\\s+than|under|below)\\s+${duration}\\s*${unit}\\b`
        ),
        "lt",
      ],
    ];

    for (const [pattern, op] of patterns) {
      if (!def.operators.includes(op)) continue;
      const match = normalized.match(pattern);
      if (!match) continue;
      const value = durationSeconds(match[1], match[2]);
      if (value == null) continue;
      const key = `${field}:${op}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      filters.push({ field, op, value });
      break;
    }
  }

  return filters;
}

function aggregateThresholdAliases(
  dataset: DatasetId,
  filter: FilterDef
): string[] {
  const metricId = filter.metric ?? filter.id;
  const metric = getMetric(dataset, metricId);
  const aliases = new Set<string>();

  for (const alias of [
    filter.id.replace(/_/g, " "),
    filter.label,
    filter.id === metricId ? metricId.replace(/_/g, " ") : null,
    filter.id === metricId ? metric?.label : null,
  ]) {
    const normalizedAlias = alias ? normalize(alias) : "";
    if (normalizedAlias) aliases.add(normalizedAlias);
  }

  if (filter.aggregate === "per10" && metric) {
    aliases.add(`${normalize(metric.label)} per 10`);
    aliases.add(`${metric.id.replace(/_/g, " ")} per 10`);
  }
  if (filter.aggregate === "sum") {
    aliases.add(`total ${normalize(filter.label)}`);
    aliases.add(`${normalize(filter.label)} count`);
  }

  return Array.from(aliases).sort((a, b) => b.length - a.length);
}

function extractGenericAggregateThresholdFilters(
  dataset: DatasetId,
  normalized: string,
  existing: QueryFilter[]
): QueryFilter[] {
  const existingFields = new Set(existing.map((filter) => filter.field));
  const aggregateFilters = getDataset(dataset).filters.filter(
    (filter) =>
      filter.valueType === "number" &&
      filter.aggregate &&
      !existingFields.has(filter.id)
  );
  const seen = new Set(
    existing.map((filter) => `${filter.field}:${filter.op}:${filter.value}`)
  );
  const seenThresholds = new Set(
    existing
      .filter((filter) => typeof filter.value === "number")
      .map((filter) => `${filter.op}:${filter.value}`)
  );
  const generated: QueryFilter[] = [];
  const candidates = aggregateFilters
    .map((filter) => {
      const aliases = aggregateThresholdAliases(dataset, filter);
      const matchLength = aliases.reduce(
        (best, alias) =>
          includesPhrase(normalized, alias)
            ? Math.max(best, alias.length)
            : best,
        0
      );
      return { filter, aliases, matchLength };
    })
    .filter((candidate) => candidate.matchLength > 0)
    .sort((a, b) => b.matchLength - a.matchLength);

  for (const { filter, aliases } of candidates) {
    const extracted =
      filter.unit === "s"
        ? extractDurationThresholdFilters(dataset, normalized, [
            { field: filter.id, aliases },
          ])
        : extractNumericThresholdFilters(dataset, normalized, [
            { field: filter.id, aliases },
          ]);
    const [threshold] = extracted;
    if (!threshold || typeof threshold.value !== "number") continue;
    const key = `${threshold.field}:${threshold.op}:${threshold.value}`;
    const thresholdKey = `${threshold.op}:${threshold.value}`;
    if (seen.has(key) || seenThresholds.has(thresholdKey)) continue;
    seen.add(key);
    seenThresholds.add(thresholdKey);
    generated.push(threshold);
  }

  return generated;
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

function hasAverageRotationSignalIntent(normalized: string): boolean {
  return (
    includesPhrase(normalized, "average pre fight damage") ||
    includesPhrase(normalized, "average pre-fight damage") ||
    includesPhrase(normalized, "avg pre fight damage") ||
    includesPhrase(normalized, "avg pre-fight damage") ||
    includesPhrase(normalized, "average kill distance") ||
    includesPhrase(normalized, "avg kill distance") ||
    includesPhrase(normalized, "average death distance") ||
    includesPhrase(normalized, "avg death distance")
  );
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

function pickFirstSwapTiming(normalized: string): string | null {
  if (
    includesPhrase(normalized, "early swap") ||
    includesPhrase(normalized, "early swaps") ||
    includesPhrase(normalized, "early first swap") ||
    includesPhrase(normalized, "first swap early")
  ) {
    return "early";
  }
  if (
    includesPhrase(normalized, "mid swap") ||
    includesPhrase(normalized, "mid swaps") ||
    includesPhrase(normalized, "mid first swap") ||
    includesPhrase(normalized, "first swap mid") ||
    includesPhrase(normalized, "middle swap") ||
    includesPhrase(normalized, "middle first swap")
  ) {
    return "mid";
  }
  if (
    includesPhrase(normalized, "late swap") ||
    includesPhrase(normalized, "late swaps") ||
    includesPhrase(normalized, "late first swap") ||
    includesPhrase(normalized, "first swap late")
  ) {
    return "late";
  }
  return null;
}

function extractWastedUltFilter(normalized: string): QueryFilter | null {
  const mentionsWastedUlt =
    includesPhrase(normalized, "wasted ult") ||
    includesPhrase(normalized, "wasted ults") ||
    includesPhrase(normalized, "wasted ultimate") ||
    includesPhrase(normalized, "wasted ultimates");

  if (
    includesPhrase(normalized, "no wasted ults") ||
    includesPhrase(normalized, "no wasted ultimates") ||
    includesPhrase(normalized, "without wasted ults") ||
    includesPhrase(normalized, "without wasted ultimates")
  ) {
    return { field: "wasted_ults", op: "eq", value: 0 };
  }
  if (
    mentionsWastedUlt &&
    (includesPhrase(normalized, "average wasted") ||
      includesPhrase(normalized, "avg wasted") ||
      new RegExp(
        `\\b(?:at\\s+least|minimum|min|more\\s+than|over|above|greater\\s+than|at\\s+most|maximum|max|up\\s+to|less\\s+than|under|below)\\s+(?:${NUMBER_TOKEN})\\s*(?:wasted\\s+ults?|wasted\\s+ultimates?)\\b`
      ).test(normalized) ||
      new RegExp(
        `\\b(?:wasted\\s+ults?|wasted\\s+ultimates?)\\s+(?:is\\s+|are\\s+)?(?:at\\s+least|minimum|min|more\\s+than|over|above|greater\\s+than|at\\s+most|maximum|max|up\\s+to|less\\s+than|under|below)\\s+(?:${NUMBER_TOKEN})\\b`
      ).test(normalized))
  ) {
    return null;
  }
  if (
    mentionsWastedUlt ||
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

function hasEnemyFightContext(normalized: string, phrases: string[]): boolean {
  return phrases.some((phrase) => {
    const escaped = escapeRegExp(normalize(phrase));
    return (
      new RegExp(
        `\\b(?:enemy|enemies|opponent|opponents|they|their)\\s+(?:gets?|got|has|have|uses?|used|takes?|took)?\\s*${escaped}\\b`
      ).test(normalized) ||
      new RegExp(
        `\\b${escaped}\\s+(?:for|by|from)\\s+(?:enemy|enemies|opponent|opponents|them|their)\\b`
      ).test(normalized)
    );
  });
}

function hasFriendlyVictimFightContext(
  normalized: string,
  phrases: string[]
): boolean {
  return phrases.some((phrase) => {
    return (
      new RegExp(
        `\\b(?:we|us|our)\\s+(?:get|gets|got|are|were|was)?\\s*(?:picked|killed)\\s+first\\b`
      ).test(normalized) ||
      includesPhrase(normalized, `we suffer ${phrase}`) ||
      includesPhrase(normalized, `we suffered ${phrase}`)
    );
  });
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
    includesPhrase(normalized, "negative 2 ult advantage") ||
    includesPhrase(normalized, "negative two ult advantage") ||
    includesPhrase(normalized, "down by 2") ||
    includesPhrase(normalized, "down by two") ||
    includesPhrase(normalized, "down by 2 ults") ||
    includesPhrase(normalized, "down by two ults") ||
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
    includesPhrase(normalized, "negative 1 ult advantage") ||
    includesPhrase(normalized, "negative one ult advantage") ||
    includesPhrase(normalized, "down by 1") ||
    includesPhrase(normalized, "down by one") ||
    includesPhrase(normalized, "down by 1 ult") ||
    includesPhrase(normalized, "down by one ult") ||
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
    includesPhrase(normalized, "plus 2 ult advantage") ||
    includesPhrase(normalized, "plus two ult advantage") ||
    includesPhrase(normalized, "two ult advantage") ||
    includesPhrase(normalized, "2 ult advantage") ||
    includesPhrase(normalized, "up by 2") ||
    includesPhrase(normalized, "up by two") ||
    includesPhrase(normalized, "up by 2 ults") ||
    includesPhrase(normalized, "up by two ults") ||
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
    includesPhrase(normalized, "an ult ahead") ||
    includesPhrase(normalized, "a ult ahead") ||
    includesPhrase(normalized, "plus 1 ult advantage") ||
    includesPhrase(normalized, "plus one ult advantage") ||
    includesPhrase(normalized, "one ult advantage") ||
    includesPhrase(normalized, "1 ult advantage") ||
    includesPhrase(normalized, "an ult advantage") ||
    includesPhrase(normalized, "a one ult advantage") ||
    includesPhrase(normalized, "up by 1") ||
    includesPhrase(normalized, "up by one") ||
    includesPhrase(normalized, "up by 1 ult") ||
    includesPhrase(normalized, "up by one ult") ||
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

function pickUltImpactScenario(normalized: string): string | null {
  const uncontested =
    includesPhrase(normalized, "uncontested ult") ||
    includesPhrase(normalized, "uncontested ults") ||
    includesPhrase(normalized, "uncontested ultimate") ||
    includesPhrase(normalized, "uncontested ultimates") ||
    includesPhrase(normalized, "not mirrored") ||
    includesPhrase(normalized, "without mirror");
  const mirror =
    includesPhrase(normalized, "mirror ult") ||
    includesPhrase(normalized, "mirror ults") ||
    includesPhrase(normalized, "mirror ultimate") ||
    includesPhrase(normalized, "mirror ultimates") ||
    includesPhrase(normalized, "mirrored ult") ||
    includesPhrase(normalized, "mirrored ults") ||
    includesPhrase(normalized, "mirrored ultimate") ||
    includesPhrase(normalized, "mirrored ultimates");
  const ourUlt =
    includesPhrase(normalized, "we ult") ||
    includesPhrase(normalized, "we ults") ||
    includesPhrase(normalized, "we use ult") ||
    includesPhrase(normalized, "we used ult") ||
    includesPhrase(normalized, "our ult") ||
    includesPhrase(normalized, "our ultimate") ||
    /\bwe\s+(?:use|uses|used)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    );
  const enemyUlt =
    includesPhrase(normalized, "enemy ult") ||
    includesPhrase(normalized, "enemy ults") ||
    includesPhrase(normalized, "enemy ultimate") ||
    includesPhrase(normalized, "enemy ultimates") ||
    includesPhrase(normalized, "their ult") ||
    includesPhrase(normalized, "their ults") ||
    includesPhrase(normalized, "their ultimate") ||
    includesPhrase(normalized, "their ultimates") ||
    /\b(?:enemy|they|their)\b.*\b(?:use|uses|used|ult|ults|ultimate|ultimates)\b/.test(
      normalized
    );
  const weFirst =
    includesPhrase(normalized, "we first") ||
    includesPhrase(normalized, "ours first") ||
    includesPhrase(normalized, "our ult first") ||
    includesPhrase(normalized, "we ult first") ||
    includesPhrase(normalized, "we use first") ||
    includesPhrase(normalized, "we used first");
  const enemyFirst =
    includesPhrase(normalized, "enemy first") ||
    includesPhrase(normalized, "they first") ||
    includesPhrase(normalized, "theirs first") ||
    includesPhrase(normalized, "enemy ult first") ||
    includesPhrase(normalized, "enemy ults first") ||
    includesPhrase(normalized, "they ult first") ||
    includesPhrase(normalized, "they use first") ||
    includesPhrase(normalized, "they used first");

  if (uncontested && ourUlt) return "we used uncontested";
  if (uncontested && enemyUlt) return "enemy used uncontested";
  if (mirror && weFirst) return "mirror, we first";
  if (mirror && enemyFirst) return "mirror, enemy first";
  return null;
}

function pickConfidenceScope(normalized: string): string | null {
  if (
    includesPhrase(normalized, "high confidence") ||
    includesPhrase(normalized, "confident")
  ) {
    return "high";
  }
  if (includesPhrase(normalized, "medium confidence")) return "medium";
  if (
    includesPhrase(normalized, "low confidence") ||
    includesPhrase(normalized, "thin sample") ||
    includesPhrase(normalized, "small sample")
  ) {
    return "low";
  }
  if (
    includesPhrase(normalized, "insufficient confidence") ||
    includesPhrase(normalized, "insufficient sample") ||
    includesPhrase(normalized, "not enough data") ||
    includesPhrase(normalized, "no confidence")
  ) {
    return "insufficient";
  }
  return null;
}

function mentionsEnemyAbilityContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "enemy") ||
    includesPhrase(normalized, "enemies") ||
    includesPhrase(normalized, "opponent") ||
    includesPhrase(normalized, "opponents") ||
    includesPhrase(normalized, "their") ||
    includesPhrase(normalized, "they")
  );
}

function hasNegatedAbilityUse(normalized: string): boolean {
  return (
    includesPhrase(normalized, "not using") ||
    includesPhrase(normalized, "not used") ||
    includesPhrase(normalized, "does not use") ||
    includesPhrase(normalized, "do not use") ||
    includesPhrase(normalized, "did not use") ||
    includesPhrase(normalized, "doesn t use") ||
    includesPhrase(normalized, "don t use") ||
    includesPhrase(normalized, "didn t use") ||
    includesPhrase(normalized, "without") ||
    includesPhrase(normalized, "no ability") ||
    includesPhrase(normalized, "no abilities")
  );
}

function hasAffirmedAbilityUse(normalized: string): boolean {
  return (
    includesPhrase(normalized, "using") ||
    includesPhrase(normalized, "used") ||
    includesPhrase(normalized, "uses") ||
    includesPhrase(normalized, "we use") ||
    includesPhrase(normalized, "they use") ||
    includesPhrase(normalized, "enemy use") ||
    includesPhrase(normalized, "enemies use") ||
    includesPhrase(normalized, "opponent use") ||
    includesPhrase(normalized, "opponents use") ||
    includesPhrase(normalized, "use ability") ||
    includesPhrase(normalized, "use abilities") ||
    includesPhrase(normalized, "after use") ||
    includesPhrase(normalized, "after they use") ||
    includesPhrase(normalized, "after enemy use") ||
    includesPhrase(normalized, "after enemies use") ||
    includesPhrase(normalized, "after opponent use") ||
    includesPhrase(normalized, "after opponents use")
  );
}

function mentionsAbilityUseComparison(normalized: string): boolean {
  if (
    includesPhrase(normalized, "used vs not used") ||
    includesPhrase(normalized, "used versus not used") ||
    includesPhrase(normalized, "with and without")
  ) {
    return true;
  }

  const hasComparisonCue =
    includesPhrase(normalized, "compare") ||
    includesPhrase(normalized, "comparison") ||
    includesPhrase(normalized, "compared to") ||
    includesPhrase(normalized, "versus") ||
    includesPhrase(normalized, "vs");

  if (!hasComparisonCue) return false;

  if (
    includesPhrase(normalized, "with") &&
    includesPhrase(normalized, "without")
  ) {
    return true;
  }

  return hasAffirmedAbilityUse(normalized) && hasNegatedAbilityUse(normalized);
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

function wantsPrimaryHeroFilter(normalized: string): boolean {
  return (
    includesPhrase(normalized, "primary hero") ||
    includesPhrase(normalized, "primary heroes") ||
    includesPhrase(normalized, "best hero") ||
    includesPhrase(normalized, "best heroes")
  );
}

function wantsMostPlayedHeroFilter(normalized: string): boolean {
  return (
    includesPhrase(normalized, "most played hero") ||
    includesPhrase(normalized, "most-played hero") ||
    includesPhrase(normalized, "most played heroes") ||
    includesPhrase(normalized, "most-played heroes") ||
    includesPhrase(normalized, "main hero") ||
    includesPhrase(normalized, "main heroes")
  );
}

function wantsNonPrimaryHeroFilter(normalized: string): boolean {
  return (
    includesPhrase(normalized, "non primary") ||
    includesPhrase(normalized, "non-primary") ||
    includesPhrase(normalized, "not primary") ||
    includesPhrase(normalized, "secondary hero") ||
    includesPhrase(normalized, "secondary heroes")
  );
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
  if (
    includesPhrase(normalized, "ult charge time") ||
    includesPhrase(normalized, "ultimate charge time")
  ) {
    return "average_ult_charge_time";
  }
  if (
    includesPhrase(normalized, "time to use ult") ||
    includesPhrase(normalized, "time to use ultimate")
  ) {
    return "average_time_to_use_ult";
  }
  if (includesPhrase(normalized, "drought time")) {
    return "average_drought_time";
  }
  if (
    includesPhrase(normalized, "duel winrate") ||
    includesPhrase(normalized, "duel win rate")
  ) {
    return "duel_winrate_percentage";
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

function pickPlayerTargetDirection(normalized: string): string | null {
  if (
    includesPhrase(normalized, "increase goal") ||
    includesPhrase(normalized, "increase goals") ||
    includesPhrase(normalized, "increase target") ||
    includesPhrase(normalized, "increase targets") ||
    includesPhrase(normalized, "improvement goal") ||
    includesPhrase(normalized, "improvement goals") ||
    includesPhrase(normalized, "raise target") ||
    includesPhrase(normalized, "raise targets") ||
    includesPhrase(normalized, "higher target") ||
    includesPhrase(normalized, "higher goals")
  ) {
    return "increase";
  }

  if (
    includesPhrase(normalized, "decrease goal") ||
    includesPhrase(normalized, "decrease goals") ||
    includesPhrase(normalized, "decrease target") ||
    includesPhrase(normalized, "decrease targets") ||
    includesPhrase(normalized, "reduction goal") ||
    includesPhrase(normalized, "reduction goals") ||
    includesPhrase(normalized, "reduce target") ||
    includesPhrase(normalized, "reduce targets") ||
    includesPhrase(normalized, "reduce goal") ||
    includesPhrase(normalized, "reduce goals") ||
    includesPhrase(normalized, "lower target") ||
    includesPhrase(normalized, "lower targets") ||
    includesPhrase(normalized, "lower goal") ||
    includesPhrase(normalized, "lower goals")
  ) {
    return "decrease";
  }

  return null;
}

function pickFilters(dataset: DatasetId, question: string): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const heroMentions = findHeroMentions(question);
  const heroes = heroMentions.map((mention) => mention.hero);
  const hero = heroes[0] ?? null;
  const abilityMentions = findAbilityMentions(question);
  const abilities = abilityMentions.map((mention) => mention.ability);
  const mapMentions = findMapMentions(question);
  const mapNames = mapMentions.map((mention) => mention.map);
  const mapName = mapNames[0] ?? null;
  const player = findPlayer(question, hero);
  const comparedPlayers = extractComparedPlayers(question);
  const normalized = normalize(question);

  if (heroes.length > 0) {
    if (dataset === "hero_swap") {
      filters.push(...pickHeroSwapHeroFilters(heroMentions, question));
    } else if (dataset === "duel") {
      filters.push(...pickDuelHeroFilters(heroMentions, question));
    } else if (dataset === "enemy_hero") {
      filters.push({ field: "enemy_hero", op: "in", value: heroes });
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
  if (comparedPlayers.length >= 2) {
    const filter = filterFor(dataset, "player", comparedPlayers);
    if (filter) filters.push(filter);
  } else if (
    player &&
    !(
      dataset === "player_impact" &&
      player === "Impact" &&
      includesPhrase(normalized, "player impact")
    )
  ) {
    const filter =
      dataset === "kill" && isKillVictimPlayerContext(normalized, player)
        ? filterFor(dataset, "victim", player)
        : filterFor(dataset, "player", player);
    if (filter) filters.push(filter);
  }
  if (abilities.length > 0) {
    const filter = filterFor(dataset, "ability", abilities);
    if (filter) filters.push(filter);
  }
  if (mapNames.length > 0) {
    const filter = filterFor(dataset, "map", mapNames);
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
    filters.push(
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "avg_kill_time",
          aliases: [
            "average opening kill time",
            "avg opening kill time",
            "opening kill timing",
          ],
        },
        {
          field: "avg_fight_time",
          aliases: [
            "average time into fight",
            "avg time into fight",
            "average fight time",
            "opening pick timing",
            "opening kill fight timing",
          ],
        },
      ])
    );
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "first_events",
          aliases: [
            "opening kills",
            "opening kill events",
            "first kills",
            "first events",
            "fights",
            "sample size",
          ],
        },
        {
          field: "first_deaths",
          aliases: ["first deaths", "opening deaths", "first death count"],
        },
        {
          field: "first_picks",
          aliases: ["first picks", "opening picks", "first pick count"],
        },
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "opening kill win rate",
            "first death win rate",
            "first pick win rate",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "fight wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "fight losses"],
        },
      ])
    );
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
    const enemyFirstPick =
      hasEnemyFightContext(normalized, [
        "first pick",
        "opening pick",
        "first kill",
        "opening kill",
      ]) ||
      hasFriendlyVictimFightContext(normalized, [
        "first pick",
        "opening pick",
        "first kill",
        "opening kill",
      ]);
    const enemyFirstUlt = hasEnemyFightContext(normalized, [
      "first ult",
      "first ultimate",
      "opening ult",
      "opening ultimate",
    ]);
    const noDryFight = hasNegatedFightContext(normalized, ["dry fight"]);
    const noReversal = hasNegatedFightContext(normalized, [
      "reversal",
      "reverse fight",
    ]);

    if (enemyFirstPick && !asksFirstPickRate && !asksFirstDeathRate) {
      filters.push({
        field: "first_death",
        op: "eq",
        value: "yes",
      });
    } else if (
      includesPhrase(normalized, "first death") &&
      !asksFirstDeathRate
    ) {
      filters.push({
        field: "first_death",
        op: "eq",
        value: noFirstDeath ? "no" : "yes",
      });
    }
    if (
      includesPhrase(normalized, "first pick") &&
      !asksFirstPickRate &&
      !enemyFirstPick
    ) {
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
        value: enemyFirstUlt || noFirstUlt ? "no" : "yes",
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

    const aggregateSignalFilters = extractNumericThresholdFilters(
      dataset,
      normalized,
      [
        {
          field: "avg_pre_fight_damage",
          aliases: [
            "average pre fight damage",
            "average pre-fight damage",
            "avg pre fight damage",
            "avg pre-fight damage",
          ],
        },
        {
          field: "avg_kill_distance",
          aliases: [
            "average kill distance",
            "avg kill distance",
            "average death distance",
            "avg death distance",
          ],
        },
      ]
    );
    const aggregateSignalFields = new Set(
      aggregateSignalFilters.map((filter) => filter.field)
    );
    filters.push(
      ...extractRotationDeathSignalFilters(normalized).filter((filter) => {
        if (
          filter.field === "pre_fight_damage" &&
          aggregateSignalFields.has("avg_pre_fight_damage")
        ) {
          return false;
        }
        if (
          filter.field === "kill_distance" &&
          aggregateSignalFields.has("avg_kill_distance")
        ) {
          return false;
        }
        return true;
      }),
      ...aggregateSignalFilters
    );
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "rotation_deaths",
          aliases: [
            "rotation deaths",
            "rotational deaths",
            "caught on rotation",
            "rotation death count",
          ],
        },
        {
          field: "deaths",
          aliases: ["death", "deaths", "death count", "sample size"],
        },
        {
          field: "rotation_death_rate",
          aliases: [
            "rotation death rate",
            "rotational death rate",
            "rotation rate",
          ],
        },
        {
          field: "early_death_rate",
          aliases: ["early death rate", "early-fight death rate"],
        },
      ])
    );
  }

  if (dataset === "duel") {
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "duel win rate", "duel winrate"],
        },
        {
          field: "duels",
          aliases: ["duels", "duel count", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "duel wins", "duels won"],
        },
        {
          field: "losses",
          aliases: ["losses", "duel losses", "duels lost"],
        },
      ])
    );
  }

  if (dataset === "enemy_hero") {
    const wantsEnemyRoleComparison =
      mentionsEnemyRoleMatchupContext(normalized) &&
      (includesPhrase(normalized, "compare") ||
        includesPhrase(normalized, "comparison") ||
        includesPhrase(normalized, "versus") ||
        includesPhrase(normalized, "vs"));

    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesPhrase(normalized, `${roleWord} heroes`) ||
        includesPhrase(normalized, `${roleWord} hero`) ||
        includesPhrase(normalized, `enemy ${roleWord}`) ||
        includesPhrase(normalized, `enemy ${roleWord} heroes`) ||
        includesPhrase(normalized, `enemy ${roleWord} hero`) ||
        includesPhrase(normalized, `against ${roleWord}`) ||
        includesPhrase(normalized, `versus ${roleWord}`) ||
        includesPhrase(normalized, `vs ${roleWord}`) ||
        (wantsEnemyRoleComparison && includesPhrase(normalized, roleWord))
      ) {
        const filter = filterFor(dataset, "role", role);
        if (filter) filters.push(filter);
      }
    }

    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "enemy hero win rate",
            "matchup win rate",
          ],
        },
        {
          field: "maps",
          aliases: ["maps", "games", "maps played", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
      ])
    );
  }

  if (dataset === "map_result") {
    const opponents = findOpponents(question);
    if (opponents.length > 0) {
      filters.push({ field: "opponent", op: "in", value: opponents });
    }
    filters.push(
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "avg_playtime",
          aliases: [
            "average map duration",
            "avg map duration",
            "average map playtime",
            "avg map playtime",
            "average map time played",
          ],
        },
      ])
    );
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "map win rate", "map winrate"],
        },
        {
          field: "maps",
          aliases: [
            "maps",
            "games",
            "maps played",
            "games played",
            "sample size",
          ],
        },
      ])
    );
  }

  if (dataset === "player_map_performance") {
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "map win rate",
            "map winrate",
            "player map win rate",
            "player map winrate",
          ],
        },
        {
          field: "games",
          aliases: [
            "games",
            "maps",
            "maps played",
            "games played",
            "sample size",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "team win rate", "team winrate"],
        },
        {
          field: "maps",
          aliases: [
            "maps",
            "games",
            "maps played",
            "games played",
            "sample size",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
        {
          field: "eliminations",
          aliases: ["total eliminations", "total elims", "elimination count"],
        },
        {
          field: "eliminations_per10",
          aliases: ["eliminations per 10", "elims per 10", "kills per 10"],
        },
        {
          field: "final_blows",
          aliases: ["total final blows", "total finals", "final blow count"],
        },
        {
          field: "final_blows_per10",
          aliases: ["final blows per 10", "finals per 10"],
        },
        {
          field: "deaths",
          aliases: ["total deaths", "death count"],
        },
        {
          field: "deaths_per10",
          aliases: ["deaths per 10", "death rate"],
        },
        {
          field: "hero_damage_per10",
          aliases: ["hero damage per 10", "damage per 10"],
        },
        {
          field: "all_damage_per10",
          aliases: ["all damage per 10", "total damage per 10"],
        },
        {
          field: "healing_per10",
          aliases: ["healing per 10", "heals per 10"],
        },
        {
          field: "healing_received_per10",
          aliases: ["healing received per 10", "heals received per 10"],
        },
        {
          field: "damage_taken_per10",
          aliases: ["damage taken per 10", "damage taken rate"],
        },
        {
          field: "damage_blocked_per10",
          aliases: ["damage blocked per 10", "mitigation per 10"],
        },
        {
          field: "ults_earned_per10",
          aliases: [
            "ults earned per 10",
            "ultimates earned per 10",
            "ult charge per 10",
          ],
        },
        {
          field: "ults_used_per10",
          aliases: [
            "ults used per 10",
            "ultimates used per 10",
            "ult usage per 10",
          ],
        },
        {
          field: "solo_kills_per10",
          aliases: ["solo kills per 10", "solo kill per 10"],
        },
        {
          field: "objective_kills_per10",
          aliases: ["objective kills per 10", "objective kill per 10"],
        },
        {
          field: "offensive_assists_per10",
          aliases: ["offensive assists per 10", "offensive assist per 10"],
        },
        {
          field: "defensive_assists_per10",
          aliases: ["defensive assists per 10", "defensive assist per 10"],
        },
        {
          field: "first_pick_percentage",
          aliases: ["first pick rate", "first pick percentage"],
        },
        {
          field: "first_pick_count",
          aliases: ["first picks", "first pick count"],
        },
        {
          field: "first_picks_per10",
          aliases: ["first picks per 10", "opening picks per 10"],
        },
        {
          field: "first_death_percentage",
          aliases: ["first death rate", "first death percentage"],
        },
        {
          field: "first_death_count",
          aliases: ["first deaths", "first death count"],
        },
        {
          field: "first_deaths_per10",
          aliases: ["first deaths per 10", "opening deaths per 10"],
        },
        {
          field: "mvp_score",
          aliases: ["mvp", "mvp score", "average mvp score"],
        },
        {
          field: "map_mvp_rate",
          aliases: ["map mvp rate", "map mvp percentage"],
        },
        {
          field: "map_mvp_count",
          aliases: ["map mvps", "map mvp count"],
        },
        {
          field: "ajax_count",
          aliases: ["ajax", "ajaxes", "ajax count"],
        },
        {
          field: "ajax_per10",
          aliases: ["ajax per 10", "ajaxes per 10"],
        },
        {
          field: "kills_per_ultimate",
          aliases: ["kills per ult", "kills per ultimate"],
        },
        {
          field: "fight_reversal_percentage",
          aliases: ["fight reversal", "fight reversal percentage"],
        },
      ]),
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "hero_time_played",
          aliases: ["time played", "playtime", "hero time played"],
        },
        {
          field: "average_ult_charge_time",
          aliases: [
            "ult charge time",
            "ultimate charge time",
            "average ult charge time",
            "average ultimate charge time",
          ],
        },
        {
          field: "average_time_to_use_ult",
          aliases: [
            "time to use ult",
            "time to use ultimate",
            "average time to use ult",
            "average time to use ultimate",
          ],
        },
      ])
    );
  }

  if (dataset === "map_intelligence") {
    if (includesPhrase(normalized, "improving")) {
      filters.push({ field: "trend", op: "in", value: ["improving"] });
    } else if (includesPhrase(normalized, "declining")) {
      filters.push({ field: "trend", op: "in", value: ["declining"] });
    } else if (includesPhrase(normalized, "stable")) {
      filters.push({ field: "trend", op: "in", value: ["stable"] });
    }
    const confidence = pickConfidenceScope(normalized);
    if (confidence) {
      filters.push({ field: "confidence", op: "in", value: [confidence] });
    }
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["map win rate", "overall win rate", "overall winrate"],
        },
        {
          field: "weighted_win_rate",
          aliases: [
            "weighted win rate",
            "time weighted win rate",
            "time-decayed win rate",
            "decayed win rate",
          ],
        },
        {
          field: "recent_win_rate",
          aliases: ["recent win rate", "recent form win rate"],
        },
        {
          field: "trend_delta",
          aliases: ["trend delta", "recent delta", "delta", "improvement"],
        },
        {
          field: "maps",
          aliases: ["maps", "games", "maps played", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
      ])
    );
  }

  if (dataset === "teamfight") {
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "fight win rate",
            "fight winrate",
            "teamfight win rate",
            "teamfight winrate",
          ],
        },
        {
          field: "fights",
          aliases: [
            "fights",
            "teamfights",
            "team fights",
            "fight sample",
            "sample size",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "fight wins", "fights won"],
        },
        {
          field: "losses",
          aliases: ["losses", "fight losses", "fights lost"],
        },
        {
          field: "avg_ults",
          aliases: [
            "average ults",
            "avg ults",
            "average ultimates",
            "avg ultimates",
            "average ultimates used",
            "avg ultimates used",
          ],
        },
        {
          field: "avg_wasted_ults",
          aliases: [
            "average wasted ults",
            "avg wasted ults",
            "average wasted ultimates",
            "avg wasted ultimates",
            "wasted ultimates",
          ],
        },
        {
          field: "first_pick_rate",
          aliases: ["first pick rate", "first-pick rate", "opening pick rate"],
        },
        {
          field: "first_death_rate",
          aliases: [
            "first death rate",
            "first-death rate",
            "opening death rate",
          ],
        },
        {
          field: "first_ult_rate",
          aliases: ["first ult rate", "first ultimate rate"],
        },
        {
          field: "dry_fight_rate",
          aliases: ["dry fight rate", "dry-fight rate"],
        },
        {
          field: "reversal_rate",
          aliases: ["reversal rate", "fight reversal rate"],
        },
        {
          field: "dry_fight_reversal_rate",
          aliases: [
            "dry fight reversal rate",
            "dry-fight reversal rate",
            "dry reversal rate",
          ],
        },
        {
          field: "non_dry_fight_reversal_rate",
          aliases: [
            "non dry fight reversal rate",
            "non-dry fight reversal rate",
            "non dry reversal rate",
          ],
        },
        {
          field: "ultimate_efficiency",
          aliases: [
            "ultimate efficiency",
            "ult efficiency",
            "fight wins per ultimate",
            "fight wins per ult",
          ],
        },
        {
          field: "avg_ults_per_non_dry_fight",
          aliases: [
            "average ults per non dry fight",
            "average ultimates per non dry fight",
            "ults per non dry fight",
            "ultimates per non dry fight",
          ],
        },
        {
          field: "avg_ults_in_won_fights",
          aliases: [
            "average ults in won fights",
            "average ultimates in won fights",
            "ults in won fights",
          ],
        },
        {
          field: "avg_ults_in_lost_fights",
          aliases: [
            "average ults in lost fights",
            "average ultimates in lost fights",
            "ults in lost fights",
          ],
        },
      ]),
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "duration",
          aliases: [
            "duration",
            "fight duration",
            "teamfight duration",
            "team fight duration",
            "fight length",
          ],
        },
      ])
    );
  }

  if (dataset === "calculated_stat") {
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "mvp_score",
          aliases: ["mvp", "mvp score", "average mvp score"],
        },
        {
          field: "map_mvp_count",
          aliases: ["map mvps", "map mvp count"],
        },
        {
          field: "fleta_deadlift",
          aliases: ["fleta", "fleta deadlift", "deadlift"],
        },
        {
          field: "first_pick_pct",
          aliases: [
            "first pick",
            "first pick percentage",
            "first pick rate",
            "opening pick rate",
          ],
        },
        {
          field: "first_pick_count",
          aliases: ["first picks", "first pick count", "opening picks"],
        },
        {
          field: "first_death_pct",
          aliases: [
            "first death",
            "first death percentage",
            "first death rate",
            "opening death rate",
          ],
        },
        {
          field: "first_death_count",
          aliases: ["first deaths", "first death count", "opening deaths"],
        },
        {
          field: "ajax_count",
          aliases: ["ajax", "ajaxes", "ajax count"],
        },
        {
          field: "kills_per_ult",
          aliases: [
            "kills per ult",
            "kills per ultimate",
            "elims per ult",
            "eliminations per ultimate",
          ],
        },
        {
          field: "duel_winrate",
          aliases: ["duel winrate", "duel win rate", "duel rate"],
        },
        {
          field: "fight_reversal",
          aliases: [
            "fight reversal",
            "fight reversal percentage",
            "fight reversal rate",
          ],
        },
      ]),
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "ult_charge_time",
          aliases: [
            "ult charge time",
            "ultimate charge time",
            "average ult charge time",
            "average ultimate charge time",
          ],
        },
        {
          field: "time_to_use_ult",
          aliases: [
            "time to use ult",
            "time to use ultimate",
            "average time to use ult",
            "average time to use ultimate",
          ],
        },
        {
          field: "drought_time",
          aliases: ["drought time", "average drought time"],
        },
      ])
    );
  }

  if (dataset === "hero_pickrate") {
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "pick_rate",
          aliases: ["pick rate", "pickrate", "hero pool share"],
        },
        {
          field: "ownership_rate",
          aliases: [
            "ownership",
            "ownership rate",
            "share of hero",
            "hero ownership",
          ],
        },
        {
          field: "time_played",
          aliases: ["seconds played"],
        },
        {
          field: "games",
          aliases: [
            "game",
            "games",
            "map",
            "maps",
            "maps played",
            "sample size",
          ],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "consistency_score",
          aliases: ["consistency", "consistency score", "stable score"],
        },
        {
          field: "maps",
          aliases: ["maps", "games", "maps played", "sample size"],
        },
        {
          field: "eliminations_per10",
          aliases: ["eliminations per 10", "elims per 10"],
        },
        {
          field: "final_blows_per10",
          aliases: ["final blows per 10", "finals per 10"],
        },
        {
          field: "deaths_per10",
          aliases: ["deaths per 10", "death rate"],
        },
        {
          field: "hero_damage_per10",
          aliases: ["hero damage per 10", "damage per 10"],
        },
        {
          field: "all_damage_per10",
          aliases: ["all damage per 10", "total damage per 10"],
        },
        {
          field: "healing_per10",
          aliases: ["healing per 10", "heals per 10"],
        },
        {
          field: "damage_taken_per10",
          aliases: ["damage taken per 10", "damage received per 10"],
        },
        {
          field: "ults_used_per10",
          aliases: ["ults used per 10", "ultimates used per 10"],
        },
        {
          field: "first_pick_percentage",
          aliases: ["first pick rate", "first pick percentage"],
        },
        {
          field: "first_death_percentage",
          aliases: ["first death rate", "first death percentage"],
        },
        {
          field: "first_pick_count",
          aliases: ["first picks", "first pick count"],
        },
        {
          field: "first_death_count",
          aliases: ["first deaths", "first death count"],
        },
        {
          field: "first_picks_per10",
          aliases: ["first picks per 10", "opening picks per 10"],
        },
        {
          field: "first_deaths_per10",
          aliases: ["first deaths per 10", "opening deaths per 10"],
        },
        {
          field: "mvp_score",
          aliases: ["mvp score", "mvp"],
        },
        {
          field: "map_mvp_rate",
          aliases: ["map mvp rate", "map mvp percentage"],
        },
        {
          field: "map_mvp_count",
          aliases: ["map mvps", "map mvp count"],
        },
        {
          field: "kills_per_ultimate",
          aliases: ["kills per ult", "kills per ultimate"],
        },
        {
          field: "average_ult_charge_time",
          aliases: [
            "ult charge time",
            "ultimate charge time",
            "average ult charge time",
          ],
        },
        {
          field: "average_time_to_use_ult",
          aliases: [
            "time to use ult",
            "time to use ultimate",
            "average time to use ult",
          ],
        },
        {
          field: "average_drought_time",
          aliases: ["drought time", "average drought time"],
        },
        {
          field: "duel_winrate_percentage",
          aliases: ["duel winrate", "duel win rate", "duel rate"],
        },
        {
          field: "fight_reversal_percentage",
          aliases: ["fight reversal", "fight reversal rate"],
        },
        {
          field: "fleta_deadlift_percentage",
          aliases: ["fleta deadlift", "deadlift percentage"],
        },
        {
          field: "ajax_count",
          aliases: ["ajax", "ajaxes", "ajax count"],
        },
        {
          field: "ajax_per10",
          aliases: ["ajax per 10", "ajaxes per 10"],
        },
        {
          field: "eliminations_per10_stddev",
          aliases: ["eliminations volatility", "elims volatility"],
        },
        {
          field: "deaths_per10_stddev",
          aliases: ["deaths volatility", "death volatility"],
        },
        {
          field: "all_damage_per10_stddev",
          aliases: ["damage volatility", "all damage volatility"],
        },
        {
          field: "healing_per10_stddev",
          aliases: ["healing volatility", "heals volatility"],
        },
      ]),
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "hero_time_played",
          aliases: ["time played", "playtime", "hero time played", "played"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "improvement_percentage",
          aliases: [
            "improvement percentage",
            "improvement percent",
            "improvement %",
            "trend percentage",
          ],
        },
        {
          field: "improvement",
          aliases: ["improvement", "trend improvement"],
        },
        {
          field: "raw_change",
          aliases: ["raw change", "change"],
        },
        {
          field: "early_value",
          aliases: ["early value", "first half value"],
        },
        {
          field: "late_value",
          aliases: ["late value", "second half value"],
        },
        {
          field: "maps",
          aliases: ["maps", "games", "maps played", "sample size"],
        },
        {
          field: "early_maps",
          aliases: ["early maps", "first half maps"],
        },
        {
          field: "late_maps",
          aliases: ["late maps", "second half maps"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "abs_z_score",
          aliases: [
            "absolute z score",
            "absolute z-score",
            "outlier score",
            "distance from baseline",
          ],
        },
        { field: "z_score", aliases: ["z score", "z-score"] },
        { field: "percentile", aliases: ["percentile", "hero percentile"] },
        {
          field: "per10_value",
          aliases: [
            "per 10 value",
            "per-10 value",
            "player per 10",
            "player value",
            "current value",
          ],
        },
        {
          field: "baseline_per10",
          aliases: ["baseline per 10", "baseline value", "hero baseline"],
        },
        {
          field: "maps",
          aliases: ["maps", "maps played", "sample maps", "sample size"],
        },
        {
          field: "sample_players",
          aliases: [
            "sample players",
            "baseline players",
            "player sample",
            "sample size",
          ],
        },
      ]),
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "hero_time_played",
          aliases: ["time played", "hero time played", "playtime", "played"],
        },
      ])
    );

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
    const neutralTrendIntent =
      includesPhrase(normalized, "neutral trend") ||
      includesPhrase(normalized, "neutral trends") ||
      includesPhrase(normalized, "neutral trending") ||
      includesPhrase(normalized, "trending neutral");

    if (includesPhrase(normalized, "on track")) {
      filters.push({ field: "status", op: "in", value: ["on track"] });
    } else if (includesPhrase(normalized, "off track")) {
      filters.push({ field: "status", op: "in", value: ["off track"] });
    } else if (
      includesPhrase(normalized, "no data") ||
      includesPhrase(normalized, "missing data")
    ) {
      filters.push({ field: "status", op: "in", value: ["no data"] });
    } else if (
      includesPhrase(normalized, "complete") ||
      includesPhrase(normalized, "completed")
    ) {
      filters.push({ field: "status", op: "in", value: ["complete"] });
    } else if (
      includesPhrase(normalized, "stalled") ||
      (includesPhrase(normalized, "neutral") && !neutralTrendIntent)
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
    } else if (neutralTrendIntent) {
      filters.push({ field: "trending", op: "in", value: ["neutral"] });
    }

    const targetDirection = pickPlayerTargetDirection(normalized);
    if (targetDirection) {
      filters.push({
        field: "direction",
        op: "in",
        value: [targetDirection],
      });
    }

    const targetStat = pickPlayerTargetStat(normalized);
    if (targetStat) {
      filters.push({ field: "stat", op: "in", value: [targetStat] });
    }
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "progress_percent",
          aliases: ["progress", "progress percent", "progress percentage"],
        },
        {
          field: "current_value",
          aliases: ["current value", "recent value", "current per 10"],
        },
        {
          field: "baseline_value",
          aliases: ["baseline value", "starting value", "baseline per 10"],
        },
        {
          field: "target_value",
          aliases: ["target value", "goal value", "target per 10"],
        },
        {
          field: "gap_to_target",
          aliases: [
            "gap to target",
            "gap to goal",
            "remaining gap",
            "remaining",
            "distance to target",
            "distance to goal",
          ],
        },
        {
          field: "target_percent",
          aliases: [
            "target percent",
            "target percentage",
            "target change",
            "target change percent",
            "target change percentage",
            "goal change",
            "goal change percent",
            "goal change percentage",
          ],
        },
        {
          field: "sample_scrims",
          aliases: ["sample scrims", "scrim sample", "scrims sampled"],
        },
        {
          field: "scrim_window",
          aliases: ["scrim window", "target window", "window"],
        },
      ])
    );
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

    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "playtime_trend",
          aliases: ["playtime trend", "time played trend", "time trend"],
        },
        {
          field: "pick_rate_trend",
          aliases: [
            "pick rate trend",
            "pick-rate trend",
            "pickrate trend",
            "usage trend",
          ],
        },
        {
          field: "pick_rate",
          aliases: ["pick rate", "pickrate", "hero pick rate"],
        },
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "map win rate"],
        },
        {
          field: "maps_played",
          aliases: ["maps played", "maps", "games", "sample size"],
        },
        {
          field: "appearances",
          aliases: ["appearances", "hero appearances", "samples"],
        },
      ])
    );
  }

  if (dataset === "ult_economy") {
    const bucket = pickUltEconomyBucket(normalized);
    if (bucket) {
      filters.push({ field: "advantage_bucket", op: "in", value: [bucket] });
    }
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "fight win rate",
            "ult economy win rate",
          ],
        },
        {
          field: "avg_advantage",
          aliases: [
            "average ult advantage",
            "avg ult advantage",
            "average ultimate advantage",
            "avg ultimate advantage",
            "average ult bank",
            "ult bank advantage",
          ],
        },
        {
          field: "fights",
          aliases: [
            "fights",
            "teamfights",
            "team fights",
            "fight sample",
            "sample size",
          ],
        },
      ])
    );
  }

  if (dataset === "ability_impact") {
    const side = mentionsEnemyAbilityContext(normalized) ? "enemy" : "us";
    const sideFilter = filterFor(dataset, "side", side);
    if (sideFilter) filters.push(sideFilter);

    const wantsComparison =
      includesPhrase(normalized, "affect") ||
      includesPhrase(normalized, "impact") ||
      includesPhrase(normalized, "compare") ||
      mentionsAbilityUseComparison(normalized);
    if (!wantsComparison) {
      if (hasNegatedAbilityUse(normalized)) {
        const usedFilter = filterFor(dataset, "used", "no");
        if (usedFilter) filters.push(usedFilter);
      } else if (hasAffirmedAbilityUse(normalized)) {
        const usedFilter = filterFor(dataset, "used", "yes");
        if (usedFilter) filters.push(usedFilter);
      }
    }
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "fight win rate",
            "ability win rate",
          ],
        },
        {
          field: "fights",
          aliases: ["fights", "samples", "ability samples", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "fight wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "fight losses"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "fight win rate", "phase win rate"],
        },
        {
          field: "fights",
          aliases: ["fights", "samples", "phase samples", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "fight wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "fight losses"],
        },
        {
          field: "overall_win_rate",
          aliases: ["overall win rate", "overall winrate", "baseline"],
        },
        {
          field: "win_rate_delta",
          aliases: ["win rate delta", "winrate delta", "delta", "lift"],
        },
      ])
    );
  }

  if (dataset === "swap_impact") {
    const swapCountFilter = extractSwapCountFilter(normalized);
    const firstSwapTiming = pickFirstSwapTiming(normalized);
    if (
      includesPhrase(normalized, "without swaps") ||
      includesPhrase(normalized, "no swaps") ||
      includesPhrase(normalized, "not swap")
    ) {
      const filter = filterFor(dataset, "had_swap", "no");
      if (filter) filters.push(filter);
    } else if (
      (swapCountFilter && swapCountFilter.value !== 0) ||
      firstSwapTiming
    ) {
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
    if (
      firstSwapTiming &&
      !includesPhrase(normalized, "by swap timing") &&
      !includesPhrase(normalized, "per swap timing") &&
      !includesPhrase(normalized, "swap timing")
    ) {
      const filter = filterFor(dataset, "first_swap_timing", firstSwapTiming);
      if (filter) filters.push(filter);
    }
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "map win rate", "swap win rate"],
        },
        {
          field: "maps",
          aliases: [
            "maps",
            "games",
            "maps played",
            "games played",
            "sample size",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
        {
          field: "avg_swaps",
          aliases: ["avg swaps", "average swaps", "swaps per map"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "role win rate", "role winrate"],
        },
        {
          field: "maps",
          aliases: ["maps", "games", "role maps", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
        {
          field: "eliminations",
          aliases: ["total eliminations", "total elims", "elimination count"],
        },
        {
          field: "eliminations_per10",
          aliases: ["eliminations per 10", "elims per 10"],
        },
        {
          field: "final_blows",
          aliases: ["total final blows", "total finals", "final blow count"],
        },
        {
          field: "final_blows_per10",
          aliases: ["final blows per 10", "finals per 10"],
        },
        {
          field: "assists",
          aliases: ["total assists", "assist count"],
        },
        {
          field: "assists_per10",
          aliases: ["assists per 10", "offensive assists per 10"],
        },
        {
          field: "deaths",
          aliases: ["total deaths", "death count"],
        },
        {
          field: "deaths_per10",
          aliases: ["deaths per 10", "death rate"],
        },
        {
          field: "damage_per10",
          aliases: ["damage per 10", "hero damage per 10"],
        },
        {
          field: "healing_per10",
          aliases: ["healing per 10", "heals per 10"],
        },
        {
          field: "damage_taken_per10",
          aliases: ["damage taken per 10", "damage taken rate"],
        },
        {
          field: "ultimates_earned",
          aliases: [
            "total ults earned",
            "total ultimates earned",
            "ultimates earned count",
          ],
        },
        {
          field: "ults_earned_per10",
          aliases: [
            "ults earned per 10",
            "ultimates earned per 10",
            "ult charge per 10",
          ],
        },
        {
          field: "ultimates_used",
          aliases: [
            "total ults used",
            "total ultimates used",
            "ultimates used count",
          ],
        },
        {
          field: "ults_used_per10",
          aliases: ["ults used per 10", "ultimates used per 10"],
        },
        {
          field: "ult_efficiency",
          aliases: ["ult efficiency", "ultimate efficiency", "kills per ult"],
        },
      ])
    );
    filters.push(
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "time_played",
          aliases: ["time played", "playtime", "role time played", "played"],
        },
      ])
    );
  }

  if (
    dataset === "hero_pool" ||
    dataset === "hero_diversity" ||
    dataset === "hero_trend" ||
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

  if (dataset === "hero_diversity") {
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "diversity_score",
          aliases: [
            "diversity",
            "diversity score",
            "hero diversity",
            "hero diversity score",
          ],
        },
        {
          field: "role_coverage",
          aliases: ["role coverage", "coverage"],
        },
        {
          field: "unique_heroes",
          aliases: ["unique heroes", "heroes", "hero count"],
        },
        {
          field: "effective_hero_pool",
          aliases: [
            "effective hero pool",
            "effective heroes",
            "hero pool",
            "pool size",
          ],
        },
        {
          field: "role_capacity",
          aliases: ["role capacity", "available heroes"],
        },
        {
          field: "maps_played",
          aliases: ["maps played", "maps", "games", "sample size"],
        },
        {
          field: "appearances",
          aliases: ["appearances", "samples"],
        },
        {
          field: "average_maps_per_hero",
          aliases: [
            "average maps per hero",
            "avg maps per hero",
            "maps per hero",
          ],
        },
        {
          field: "specialist_heroes",
          aliases: ["specialist heroes", "specialists"],
        },
        {
          field: "shared_heroes",
          aliases: ["shared heroes", "shared hero count"],
        },
      ]),
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "total_playtime",
          aliases: ["total playtime", "time played", "playtime", "played"],
        },
      ])
    );
  }

  if (dataset === "hero_pool") {
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "hero win rate", "hero winrate"],
        },
        {
          field: "appearances",
          aliases: [
            "appearances",
            "hero appearances",
            "maps",
            "games",
            "sample size",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "hero wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "hero losses", "map losses"],
        },
        {
          field: "final_blows_per10",
          aliases: ["final blows per 10", "finals per 10"],
        },
        {
          field: "final_blows",
          aliases: ["total final blows", "total finals", "final blow count"],
        },
        {
          field: "eliminations_per10",
          aliases: ["eliminations per 10", "elims per 10"],
        },
        {
          field: "eliminations",
          aliases: ["total eliminations", "total elims", "elimination count"],
        },
        {
          field: "deaths_per10",
          aliases: ["deaths per 10", "death rate"],
        },
        {
          field: "deaths",
          aliases: ["total deaths", "death count"],
        },
        {
          field: "assists_per10",
          aliases: ["assists per 10", "offensive assists per 10"],
        },
        {
          field: "assists",
          aliases: ["total assists", "assist count"],
        },
        {
          field: "hero_damage_per10",
          aliases: ["hero damage per 10", "damage per 10"],
        },
        {
          field: "hero_damage",
          aliases: ["total hero damage", "total damage"],
        },
        {
          field: "damage_taken_per10",
          aliases: ["damage taken per 10", "damage taken rate"],
        },
        {
          field: "damage_taken",
          aliases: ["total damage taken", "damage taken count"],
        },
        {
          field: "healing_per10",
          aliases: ["healing per 10", "heals per 10"],
        },
        {
          field: "healing",
          aliases: ["total healing", "total heals", "healing count"],
        },
        {
          field: "ultimates_earned_per10",
          aliases: [
            "ults earned per 10",
            "ultimates earned per 10",
            "ult charge per 10",
          ],
        },
        {
          field: "ultimates_earned",
          aliases: [
            "total ults earned",
            "total ultimates earned",
            "ultimates earned count",
          ],
        },
        {
          field: "ultimates_used_per10",
          aliases: [
            "ults used per 10",
            "ultimates used per 10",
            "ult usage per 10",
          ],
        },
        {
          field: "ultimates_used",
          aliases: [
            "total ults used",
            "total ultimates used",
            "ultimates used count",
          ],
        },
        {
          field: "kd",
          aliases: ["kd", "k d", "final blows per death"],
        },
        {
          field: "ult_efficiency",
          aliases: ["ult efficiency", "ultimate efficiency", "kills per ult"],
        },
      ])
    );
    filters.push(
      ...extractDurationThresholdFilters(dataset, normalized, [
        {
          field: "total_time_played",
          aliases: [
            "total time played",
            "total playtime",
            "total hero time played",
          ],
        },
      ])
    );
  }

  if (dataset === "player_intelligence") {
    const primaryHeroIntent = wantsPrimaryHeroFilter(normalized);
    const mostPlayedHeroIntent = wantsMostPlayedHeroFilter(normalized);
    if (heroes.length > 0 && (primaryHeroIntent || mostPlayedHeroIntent)) {
      for (let i = filters.length - 1; i >= 0; i--) {
        if (filters[i].field === "hero") filters.splice(i, 1);
      }
      filters.push({
        field: mostPlayedHeroIntent ? "most_played_hero" : "primary_hero",
        op: "in",
        value: heroes,
      });
    }

    if (wantsNonPrimaryHeroFilter(normalized)) {
      filters.push({ field: "is_primary", op: "eq", value: "no" });
    } else if (
      primaryHeroIntent &&
      (includesPhrase(normalized, "which heroes") ||
        includesPhrase(normalized, "what heroes") ||
        includesPhrase(normalized, "show heroes") ||
        includesPhrase(normalized, "by hero"))
    ) {
      filters.push({ field: "is_primary", op: "eq", value: "yes" });
    }

    if (
      mostPlayedHeroIntent &&
      (includesPhrase(normalized, "which heroes") ||
        includesPhrase(normalized, "what heroes") ||
        includesPhrase(normalized, "show heroes") ||
        includesPhrase(normalized, "by hero"))
    ) {
      filters.push({ field: "is_most_played", op: "eq", value: "yes" });
    }

    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "hero_pool_size",
          aliases: ["hero pool size", "hero pool", "heroes"],
        },
        {
          field: "primary_time_share",
          aliases: [
            "primary time share",
            "primary share",
            "most played share",
            "hero dependency",
            "hero dependence",
          ],
        },
        {
          field: "substitution_rate",
          aliases: [
            "substitution rate",
            "forced substitution rate",
            "forced off rate",
          ],
        },
        {
          field: "maps_forced",
          aliases: ["forced maps", "maps forced", "forced off maps"],
        },
        {
          field: "primary_secondary_delta",
          aliases: [
            "primary secondary delta",
            "primary-secondary delta",
            "primary gap",
            "hero gap",
          ],
        },
        {
          field: "composite_z_score",
          aliases: ["composite z score", "z score", "z-score"],
        },
        {
          field: "maps_played",
          aliases: ["maps played", "maps", "sample maps", "sample size"],
        },
        {
          field: "time_played",
          aliases: ["seconds played"],
        },
        {
          field: "elims_per10",
          aliases: ["eliminations per 10", "elims per 10"],
        },
        {
          field: "deaths_per10",
          aliases: ["deaths per 10", "death rate"],
        },
        {
          field: "damage_per10",
          aliases: ["damage per 10", "hero damage per 10"],
        },
        {
          field: "healing_per10",
          aliases: ["healing per 10", "heals per 10"],
        },
      ])
    );
  }

  if (dataset === "ban_impact") {
    if (
      includesPhrase(normalized, "banned by us") ||
      includesPhrase(normalized, "we ban") ||
      includesPhrase(normalized, "we banned") ||
      includesPhrase(normalized, "by us") ||
      includesPhrase(normalized, "our bans") ||
      includesPhrase(normalized, "strong ban") ||
      includesPhrase(normalized, "strong bans")
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "ban_rate",
          aliases: ["ban rate", "banned rate"],
        },
        {
          field: "maps_banned",
          aliases: ["maps banned", "bans", "ban count", "total bans"],
        },
        {
          field: "maps_played",
          aliases: [
            "maps analyzed",
            "maps played",
            "sample maps",
            "sample size",
          ],
        },
        {
          field: "win_rate_with",
          aliases: ["win rate with ban", "winrate with ban"],
        },
        {
          field: "win_rate_without",
          aliases: ["win rate without ban", "winrate without ban"],
        },
        {
          field: "win_rate_delta",
          aliases: ["win rate delta", "winrate delta", "impact", "delta"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "combo win rate",
            "response win rate",
          ],
        },
        {
          field: "uses",
          aliases: [
            "uses",
            "usage",
            "fights",
            "combo count",
            "response count",
            "sample size",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "fight wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "fight losses"],
        },
      ])
    );
  }

  if (dataset === "role_trio" || dataset === "roster_variant") {
    const lineupPlayerFilters = extractLineupPlayerFilters(question);
    if (lineupPlayerFilters.length > 0) {
      for (let i = filters.length - 1; i >= 0; i--) {
        if (filters[i].field === "player") filters.splice(i, 1);
      }
      filters.push(...lineupPlayerFilters);
    }
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: [
            "win rate",
            "winrate",
            "lineup win rate",
            "roster win rate",
          ],
        },
        {
          field: "games",
          aliases: [
            "games",
            "maps",
            "games played",
            "maps played",
            "sample size",
          ],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
      ])
    );
  }

  if (dataset === "roster_variant" && asksBestRosterForEachMap(normalized)) {
    filters.push({ field: "is_best_for_map", op: "eq", value: "yes" });
  }

  if (dataset === "ult_impact") {
    const scenario = pickUltImpactScenario(normalized);
    if (scenario) {
      filters.push({ field: "scenario", op: "eq", value: scenario });
    } else if (mentionsUltSideComparison(normalized)) {
      filters.push({ field: "side", op: "in", value: ["us", "enemy"] });
    } else if (mentionsEnemyUltSide(normalized)) {
      filters.push({ field: "side", op: "in", value: ["enemy", "both"] });
    } else if (mentionsOurUltSide(normalized)) {
      filters.push({ field: "side", op: "in", value: ["us", "both"] });
    }

    if (
      !scenario &&
      (includesPhrase(normalized, "uncontested ult") ||
        includesPhrase(normalized, "uncontested ultimate") ||
        includesPhrase(normalized, "not mirrored") ||
        includesPhrase(normalized, "without mirror"))
    ) {
      filters.push({ field: "mirrored", op: "eq", value: "no" });
    } else if (
      !scenario &&
      (includesPhrase(normalized, "mirror ult") ||
        includesPhrase(normalized, "mirror ultimate") ||
        includesPhrase(normalized, "mirrored ult") ||
        includesPhrase(normalized, "mirrored ultimate"))
    ) {
      filters.push({ field: "mirrored", op: "eq", value: "yes" });
    }

    if (
      !scenario &&
      (includesPhrase(normalized, "we first") ||
        includesPhrase(normalized, "ours first") ||
        includesPhrase(normalized, "our ult first") ||
        includesPhrase(normalized, "we ult first"))
    ) {
      filters.push({ field: "first_side", op: "eq", value: "us" });
    } else if (
      !scenario &&
      (includesPhrase(normalized, "enemy first") ||
        includesPhrase(normalized, "they first") ||
        includesPhrase(normalized, "enemy ult first") ||
        includesPhrase(normalized, "enemy ults first") ||
        includesPhrase(normalized, "they ult first"))
    ) {
      filters.push({ field: "first_side", op: "eq", value: "enemy" });
    }
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "ult win rate", "ultimate win rate"],
        },
        {
          field: "fights",
          aliases: ["fights", "ult fights", "ultimate fights", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "fight wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "fight losses"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "ults_used",
          aliases: [
            "ults used",
            "ultimates used",
            "ultimate uses",
            "total ults",
            "total ultimates",
          ],
        },
        {
          field: "maps_played",
          aliases: ["maps", "maps played", "games", "sample size"],
        },
        {
          field: "ults_per_map",
          aliases: [
            "ults per map",
            "ultimates per map",
            "ults per game",
            "ultimates per game",
            "ults per match",
            "ultimates per match",
            "ult rate",
          ],
        },
        {
          field: "fight_openings",
          aliases: [
            "fight openings",
            "opening ults",
            "opening ultimates",
            "fight-opening ults",
          ],
        },
        {
          field: "fight_openings_per_map",
          aliases: [
            "fight openings per map",
            "fight openings per game",
            "fight openings per match",
            "fight opener per map",
            "fight opener per game",
            "fight opener per match",
            "fight openers per map",
            "fight openers per game",
            "fight openers per match",
            "opening ults per map",
            "opening ults per game",
            "opening ults per match",
            "opening ultimates per map",
            "opening ultimates per game",
            "opening ultimates per match",
            "open fights with ult per map",
            "open fights with ult per game",
            "open fights with ult per match",
          ],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "win_rate",
          aliases: ["win rate", "winrate", "map win rate"],
        },
        {
          field: "maps",
          aliases: ["maps", "games", "maps played", "sample size"],
        },
        {
          field: "wins",
          aliases: ["wins", "map wins"],
        },
        {
          field: "losses",
          aliases: ["losses", "map losses"],
        },
      ])
    );
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
    filters.push(
      ...extractNumericThresholdFilters(dataset, normalized, [
        {
          field: "length",
          aliases: ["streak length", "length", "maps", "games"],
        },
        {
          field: "streaks",
          aliases: ["streak count", "number of streaks"],
        },
      ])
    );
  }

  filters.push(
    ...extractGenericAggregateThresholdFilters(dataset, normalized, filters)
  );

  return mergeInFilters(filters).slice(0, 8);
}

function mergeInFilters(filters: QueryFilter[]): QueryFilter[] {
  const merged: QueryFilter[] = [];
  const byField = new Map<string, QueryFilter>();

  for (const filter of filters) {
    if (filter.op !== "in") {
      merged.push(filter);
      continue;
    }

    const key = `${filter.field}:${filter.op}`;
    const existing = byField.get(key);
    if (!existing) {
      const value = Array.isArray(filter.value)
        ? [...filter.value]
        : [filter.value];
      const next = { ...filter, value };
      byField.set(key, next);
      merged.push(next);
      continue;
    }

    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const existingValues = Array.isArray(existing.value)
      ? existing.value
      : [existing.value];
    for (const value of values) {
      if (!existingValues.includes(value)) existingValues.push(value);
    }
    existing.value = existingValues;
  }

  return merged;
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

  function hasMultiValueFilter(field: string): boolean {
    return filters.some(
      (f) => f.field === field && Array.isArray(f.value) && f.value.length > 1
    );
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

  if (hasMultiValueFilter("player")) {
    add("player");
  }
  if (hasMultiValueFilter("hero")) {
    add("hero");
  }
  if (hasMultiValueFilter("our_hero")) {
    add("our_hero");
  }
  if (hasMultiValueFilter("enemy_hero")) {
    add("enemy_hero");
  }
  if (hasMultiValueFilter("map")) {
    add("map");
  }
  if (hasMultiValueFilter("opponent")) {
    add("opponent");
  }
  if (hasMultiValueFilter("ability")) {
    add("ability");
  }
  if (hasMultiValueFilter("role")) {
    add("role");
  }
  if (hasMultiValueFilter("enemy_role")) {
    add("enemy_role");
  }
  if (hasMultiValueFilter("map_type")) {
    add("map_type");
  }
  if (hasMultiValueFilter("side") && mentionsUltSideComparison(normalized)) {
    add("side");
  }

  if (
    (includesPhrase(normalized, "who") ||
      includesPhrase(normalized, "whose") ||
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players") ||
      includesPhrase(normalized, "rank player") ||
      includesPhrase(normalized, "rank players") ||
      includesPhrase(normalized, "player leaderboard") ||
      includesPhrase(normalized, "players leaderboard")) &&
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
      includesPhrase(normalized, "by hero") ||
      includesPhrase(normalized, "rank hero") ||
      includesPhrase(normalized, "rank heroes") ||
      includesPhrase(normalized, "hero leaderboard") ||
      includesPhrase(normalized, "heroes leaderboard")) &&
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
    (includesPhrase(normalized, "which map type") ||
      includesPhrase(normalized, "which map types") ||
      includesPhrase(normalized, "what map type") ||
      includesPhrase(normalized, "what map types")) &&
    !hasFilter("map_type")
  ) {
    add("map_type");
  }
  if (
    (includesPhrase(normalized, "which opponent") ||
      includesPhrase(normalized, "which opponents") ||
      includesPhrase(normalized, "what opponent") ||
      includesPhrase(normalized, "what opponents")) &&
    !hasFilter("opponent")
  ) {
    add("opponent");
  }
  if (dataset === "kill" && dims.length === 0) {
    if (
      asksKillVictim(normalized) &&
      (includesPhrase(normalized, "which hero") ||
        includesPhrase(normalized, "which heroes") ||
        includesPhrase(normalized, "what hero") ||
        includesPhrase(normalized, "what heroes"))
    ) {
      add("victim_hero");
    } else if (
      asksKillVictim(normalized) &&
      (hasFilter("attacker") || hasFilter("attacker_hero"))
    ) {
      add("victim");
    } else if (!hasFilter("attacker")) {
      add("attacker");
    } else if (!hasFilter("attacker_hero")) {
      add("attacker_hero");
    }
  }
  if (
    dataset === "player_stat" &&
    dims.length === 0 &&
    mentionsRankingIntent(normalized) &&
    !hasFilter("player")
  ) {
    add("player");
  }
  if (dataset === "hero_swap" && dims.length === 0) {
    if (
      includesPhrase(normalized, "who") ||
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players")
    ) {
      if (!hasFilter("player")) add("player");
    } else if (hasFilter("to_hero") && !hasFilter("from_hero")) {
      add("from_hero");
    } else if (hasFilter("from_hero") && !hasFilter("to_hero")) {
      add("to_hero");
    } else if (!hasFilter("to_hero")) {
      add("to_hero");
    }
  }
  if (dataset === "ultimate" && dims.length === 0) {
    if (
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players") ||
      includesPhrase(normalized, "who") ||
      includesPhrase(normalized, "by player")
    ) {
      if (!hasFilter("player")) add("player");
    } else if (
      includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "which heroes") ||
      includesPhrase(normalized, "by hero")
    ) {
      if (!hasFilter("hero")) add("hero");
    } else if (!hasFilter("player")) {
      add("player");
    } else if (!hasFilter("hero")) {
      add("hero");
    }
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
    (!hasFilter("player") ||
      includesPhrase(normalized, "which players") ||
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "who"))
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
    !hasFilter("enemy_hero") &&
    !hasFilter("enemy_role")
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
  if (dataset === "roster_variant" && dims.length === 0) {
    if (asksBestRosterForEachMap(normalized)) {
      add("map");
    }
    add("roster");
  }
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
    !mentionsRankingIntent(normalized) &&
    !(
      dataset === "hero_pickrate" &&
      (includesPhrase(normalized, "owns") ||
        includesPhrase(normalized, "ownership") ||
        includesPhrase(normalized, "owned by"))
    ) &&
    !(
      dataset === "player_intelligence" &&
      (includesPhrase(normalized, "z score") ||
        includesPhrase(normalized, "z-score") ||
        includesPhrase(normalized, "composite z score"))
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
    mentionsHighRankingIntent(normalized) ||
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
        includesPhrase(normalized, "owned by"))) ||
    (dataset === "player_intelligence" &&
      (includesPhrase(normalized, "z score") ||
        includesPhrase(normalized, "z-score") ||
        includesPhrase(normalized, "composite z score")));
  const wantsLow = mentionsLowRankingIntent(normalized);
  const wantsBest = includesPhrase(normalized, "best");
  const wantsWorst = includesPhrase(normalized, "worst");
  const dir = wantsLow
    ? "asc"
    : wantsHigh
      ? "desc"
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
