import { allHeroes } from "@/types/heroes";
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
  ult_economy: "win_rate",
  duel: "win_rate",
  ability_impact: "win_rate",
  swap_impact: "win_rate",
  hero_pool: "win_rate",
  enemy_hero: "win_rate",
  ban_impact: "win_rate_delta",
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
    "fleta",
    "first pick percentage",
    "first death percentage",
    "duel winrate",
    "ult charge time",
  ],
  kill: ["kill feed", "kills by", "killed", "critical kill", "victim"],
  hero_swap: ["swap", "swaps", "swapped", "hero swap"],
  ultimate: ["ultimate used", "ultimates used", "ults used"],
  map: ["maps played", "opponent", "map count"],
  teamfight: [
    "fight",
    "teamfight",
    "team fight",
    "first pick",
    "first death",
    "dry fight",
    "wasted ult",
  ],
  map_result: ["map win", "map winrate", "map win rate", "record by map"],
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
  time_played: ["time played", "playtime", "played it", "played them"],
  hero_damage: ["hero damage", "damage dealt", "damage per 10"],
  all_damage: ["all damage", "total damage"],
  damage_taken: ["damage taken", "damage taken per 10"],
  healing: ["healing", "heals", "healing per 10"],
  ults_used: ["ults used", "ultimates used", "ultimate usage"],
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
  avg_wasted_ults: ["wasted ult", "wasted ults", "wasted ultimates"],
  win_rate: ["winrate", "winrates", "win rate", "win rates", "wr"],
  fights: ["fights", "teamfights", "team fights"],
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
  result: ["result", "win loss"],
  dry_fight: ["dry fight"],
  first_pick: ["first pick"],
  first_death: ["first death"],
  first_ult: ["first ult", "first ultimate"],
  advantage_bucket: ["advantage bucket", "ult advantage"],
  ability: ["ability", "cooldown"],
  side: ["side", "team"],
  used: ["used", "usage"],
  scenario: ["scenario", "used vs not used"],
  role: ["role"],
  had_swap: ["had swap", "with swaps", "without swaps"],
  swap_count: ["swap count", "number of swaps"],
  swap_count_bucket: ["swap count bucket", "swaps"],
  first_swap_timing: ["first swap timing", "swap timing"],
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

function findHero(question: string): string | null {
  const normalized = normalize(question);
  const matches = Array.from(HERO_BY_NORMALIZED.entries())
    .filter(([alias]) => includesPhrase(normalized, alias))
    .sort((a, b) => b[0].length - a[0].length);
  return matches[0]?.[1] ?? null;
}

function findAbility(question: string): string | null {
  const normalized = normalize(question);
  const matches = Array.from(ABILITY_BY_NORMALIZED.entries())
    .filter(([alias]) => includesPhrase(normalized, alias))
    .sort((a, b) => b[0].length - a[0].length);
  return matches[0]?.[1] ?? null;
}

function findPlayer(question: string, hero: string | null): string | null {
  const heroWords = new Set(normalize(hero ?? "").split(/\s+/));
  const candidates = [
    ...question.matchAll(
      /\b(?:for|player|by)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\b/gi
    ),
    ...question.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,})\s+(?:has|had)\b/gi),
  ];

  for (const match of candidates) {
    const candidate = match[1];
    const normalized = normalize(candidate);
    if (
      !normalized ||
      FILLER_WORDS.has(normalized) ||
      heroWords.has(normalized)
    ) {
      continue;
    }
    return candidate === candidate.toUpperCase()
      ? candidate
      : titleCase(candidate);
  }
  return null;
}

function pickDataset(question: string): DatasetId {
  if (findAbility(question)) return "ability_impact";

  const normalized = normalize(question);
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
    | "map_type"
    | "ability"
    | "side"
    | "used"
    | "had_swap"
    | "role",
  value: string
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
  return {
    field: field.id,
    op: field.operators.includes("in") ? "in" : "eq",
    value: field.operators.includes("in") ? [value] : value,
  };
}

function pickFilters(dataset: DatasetId, question: string): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const hero = findHero(question);
  const ability = findAbility(question);
  const player = findPlayer(question, hero);
  const normalized = normalize(question);

  if (hero) {
    const filter = filterFor(dataset, "hero", hero);
    if (filter) filters.push(filter);
  }
  if (player) {
    const filter = filterFor(dataset, "player", player);
    if (filter) filters.push(filter);
  }
  if (ability) {
    const filter = filterFor(dataset, "ability", ability);
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

  if (includesPhrase(normalized, "who") && !hasFilter("player")) add("player");
  if (
    (includesPhrase(normalized, "which hero") ||
      includesPhrase(normalized, "by hero")) &&
    !hasFilter("hero")
  ) {
    add(ds.dimensions.some((d) => d.id === "our_hero") ? "our_hero" : "hero");
  }
  if (
    includesPhrase(normalized, "which map") ||
    includesPhrase(normalized, "which maps") ||
    includesPhrase(normalized, "by map") ||
    includesPhrase(normalized, "by maps")
  ) {
    add("map");
  }
  if (dataset === "ult_economy" && dims.length === 0) add("advantage_bucket");
  if (dataset === "duel" && dims.length === 0) {
    add("our_hero");
    add("enemy_hero");
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
    !includesPhrase(normalized, "worst")
  ) {
    return null;
  }
  const metric = getMetric(dataset, metrics[0].metric);
  const wantsLow =
    includesPhrase(normalized, "lowest") || includesPhrase(normalized, "worst");
  const dir = wantsLow || metric?.lowerIsBetter ? "asc" : "desc";
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
