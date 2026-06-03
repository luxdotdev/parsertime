import {
  getDataset,
  getMetric,
  type FilterDef,
} from "@/lib/query-builder/registry";
import {
  durationSeconds,
  escapeRegExp,
  includesAnyPhrase,
  includesPhrase,
  INTEGER_TOKEN,
  normalize,
  numberFromToken,
  NUMBER_TOKEN,
} from "@/lib/query-builder/natural-language-text";
import type { DatasetId, QueryFilter } from "@/lib/query-builder/types";

export function extractTimePlayedFilter(
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

  const timeIntent = includesAnyPhrase(normalized, [
    "time played",
    "playtime",
    "minutes played",
    "minute played",
    "seconds played",
    "second played",
  ]);
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

export function extractNumericThresholdFilters(
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

export function extractDurationThresholdFilters(
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

export function extractGenericAggregateThresholdFilters(
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
    existing.map(
      (filter) => `${filter.field}:${filter.op}:${String(filter.value)}`
    )
  );
  const seenThresholds = new Set(
    existing
      .filter((filter) => typeof filter.value === "number")
      .map((filter) => `${filter.op}:${String(filter.value)}`)
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

export function extractOpeningKillTimeFilters(
  normalized: string
): QueryFilter[] {
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

export function extractRotationDeathSignalFilters(
  normalized: string
): QueryFilter[] {
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

export function hasAverageRotationSignalIntent(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "average pre fight damage",
    "average pre-fight damage",
    "avg pre fight damage",
    "avg pre-fight damage",
    "average kill distance",
    "avg kill distance",
    "average death distance",
    "avg death distance",
  ]);
}

export function extractUltCountFilter(normalized: string): QueryFilter | null {
  if (
    includesAnyPhrase(normalized, [
      "no ults",
      "no ultimates",
      "without ults",
      "without ultimates",
      "zero ults",
      "zero ultimates",
    ])
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

export function extractSwapCountFilter(normalized: string): QueryFilter | null {
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

export function pickFirstSwapTiming(normalized: string): string | null {
  if (
    includesAnyPhrase(normalized, [
      "early swap",
      "early swaps",
      "early first swap",
      "first swap early",
    ])
  ) {
    return "early";
  }
  if (
    includesAnyPhrase(normalized, [
      "mid swap",
      "mid swaps",
      "mid first swap",
      "first swap mid",
      "middle swap",
      "middle first swap",
    ])
  ) {
    return "mid";
  }
  if (
    includesAnyPhrase(normalized, [
      "late swap",
      "late swaps",
      "late first swap",
      "first swap late",
    ])
  ) {
    return "late";
  }
  return null;
}

export function extractWastedUltFilter(normalized: string): QueryFilter | null {
  const mentionsWastedUlt = includesAnyPhrase(normalized, [
    "wasted ult",
    "wasted ults",
    "wasted ultimate",
    "wasted ultimates",
  ]);

  if (
    includesAnyPhrase(normalized, [
      "no wasted ults",
      "no wasted ultimates",
      "without wasted ults",
      "without wasted ultimates",
    ])
  ) {
    return { field: "wasted_ults", op: "eq", value: 0 };
  }
  if (
    mentionsWastedUlt &&
    (includesAnyPhrase(normalized, ["average wasted", "avg wasted"]) ||
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
    includesAnyPhrase(normalized, [
      "waste an ult",
      "waste ult",
      "waste ults",
      "waste ultimate",
      "waste ultimates",
    ])
  ) {
    return { field: "wasted_ults", op: "gte", value: 1 };
  }
  return null;
}
