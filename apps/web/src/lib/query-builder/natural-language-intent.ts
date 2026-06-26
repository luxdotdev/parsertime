import {
  escapeRegExp,
  includesAnyPhrase,
  includesPhrase,
  normalize,
} from "@/lib/query-builder/natural-language-text";

export function mentionsFightContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "fight",
    "fights",
    "teamfight",
    "teamfights",
    "team fight",
    "team fights",
  ]);
}

export function mentionsTrendContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
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
  ]);
}

export function mentionsMapIntelligenceContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
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
      "maps are improving",
      "declining maps",
      "maps are declining",
      "map type dependency",
      "map type dependencies",
    ]) ||
    (includesAnyPhrase(normalized, [
      "confidence",
      "confident",
      "thin sample",
      "small sample",
      "not enough data",
    ]) &&
      includesAnyPhrase(normalized, ["map", "maps"])) ||
    (includesAnyPhrase(normalized, ["improving", "declining"]) &&
      includesAnyPhrase(normalized, ["map", "maps"]))
  );
}

export function mentionsTeamPerformanceContext(normalized: string): boolean {
  if (
    includesAnyPhrase(normalized, [
      "teamfight",
      "teamfights",
      "team fight",
      "team fights",
    ])
  ) {
    return false;
  }

  const teamContext = includesAnyPhrase(normalized, [
    "team performance",
    "team stats",
    "team stat",
    "team aggregate",
    "team comparison",
    "our team",
    "opponent team",
    "enemy team",
    "us vs them",
    "us versus them",
    "we compared to them",
  ]);
  const teamMetric = includesAnyPhrase(normalized, [
    "win rate",
    "winrate",
    "final blows",
    "eliminations",
    "solo kills",
    "objective kills",
    "assists",
    "damage",
    "healing",
    "deaths",
    "first pick",
    "first death",
    "ajax",
    "mvp",
    "ult",
    "ultimate",
  ]);

  return teamContext && teamMetric;
}

export function mentionsPlayerTrendContext(normalized: string): boolean {
  if (includesAnyPhrase(normalized, ["player trend", "player trends"])) {
    return true;
  }

  const trendIntent = includesAnyPhrase(normalized, [
    "improving",
    "improve",
    "improved",
    "declining",
    "decline",
    "declined",
    "trending up",
    "trending down",
  ]);
  const playerContext = includesAnyPhrase(normalized, [
    "who",
    "whose",
    "which player",
    "which players",
    "player",
    "players",
  ]);
  const mapContext = includesAnyPhrase(normalized, [
    "map",
    "maps",
    "map type",
    "map mode",
  ]);

  return trendIntent && playerContext && !mapContext;
}

export function mentionsPlayerOutlierContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "outlier",
      "outliers",
      "hero baseline",
      "above baseline",
      "below baseline",
      "far above",
      "far below",
      "overperforming",
      "over performing",
      "underperforming",
      "under performing",
    ]) ||
    (includesPhrase(normalized, "percentile") &&
      includesAnyPhrase(normalized, ["player", "players", "who", "whose"]))
  );
}

export function mentionsStatVersusPlaytimeContext(normalized: string): boolean {
  return (
    (includesAnyPhrase(normalized, [
      "versus time",
      "vs time",
      "against time",
      "compared to time",
      "relative to time",
      "relative to playtime",
      "compared to playtime",
      "versus playtime",
      "vs playtime",
    ]) ||
      /\b(?:versus|vs|against)\s+(?:the\s+)?(?:time|playtime)\b/.test(
        normalized
      ) ||
      /\b(?:compared|relative)\s+to\s+(?:the\s+)?(?:time|playtime|time\s+played|minutes?\s+played|seconds?\s+played|hours?\s+played)\b/.test(
        normalized
      ) ||
      /\b(?:normalized|normalised|adjusted)\s+(?:by|for|to)\s+(?:the\s+)?(?:time|playtime|time\s+played|minutes?\s+played|seconds?\s+played|hours?\s+played)\b/.test(
        normalized
      )) &&
    includesAnyPhrase(normalized, [
      "time played",
      "playtime",
      "minutes played",
      "minute played",
      "seconds played",
      "second played",
      "hours played",
      "hour played",
      "played it",
      "played them",
      "time",
    ])
  );
}

export function mentionsFightOpeningUltContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "fight openings",
    "fight opener",
    "fight openers",
    "open fights",
    "opens fights",
    "start fights",
    "starts fights",
    "opening ult",
    "opening ultimate",
  ]);
}

export function mentionsPlayerStatMetricContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "final blow",
    "final blows",
    "eliminations",
    "elims",
    "deaths",
    "assists",
    "damage",
    "healing",
    "time played",
    "playtime",
    "accuracy",
    "best multikill",
    "multikill best",
  ]);
}

export function mentionsPlayerTargetContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "player target",
      "player targets",
      "gap to target",
      "gap to goal",
      "target progress",
      "goal progress",
      "progress toward target",
      "progress toward goal",
      "current value",
      "baseline value",
      "target value",
      "goal value",
      "target percent",
      "target percentage",
      "target change",
      "goal change",
      "scrim window",
      "target window",
      "sample scrims",
      "scrim sample",
      "saved target",
      "saved goal",
      "on track",
      "off track",
      "stalled target",
      "stalled goal",
    ]) ||
    (includesAnyPhrase(normalized, ["goal", "goals", "target", "targets"]) &&
      includesAnyPhrase(normalized, [
        "progress",
        "gap",
        "status",
        "value",
        "change",
        "toward",
        "away",
        "moving",
        "increase",
        "decrease",
        "reduce",
        "lower",
        "window",
        "sampled",
        "scrims",
      ]))
  );
}

export function mentionsHeroTrendContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "hero trend",
      "hero trends",
      "hero usage trend",
      "hero usage trends",
      "hero pick trend",
      "hero pick trends",
      "pick rate trend",
      "pickrate trend",
      "playtime trend",
      "trending hero",
      "trending heroes",
      "heroes trending",
      "hero meta",
      "meta trend",
      "rising in usage",
      "rising usage",
      "falling in usage",
      "falling out of the meta",
      "falling out of meta",
      "picked more",
      "picked less",
      "played more",
      "played less",
    ]) ||
    (includesPhrase(normalized, "which heroes") &&
      includesAnyPhrase(normalized, [
        "trending up",
        "trending down",
        "increasing",
        "declining",
        "rising",
        "falling",
        "getting picked",
        "getting played",
        "usage",
        "meta",
      ]))
  );
}

export function mentionsStreakContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "streak",
    "streaks",
    "win streak",
    "loss streak",
    "current streak",
    "longest streak",
    "currently winning",
    "currently losing",
    "on a win streak",
    "on a loss streak",
    "on a losing streak",
  ]);
}

export function mentionsRosterContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "roster",
    "rosters",
    "lineup",
    "lineups",
    "comp",
    "comps",
    "composition",
    "compositions",
    "team comp",
    "team comps",
    "team composition",
    "team compositions",
    "five stack",
    "starting five",
  ]);
}

export function mentionsMapPlaytimeContext(normalized: string): boolean {
  const mapContext = includesAnyPhrase(normalized, [
    "map",
    "maps",
    "map type",
    "map mode",
  ]);
  const playtimeIntent =
    includesAnyPhrase(normalized, [
      "map playtime",
      "map time played",
      "time played",
      "playtime",
      "played most",
      "played the most",
      "most time",
      "most played",
    ]) ||
    /\btime\b.*\bplayed\b/.test(normalized) ||
    /\bplayed\b.*\btime\b/.test(normalized);

  return (
    playtimeIntent &&
    (mapContext || includesAnyPhrase(normalized, ["played on", "time on"]))
  );
}

export function mentionsPlayerMapPerformanceContext(
  normalized: string
): boolean {
  return (
    includesAnyPhrase(normalized, [
      "player map performance",
      "player map winrate",
      "player map win rate",
      "map performance",
      "players by map",
      "player by map",
      "perform best on",
      "performance on",
    ]) ||
    (includesAnyPhrase(normalized, [
      "who",
      "which player",
      "which players",
      "player",
      "players",
    ]) &&
      includesAnyPhrase(normalized, [
        "best",
        "worst",
        "perform",
        "performance",
      ]))
  );
}

export function mentionsHeroPickrateContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "hero pickrate",
      "hero pick rate",
      "pickrate",
      "pick rate",
      "pick rates",
      "hero ownership",
      "ownership",
      "ownership rate",
      "owns our",
      "owned by",
      "player hero share",
      "hero pool share",
    ]) ||
    (includesAnyPhrase(normalized, ["which hero", "which heroes"]) &&
      includesPhrase(normalized, "played") &&
      includesAnyPhrase(normalized, ["map", "maps", "game", "games"]))
  );
}

export function mentionsHeroDiversityContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
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
    ]) ||
    (includesPhrase(normalized, "hero pool") &&
      includesAnyPhrase(normalized, [
        "by role",
        "per role",
        "which role",
        "roles",
      ]))
  );
}

export function mentionsHeroSliceStatContext(normalized: string): boolean {
  const heroSlice =
    includesAnyPhrase(normalized, [
      "which hero",
      "which heroes",
      "what hero",
      "what heroes",
      "hero stats",
      "hero stat",
    ]) ||
    ["tank", "damage", "support"].some((role) =>
      includesPhrase(normalized, `${role} heroes`)
    );
  const statMetric = includesAnyPhrase(normalized, [
    "final blow",
    "final blows",
    "finals",
    "eliminations",
    "elims",
    "death",
    "deaths",
    "assists",
    "damage",
    "healing",
    "heals",
    "time played",
    "playtime",
    "ultimates",
    "ults",
    "per 10",
    "final blows per death",
    "kd",
  ]);

  return heroSlice && statMetric;
}

export function mentionsRotationDeathContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "rotation death",
    "rotation deaths",
    "rotational death",
    "rotational deaths",
    "caught rotating",
    "caught on rotation",
    "caught out",
    "caught-out",
    "picked while rotating",
    "picked on rotation",
    "picked before fight",
    "picked before fights",
    "died rotating",
    "dies rotating",
    "died before fight",
    "dies before fight",
    "pre fight death",
    "pre fight deaths",
    "pre-fight death",
    "pre-fight deaths",
    "die early",
    "dies early",
    "died early",
    "die early in fight",
    "die early in fights",
    "dies early in fight",
    "dies early in fights",
    "early fight death",
    "early fight deaths",
    "early death rate",
    "early deaths",
    "early death with low damage",
  ]);
}

export function mentionsFirstPickAttribution(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "opening pick",
    "opening picks",
    "first pick",
    "first picks",
    "gets first pick",
    "got first pick",
    "get first pick",
    "secured first pick",
    "secures first pick",
  ]);
}

export function mentionsFirstDeathAttribution(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "opening death",
    "opening deaths",
    "first death",
    "first deaths",
    "dies first",
    "died first",
    "die first",
    "first to die",
    "gets picked first",
    "got picked first",
    "picked first",
    "first picked",
  ]);
}

export function mentionsOpeningKillContext(normalized: string): boolean {
  if (
    includesAnyPhrase(normalized, [
      "first pick rate",
      "first pick percentage",
      "first death rate",
      "first death percentage",
    ])
  ) {
    return false;
  }

  const teamScenario = includesAnyPhrase(normalized, [
    "we get first pick",
    "we got first pick",
    "we have first pick",
    "we get first death",
    "we got first death",
    "we have first death",
  ]);
  const attributionIntent = includesAnyPhrase(normalized, [
    "who",
    "which player",
    "which players",
    "which hero",
    "which heroes",
    "by player",
    "by hero",
    "attacker",
    "killer",
    "victim",
  ]);

  return (
    !teamScenario &&
    (includesAnyPhrase(normalized, [
      "opening kill",
      "opening kills",
      "first kill",
      "first kills",
      "dies first",
      "died first",
      "die first",
      "first to die",
      "gets picked first",
      "got picked first",
      "picked first",
      "first picked",
      "gets first pick",
      "got first pick",
    ]) ||
      ((mentionsFirstPickAttribution(normalized) ||
        mentionsFirstDeathAttribution(normalized)) &&
        attributionIntent))
  );
}

export function mentionsRawKillEventContext(normalized: string): boolean {
  if (mentionsOpeningKillContext(normalized)) return false;
  return (
    includesAnyPhrase(normalized, [
      "kill feed",
      "kill event",
      "kill events",
      "critical kill",
      "critical kills",
      "environmental kill",
      "environmental kills",
      "killing blow",
      "kill damage",
      "kills by ability",
      "kills per ability",
    ]) ||
    /\bwho\s+(?:kill|kills|killed)\b/.test(normalized) ||
    /\bwho\s+(?:did|does|has|have)\b.*\b(?:kill|kills|killed)\b/.test(
      normalized
    ) ||
    /\b(?:kills?|killed)\s+(?:by|with)\b/.test(normalized)
  );
}

export function asksKillVictim(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, ["victim", "victims"]) ||
    /\bwho\s+(?:did|does|has|have)\b.*\b(?:kill|kills|killed)\b/.test(
      normalized
    ) ||
    /\bwhich\s+heroes?\s+(?:did|does|has|have)\b.*\b(?:kill|kills|killed)\b/.test(
      normalized
    )
  );
}

export function isKillVictimPlayerContext(
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

export function mentionsRawHeroSwapEventContext(normalized: string): boolean {
  if (
    includesAnyPhrase(normalized, [
      "swap impact",
      "swap win rate",
      "swap winrate",
      "too many swaps",
      "when we swap",
      "when swapping",
    ])
  ) {
    return false;
  }

  return (
    includesAnyPhrase(normalized, [
      "hero swap",
      "hero swaps",
      "swap event",
      "swap events",
      "time before swap",
      "time before swapping",
    ]) ||
    /\bswapp?ed\s+(?:from|off|to|onto|into)\b/.test(normalized) ||
    /\bswaps?\s+(?:from|off|to|onto|into)\b/.test(normalized)
  );
}

export function mentionsRawUltimateEventContext(normalized: string): boolean {
  if (
    includesAnyPhrase(normalized, [
      "ult impact",
      "ultimate impact",
      "ult economy",
      "ultimate economy",
      "ult advantage",
      "ultimate advantage",
      "ult combo",
      "ultimate combo",
      "counter ult",
      "counter ultimate",
      "fight opener",
      "fight openers",
      "opening ult",
      "opening ultimate",
      "first ult",
      "first ultimate",
      "wasted ult",
      "wasted ultimate",
    ]) ||
    mentionsFightContext(normalized)
  ) {
    return false;
  }

  const explicitRawOrEvent = includesAnyPhrase(normalized, [
    "ultimate event",
    "ultimate events",
    "ult event",
    "ult events",
    "raw ult",
    "raw ults",
    "raw ultimate",
    "raw ultimates",
  ]);
  const namedPlayerUsage =
    /\b(?:did|does)\s+[a-z0-9_.-]+\s+(?:use|uses|used)\b/.test(normalized) ||
    /\bby\s+(?!role\b|roles\b|hero\b|heroes\b|player\b|players\b|map\b|maps\b|type\b|mode\b)[a-z0-9_.-]+\b/.test(
      normalized
    );
  const namedPlayerUltimateCount =
    /\b(?:how many|number of|count of)\s+(?:ults|ultimates)\s+(?:did|does|has|have)\s+[a-z0-9_.-]+\s+(?:use|uses|used)\b/.test(
      normalized
    );

  return (
    explicitRawOrEvent ||
    namedPlayerUltimateCount ||
    (includesPhrase(normalized, "ultimates used") && namedPlayerUsage) ||
    (includesPhrase(normalized, "ults used") && namedPlayerUsage)
  );
}

export function mentionsAbilityTimingContext(normalized: string): boolean {
  const abilityContext = includesAnyPhrase(normalized, [
    "ability",
    "abilities",
    "cooldown",
    "cooldowns",
    "suzu",
    "sleep",
    "nade",
    "grenade",
    "lamp",
  ]);

  const timingIntent = includesAnyPhrase(normalized, [
    "ability timing",
    "cooldown timing",
    "when should",
    "when to use",
    "best phase",
    "which phase",
    "which phases",
    "phase timing",
    "by phase",
    "per phase",
  ]);

  const phaseMention =
    includesAnyPhrase(normalized, [
      "pre fight",
      "pre-fight",
      "early fight",
      "mid fight",
      "late fight",
      "cleanup",
    ]) ||
    /\b(?:early|mid|late)\b.*\b(?:ability|abilities|cooldown|cooldowns|suzu|sleep|nade|grenade|lamp)\b/.test(
      normalized
    ) ||
    /\b(?:ability|abilities|cooldown|cooldowns|suzu|sleep|nade|grenade|lamp)\b.*\b(?:early|mid|late)\b/.test(
      normalized
    );

  return (timingIntent && abilityContext) || phaseMention;
}

export function mentionsTeamfightUltContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "ults did we use",
      "ultimates did we use",
      "ults we use",
      "ultimates we use",
      "ults used in",
      "ultimates used in",
      "first ult",
      "first ultimate",
      "wasted ult",
      "wasted ults",
      "wasted ultimate",
      "wasted ultimates",
      "dry fight",
      "reversal",
      "reverse fight",
      "ults used",
      "ultimates used",
    ]) ||
    /\b(?:use|used|using|spend|spent|with|without|no|zero|one|two|three|four|five|six|\d+)\s+(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    )
  );
}

export function mentionsFightComebackContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "comeback",
      "comebacks",
      "come back",
      "comes back",
      "came back",
      "turnaround",
      "turn around",
      "turns around",
      "turned around",
      "turn fight around",
      "turn fights around",
      "clutch fight",
      "clutch fights",
    ]) ||
    /\b(?:win|wins|won|winning)\b.*\b(?:after|when|while)\b.*\b(?:down|behind)\b.*\b(?:two|2)\b/.test(
      normalized
    ) ||
    /\b(?:down|behind)\b.*\b(?:two|2)\b.*\b(?:kills?|players?)\b/.test(
      normalized
    )
  );
}

export function mentionsFightComebackRateContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "reversal rate",
      "fight reversal rate",
      "comeback rate",
      "comeback win rate",
      "turnaround rate",
    ]) ||
    (mentionsFightComebackContext(normalized) &&
      includesAnyPhrase(normalized, [
        "how often",
        "rate",
        "percentage",
        "percent",
        "win rate",
      ]))
  );
}

export function mentionsUltEconomyContext(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "ult economy",
      "ultimate economy",
      "ult advantage",
      "ultimate advantage",
      "ult bank",
      "ultimate bank",
      "ult disadvantage",
      "ultimate disadvantage",
      "ult deficit",
      "ultimate deficit",
      "more ults",
      "more ultimates",
      "same ults",
      "same ultimates",
      "same number of ults",
      "same number of ultimates",
      "equal ults",
      "equal ultimates",
      "no ult advantage",
      "no ultimate advantage",
    ]) ||
    /\b(?:ahead|behind|even|up|down)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    ) ||
    /\b(?:ult|ults|ultimate|ultimates)\b.*\b(?:ahead|behind|even|up|down)\b/.test(
      normalized
    )
  );
}

export function mentionsOurUltSide(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "our ult",
      "our ults",
      "our ultimate",
      "our ultimates",
      "we ult",
      "we ults",
      "we ulted",
      "we use ult",
      "we use ults",
      "we use ultimate",
      "we use ultimates",
      "we used ult",
      "we used ults",
      "we used ultimate",
      "we used ultimates",
    ]) ||
    /\bwe\s+(?:use|used)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    )
  );
}

export function mentionsEnemyUltSide(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "enemy ult",
      "enemy ults",
      "enemy ultimate",
      "enemy ultimates",
      "their ult",
      "their ults",
      "their ultimate",
      "their ultimates",
      "they ult",
      "they ulted",
    ]) || /\benemy\s+ults?\b/.test(normalized)
  );
}

export function mentionsUltSideComparison(normalized: string): boolean {
  return (
    mentionsOurUltSide(normalized) &&
    mentionsEnemyUltSide(normalized) &&
    includesAnyPhrase(normalized, [
      "compare",
      "comparison",
      "versus",
      "vs",
      "compared to",
    ])
  );
}

export function mentionsNamedUltimateImpactContext(
  normalized: string,
  hasNamedUltimate: boolean
): boolean {
  if (!hasNamedUltimate) return false;
  return includesAnyPhrase(normalized, [
    "win rate",
    "winrate",
    "fight win rate",
    "fight winrate",
    "fights",
    "fight",
    "wins",
    "losses",
    "uncontested",
    "mirror",
    "mirrored",
  ]);
}

export function mentionsNamedUltimateCountContext(
  normalized: string,
  hasNamedUltimate: boolean
): boolean {
  if (!hasNamedUltimate) return false;
  const countIntent = includesAnyPhrase(normalized, [
    "how many",
    "number of",
    "count of",
  ]);
  const rankingIntent =
    includesAnyPhrase(normalized, ["who", "which player", "which players"]) &&
    includesAnyPhrase(normalized, [
      "most",
      "least",
      "fewest",
      "top",
      "leaderboard",
    ]);

  return (
    (countIntent || rankingIntent) &&
    /\b(?:use|uses|used|using)\b/.test(normalized)
  );
}

export function mentionsWithWithoutBanComparison(normalized: string): boolean {
  const mentionsBan = includesAnyPhrase(normalized, [
    "ban",
    "bans",
    "banned",
    "available",
  ]);

  return (
    mentionsBan &&
    includesAnyPhrase(normalized, [
      "with and without",
      "with vs without",
      "with versus without",
      "banned vs available",
      "banned versus available",
      "available vs banned",
      "available versus banned",
    ])
  );
}

export function mentionsEnemyRoleMatchupContext(normalized: string): boolean {
  const mentionsEnemyRole = ["tank", "damage", "support"].some((role) => {
    return includesAnyPhrase(normalized, [
      `${role} heroes`,
      `${role} hero`,
      `enemy ${role}`,
      `enemy ${role} heroes`,
      `enemy ${role} hero`,
      `against ${role}`,
      `versus ${role}`,
      `vs ${role}`,
    ]);
  });
  if (!mentionsEnemyRole) return false;

  return includesAnyPhrase(normalized, [
    "enemy",
    "against",
    "versus",
    "vs",
    "matchup",
    "matchups",
  ]);
}

export function mentionsRolePerformanceContext(normalized: string): boolean {
  if (
    includesAnyPhrase(normalized, [
      "role trio",
      "role trios",
      "lineup",
      "lineups",
      "comp",
      "comps",
      "composition",
      "compositions",
    ])
  ) {
    return false;
  }

  const roleGrouping = includesAnyPhrase(normalized, [
    "role performance",
    "role stats",
    "role stat",
    "role line",
    "role lines",
    "which role",
    "which roles",
    "by role",
    "per role",
  ]);

  const roleSpecific = includesAnyPhrase(normalized, [
    "tank role",
    "damage role",
    "support role",
    "tank line",
    "damage line",
    "support line",
  ]);

  const roleMetric = includesAnyPhrase(normalized, [
    "performance",
    "stats",
    "stat",
    "win rate",
    "winrate",
    "damage",
    "healing",
    "deaths",
    "final blows",
    "ult efficiency",
    "ultimate efficiency",
  ]);

  return roleGrouping || (roleSpecific && roleMetric);
}

export function mentionsPlayerIntelligenceContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "player intelligence",
    "hero depth",
    "hero depths",
    "hero pool depth",
    "hero pool size",
    "deep hero pool",
    "deepest hero pool",
    "flexibility",
    "flexible",
    "one trick",
    "one-trick",
    "primary hero",
    "primary heroes",
    "most played hero",
    "most played heroes",
    "most-played hero",
    "most-played heroes",
    "non primary",
    "non-primary",
    "secondary hero",
    "secondary heroes",
    "primary time share",
    "primary share",
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
  ]);
}

export function mentionsPlayerImpactContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "player impact",
    "impact metrics",
    "consistency",
    "consistent",
    "stable",
    "stability",
    "steady",
    "volatile",
    "volatility",
    "variance",
    "standard deviation",
    "stddev",
    "swingy",
    "streaky",
    "map mvp",
    "map mvp rate",
    "first picks per 10",
    "first pick count per 10",
    "first deaths per 10",
    "first death count per 10",
    "ajax per 10",
    "ajaxes per 10",
  ]);
}

export function mentionsPlayerImpactComputedMetricContext(
  normalized: string
): boolean {
  return (
    includesAnyPhrase(normalized, [
      "stable",
      "stability",
      "steady",
      "volatile",
      "volatility",
      "map mvp",
      "kills per ult",
      "kills per ultimate",
      "charge ult",
      "charges ult",
      "charged ult",
      "charge ultimate",
      "charges ultimate",
    ]) ||
    /\b(?:take|takes|took|taking)\b.*\b(?:use|used)\b.*\b(?:ult|ultimate)\b/.test(
      normalized
    )
  );
}

export function mentionsCalculatedStatContext(normalized: string): boolean {
  const wantsPlayerDuelStat =
    includesAnyPhrase(normalized, ["duel winrate", "duel win rate"]) &&
    includesAnyPhrase(normalized, [
      "who",
      "which player",
      "which players",
      "by player",
      "per player",
    ]) &&
    !includesPhrase(normalized, "against") &&
    !includesPhrase(normalized, "vs") &&
    !includesPhrase(normalized, "versus");

  return (
    wantsPlayerDuelStat ||
    includesAnyPhrase(normalized, [
      "mvp",
      "map mvp",
      "fleta",
      "first pick percentage",
      "first pick rate",
      "first picks",
      "first death percentage",
      "first death rate",
      "first deaths",
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
    ])
  );
}
