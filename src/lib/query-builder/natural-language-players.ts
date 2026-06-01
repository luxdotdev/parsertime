import {
  FILLER_WORDS,
  HERO_BY_NORMALIZED,
  MAP_BY_NORMALIZED,
  findMapName,
} from "@/lib/query-builder/natural-language-entities";
import {
  escapeRegExp,
  includesAnyPhrase,
  includesPhrase,
  normalize,
  titleCase,
} from "@/lib/query-builder/natural-language-text";
import type { QueryFilter } from "@/lib/query-builder/types";

export function findPlayer(
  question: string,
  hero: string | null
): string | null {
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
      /\b(?:has|have)\s+([A-Za-z][A-Za-z0-9_.-]{1,})\s+used\b/gi
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

export function extractComparedPlayers(question: string): string[] {
  const normalized = normalize(question);
  const hasCompareContext = includesAnyPhrase(normalized, [
    "compare",
    "comparison",
    "between",
    "vs",
    "versus",
  ]);
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

export function extractLineupPlayerFilters(question: string): QueryFilter[] {
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

export function asksBestRosterForEachMap(normalized: string): boolean {
  return (
    (includesPhrase(normalized, "best roster") ||
      includesPhrase(normalized, "best rosters") ||
      includesPhrase(normalized, "top roster") ||
      includesPhrase(normalized, "top rosters") ||
      includesPhrase(normalized, "best lineup") ||
      includesPhrase(normalized, "best lineups") ||
      includesPhrase(normalized, "best comp") ||
      includesPhrase(normalized, "best comps") ||
      includesPhrase(normalized, "top comp") ||
      includesPhrase(normalized, "top comps") ||
      includesPhrase(normalized, "best composition") ||
      includesPhrase(normalized, "best compositions")) &&
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

export function findOpponent(question: string): string | null {
  return findOpponents(question)[0] ?? null;
}

export function findOpponents(question: string): string[] {
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
