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
  map_result: "win_rate",
  player_map_performance: "win_rate",
  ult_economy: "win_rate",
  duel: "win_rate",
  ability_impact: "win_rate",
  swap_impact: "win_rate",
  hero_pool: "win_rate",
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
    "last five",
    "last ten",
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
    "top heroes",
    "best heroes",
    "most played hero",
    "most played heroes",
    "damage heroes",
    "support heroes",
    "tank heroes",
    "role performance",
    "by role",
    "per role",
    "damage per 10",
    "healing per 10",
    "deaths per 10",
    "ultimate efficiency",
    "ult efficiency",
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
  first_death_pct: [
    "first death",
    "first death percentage",
    "first death rate",
    "opening death rate",
  ],
  first_death_count: ["first deaths", "first death count", "opening deaths"],
  ajax_count: ["ajax", "ajaxes", "ajax count"],
  ult_charge_time: [
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
  ults_used: [
    "ults used",
    "ultimates used",
    "ultimate usage",
    "most ults",
    "most ultimates",
  ],
  ultimates_used: ["ults used", "ultimates used", "ultimate usage"],
  ultimates_earned: ["ults earned", "ultimates earned"],
  ult_efficiency: [
    "ultimate efficiency",
    "ult efficiency",
    "eliminations per ultimate",
    "elims per ult",
  ],
  kd: ["kd", "k d", "final blows per death"],
  ban_rate: ["ban rate", "banned rate", "most banned"],
  maps_banned: ["maps banned", "bans", "ban count", "total bans"],
  win_rate_delta: [
    "win rate delta",
    "winrate delta",
    "impact",
    "weak point",
    "weak points",
    "strong ban",
    "strong bans",
  ],
  win_rate_with: ["win rate with ban", "winrate with ban"],
  win_rate_without: ["win rate without ban", "winrate without ban"],
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
  avg_wasted_ults: ["wasted ult", "wasted ults", "wasted ultimates"],
  win_rate: ["winrate", "winrates", "win rate", "win rates", "wr"],
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
  side: ["side", "team"],
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
  had_swap: ["had swap", "with swaps", "without swaps"],
  swap_count: ["swap count", "number of swaps"],
  swap_count_bucket: ["swap count bucket", "swaps"],
  first_swap_timing: ["first swap timing", "swap timing"],
  streak: ["streak"],
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
  "by",
  "data",
  "find",
  "for",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "in",
  "it",
  "know",
  "map",
  "maps",
  "me",
  "need",
  "number",
  "of",
  "on",
  "our",
  "damage",
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
  "ult",
  "ults",
  "ultimate",
  "ultimates",
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
};

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
  const candidates = [
    ...question.matchAll(
      /\b(?:for|player|by)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\b/gi
    ),
    ...question.matchAll(
      /\b(?:with|alongside)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\b/gi
    ),
    ...question.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:has|had)\b/gi),
    ...question.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,})'s\s+/gi),
  ];

  for (const match of candidates) {
    const candidate = match[1];
    const normalized = normalize(candidate);
    if (
      !normalized ||
      FILLER_WORDS.has(normalized) ||
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
    includesPhrase(normalized, "last five") ||
    includesPhrase(normalized, "last ten") ||
    includesPhrase(normalized, "weekly") ||
    includesPhrase(normalized, "by week") ||
    includesPhrase(normalized, "monthly") ||
    includesPhrase(normalized, "by month") ||
    includesPhrase(normalized, "day of week") ||
    includesPhrase(normalized, "by day")
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

function mentionsTeamfightUltContext(normalized: string): boolean {
  return (
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
  if (mentionsCalculatedStatContext(normalized)) return "calculated_stat";
  if (mentionsStreakContext(normalized)) return "streak";
  if (mentionsTrendContext(normalized)) return "trend";
  if (findAbility(question)) return "ability_impact";

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

function pickMetrics(dataset: DatasetId, question: string): MetricRef[] {
  const normalized = normalize(question);
  const ds = getDataset(dataset);
  const refs: MetricRef[] = [];

  for (const metric of ds.metrics) {
    const aliases = [
      metric.id.replace(/_/g, " "),
      metric.label,
      ...(METRIC_ALIASES[metric.id] ?? []),
    ];
    if (aliases.some((alias) => includesPhrase(normalized, alias))) {
      const agg = pickMetricAgg(dataset, metric.id, question);
      if (agg) refs.push({ metric: metric.id, agg });
    }
  }

  if (dataset === "teamfight" && includesPhrase(normalized, "wasted ult")) {
    refs.push({ metric: "avg_wasted_ults", agg: "avg" });
  }

  if (refs.length === 0) {
    const fallback = DEFAULT_METRIC[dataset];
    const agg = pickMetricAgg(dataset, fallback, question);
    if (agg) refs.push({ metric: fallback, agg });
  }

  const deduped = dedupeMetrics(refs);
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
    deduped.sort((a, b) =>
      a.metric === "ults_per_map" ? -1 : b.metric === "ults_per_map" ? 1 : 0
    );
  }
  if (dataset === "duel") {
    const wantsCount =
      includesPhrase(normalized, "how many") ||
      includesPhrase(normalized, "number") ||
      includesPhrase(normalized, "count") ||
      includesPhrase(normalized, "total");
    if (!wantsCount) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "duels") deduped.splice(i, 1);
      }
      if (!deduped.some((ref) => ref.metric === "win_rate")) {
        const agg = pickMetricAgg(dataset, "win_rate", question);
        if (agg) deduped.unshift({ metric: "win_rate", agg });
      }
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
    | "side"
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
    side: ["side"],
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
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return NUMBER_WORDS[normalized] ?? null;
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

  if (dataset === "teamfight") {
    if (includesPhrase(normalized, "first death")) {
      filters.push({ field: "first_death", op: "eq", value: "yes" });
    }
    if (includesPhrase(normalized, "first pick")) {
      filters.push({ field: "first_pick", op: "eq", value: "yes" });
    }
    if (includesPhrase(normalized, "dry fight")) {
      filters.push({ field: "dry_fight", op: "eq", value: "yes" });
    }
    if (
      includesPhrase(normalized, "first ult") ||
      includesPhrase(normalized, "first ultimate")
    ) {
      filters.push({ field: "first_ult", op: "eq", value: "yes" });
    }
    if (
      includesPhrase(normalized, "reversal") ||
      includesPhrase(normalized, "reverse fight")
    ) {
      filters.push({ field: "reversal", op: "eq", value: "yes" });
    }
    const ultCountFilter = extractUltCountFilter(normalized);
    if (ultCountFilter) filters.push(ultCountFilter);
    const wastedUltFilter = extractWastedUltFilter(normalized);
    if (wastedUltFilter) filters.push(wastedUltFilter);
  }

  if (dataset === "map_result") {
    const opponent = findOpponent(question);
    if (opponent) {
      filters.push({ field: "opponent", op: "in", value: [opponent] });
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

  if (dataset === "swap_impact") {
    if (
      includesPhrase(normalized, "without swaps") ||
      includesPhrase(normalized, "no swaps") ||
      includesPhrase(normalized, "not swap")
    ) {
      const filter = filterFor(dataset, "had_swap", "no");
      if (filter) filters.push(filter);
    } else if (
      includesPhrase(normalized, "with swaps") ||
      includesPhrase(normalized, "when we swap") ||
      includesPhrase(normalized, "when swapping")
    ) {
      const filter = filterFor(dataset, "had_swap", "yes");
      if (filter) filters.push(filter);
    }
  }

  if (dataset === "hero_pool") {
    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesPhrase(normalized, `${roleWord} heroes`) ||
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
    const lastMatch = normalized.match(/\blast\s+(\d{1,2})\s+maps?\b/);
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
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players")) &&
    !hasFilter("player")
  ) {
    add("player");
  }
  if (
    (includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "by hero")) &&
    !hasFilter("hero") &&
    !hasFilter("our_hero")
  ) {
    add(ds.dimensions.some((d) => d.id === "our_hero") ? "our_hero" : "hero");
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
    dataset === "ult_economy" &&
    dims.length === 0 &&
    !hasFilter("advantage_bucket")
  ) {
    add("advantage_bucket");
  }
  if (dataset === "duel" && dims.length === 0) {
    const hasOurHeroFilter = hasFilter("our_hero");
    const hasEnemyHeroFilter = hasFilter("enemy_hero");
    if (!hasOurHeroFilter) add("our_hero");
    if (!hasEnemyHeroFilter) add("enemy_hero");
  }
  if (dataset === "ability_impact" && dims.length === 0) {
    add(hasFilter("used") ? "ability" : "used");
  }
  if (dataset === "swap_impact" && dims.length === 0) {
    add(hasFilter("had_swap") ? "swap_count_bucket" : "had_swap");
  }
  if (dataset === "hero_pool" && dims.length === 0) {
    add("hero");
  }
  if (dataset === "player_map_performance" && dims.length === 0) {
    if (!hasFilter("player")) add("player");
    if (!hasFilter("map")) add("map");
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

function pickTimeScope(question: string): QuerySpec["timeScope"] {
  const normalized = normalize(question);
  const lastN = normalized.match(/\blast\s+(\d{1,3})\s+scrims?\b/);
  if (lastN) return { kind: "lastN", lastN: Number(lastN[1]) };
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
    !includesPhrase(normalized, "best") &&
    !includesPhrase(normalized, "lowest") &&
    !includesPhrase(normalized, "worst") &&
    !includesPhrase(normalized, "fastest") &&
    !includesPhrase(normalized, "slowest")
  ) {
    return null;
  }
  const metric = getMetric(dataset, metrics[0].metric);
  const wantsHigh =
    includesPhrase(normalized, "top") ||
    includesPhrase(normalized, "most") ||
    includesPhrase(normalized, "highest") ||
    includesPhrase(normalized, "slowest");
  const wantsLow =
    includesPhrase(normalized, "lowest") ||
    includesPhrase(normalized, "fastest");
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
    timeScope: pickTimeScope(trimmed),
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
