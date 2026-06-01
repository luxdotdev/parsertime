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

export function mentionsFightOpeningUltContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "fight openings") ||
    includesPhrase(normalized, "fight opener") ||
    includesPhrase(normalized, "fight openers") ||
    includesPhrase(normalized, "open fights") ||
    includesPhrase(normalized, "opens fights") ||
    includesPhrase(normalized, "start fights") ||
    includesPhrase(normalized, "starts fights") ||
    includesPhrase(normalized, "opening ult") ||
    includesPhrase(normalized, "opening ultimate")
  );
}

export function mentionsPlayerStatMetricContext(normalized: string): boolean {
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

export function mentionsPlayerTargetContext(normalized: string): boolean {
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

export function mentionsHeroTrendContext(normalized: string): boolean {
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
    includesPhrase(normalized, "rising in usage") ||
    includesPhrase(normalized, "rising usage") ||
    includesPhrase(normalized, "falling in usage") ||
    includesPhrase(normalized, "falling out of the meta") ||
    includesPhrase(normalized, "falling out of meta") ||
    includesPhrase(normalized, "picked more") ||
    includesPhrase(normalized, "picked less") ||
    includesPhrase(normalized, "played more") ||
    includesPhrase(normalized, "played less") ||
    (includesPhrase(normalized, "which heroes") &&
      (includesPhrase(normalized, "trending up") ||
        includesPhrase(normalized, "trending down") ||
        includesPhrase(normalized, "increasing") ||
        includesPhrase(normalized, "declining") ||
        includesPhrase(normalized, "rising") ||
        includesPhrase(normalized, "falling") ||
        includesPhrase(normalized, "getting picked") ||
        includesPhrase(normalized, "getting played") ||
        includesPhrase(normalized, "usage") ||
        includesPhrase(normalized, "meta")))
  );
}

export function mentionsStreakContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "streak") ||
    includesPhrase(normalized, "streaks") ||
    includesPhrase(normalized, "win streak") ||
    includesPhrase(normalized, "loss streak") ||
    includesPhrase(normalized, "current streak") ||
    includesPhrase(normalized, "longest streak") ||
    includesPhrase(normalized, "currently winning") ||
    includesPhrase(normalized, "currently losing") ||
    includesPhrase(normalized, "on a win streak") ||
    includesPhrase(normalized, "on a loss streak") ||
    includesPhrase(normalized, "on a losing streak")
  );
}

export function mentionsRosterContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "roster") ||
    includesPhrase(normalized, "rosters") ||
    includesPhrase(normalized, "lineup") ||
    includesPhrase(normalized, "lineups") ||
    includesPhrase(normalized, "comp") ||
    includesPhrase(normalized, "comps") ||
    includesPhrase(normalized, "composition") ||
    includesPhrase(normalized, "compositions") ||
    includesPhrase(normalized, "team comp") ||
    includesPhrase(normalized, "team comps") ||
    includesPhrase(normalized, "team composition") ||
    includesPhrase(normalized, "team compositions") ||
    includesPhrase(normalized, "five stack") ||
    includesPhrase(normalized, "starting five")
  );
}

export function mentionsMapPlaytimeContext(normalized: string): boolean {
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

export function mentionsPlayerMapPerformanceContext(
  normalized: string
): boolean {
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

export function mentionsHeroPickrateContext(normalized: string): boolean {
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

export function mentionsHeroDiversityContext(normalized: string): boolean {
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

export function mentionsHeroSliceStatContext(normalized: string): boolean {
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

export function mentionsRotationDeathContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "rotation death") ||
    includesPhrase(normalized, "rotation deaths") ||
    includesPhrase(normalized, "rotational death") ||
    includesPhrase(normalized, "rotational deaths") ||
    includesPhrase(normalized, "caught rotating") ||
    includesPhrase(normalized, "caught on rotation") ||
    includesPhrase(normalized, "caught out") ||
    includesPhrase(normalized, "caught-out") ||
    includesPhrase(normalized, "picked while rotating") ||
    includesPhrase(normalized, "picked on rotation") ||
    includesPhrase(normalized, "picked before fight") ||
    includesPhrase(normalized, "picked before fights") ||
    includesPhrase(normalized, "died rotating") ||
    includesPhrase(normalized, "dies rotating") ||
    includesPhrase(normalized, "died before fight") ||
    includesPhrase(normalized, "dies before fight") ||
    includesPhrase(normalized, "pre fight death") ||
    includesPhrase(normalized, "pre fight deaths") ||
    includesPhrase(normalized, "pre-fight death") ||
    includesPhrase(normalized, "pre-fight deaths") ||
    includesPhrase(normalized, "die early") ||
    includesPhrase(normalized, "dies early") ||
    includesPhrase(normalized, "died early") ||
    includesPhrase(normalized, "die early in fight") ||
    includesPhrase(normalized, "die early in fights") ||
    includesPhrase(normalized, "dies early in fight") ||
    includesPhrase(normalized, "dies early in fights") ||
    includesPhrase(normalized, "early fight death") ||
    includesPhrase(normalized, "early fight deaths") ||
    includesPhrase(normalized, "early death rate") ||
    includesPhrase(normalized, "early deaths") ||
    includesPhrase(normalized, "early death with low damage")
  );
}

export function mentionsFirstPickAttribution(normalized: string): boolean {
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

export function mentionsFirstDeathAttribution(normalized: string): boolean {
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

export function mentionsOpeningKillContext(normalized: string): boolean {
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

export function mentionsRawKillEventContext(normalized: string): boolean {
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

export function asksKillVictim(normalized: string): boolean {
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

export function mentionsRawUltimateEventContext(normalized: string): boolean {
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

export function mentionsTeamfightUltContext(normalized: string): boolean {
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

export function mentionsFightComebackContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "comeback") ||
    includesPhrase(normalized, "comebacks") ||
    includesPhrase(normalized, "come back") ||
    includesPhrase(normalized, "comes back") ||
    includesPhrase(normalized, "came back") ||
    includesPhrase(normalized, "turnaround") ||
    includesPhrase(normalized, "turn around") ||
    includesPhrase(normalized, "turns around") ||
    includesPhrase(normalized, "turned around") ||
    includesPhrase(normalized, "turn fight around") ||
    includesPhrase(normalized, "turn fights around") ||
    includesPhrase(normalized, "clutch fight") ||
    includesPhrase(normalized, "clutch fights") ||
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
    includesPhrase(normalized, "reversal rate") ||
    includesPhrase(normalized, "fight reversal rate") ||
    includesPhrase(normalized, "comeback rate") ||
    includesPhrase(normalized, "comeback win rate") ||
    includesPhrase(normalized, "turnaround rate") ||
    (mentionsFightComebackContext(normalized) &&
      (includesPhrase(normalized, "how often") ||
        includesPhrase(normalized, "rate") ||
        includesPhrase(normalized, "percentage") ||
        includesPhrase(normalized, "percent") ||
        includesPhrase(normalized, "win rate")))
  );
}

export function mentionsUltEconomyContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "ult economy") ||
    includesPhrase(normalized, "ultimate economy") ||
    includesPhrase(normalized, "ult advantage") ||
    includesPhrase(normalized, "ultimate advantage") ||
    includesPhrase(normalized, "ult bank") ||
    includesPhrase(normalized, "ultimate bank") ||
    includesPhrase(normalized, "ult disadvantage") ||
    includesPhrase(normalized, "ultimate disadvantage") ||
    includesPhrase(normalized, "ult deficit") ||
    includesPhrase(normalized, "ultimate deficit") ||
    includesPhrase(normalized, "more ults") ||
    includesPhrase(normalized, "more ultimates") ||
    includesPhrase(normalized, "same ults") ||
    includesPhrase(normalized, "same ultimates") ||
    includesPhrase(normalized, "same number of ults") ||
    includesPhrase(normalized, "same number of ultimates") ||
    includesPhrase(normalized, "equal ults") ||
    includesPhrase(normalized, "equal ultimates") ||
    includesPhrase(normalized, "no ult advantage") ||
    includesPhrase(normalized, "no ultimate advantage") ||
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

export function mentionsEnemyUltSide(normalized: string): boolean {
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
  return (
    includesPhrase(normalized, "win rate") ||
    includesPhrase(normalized, "winrate") ||
    includesPhrase(normalized, "fight win rate") ||
    includesPhrase(normalized, "fight winrate") ||
    includesPhrase(normalized, "fights") ||
    includesPhrase(normalized, "fight") ||
    includesPhrase(normalized, "wins") ||
    includesPhrase(normalized, "losses") ||
    includesPhrase(normalized, "uncontested") ||
    includesPhrase(normalized, "mirror") ||
    includesPhrase(normalized, "mirrored")
  );
}

export function mentionsNamedUltimateCountContext(
  normalized: string,
  hasNamedUltimate: boolean
): boolean {
  if (!hasNamedUltimate) return false;
  const countIntent =
    includesPhrase(normalized, "how many") ||
    includesPhrase(normalized, "number of") ||
    includesPhrase(normalized, "count of");
  const rankingIntent =
    (includesPhrase(normalized, "who") ||
      includesPhrase(normalized, "which player") ||
      includesPhrase(normalized, "which players")) &&
    (includesPhrase(normalized, "most") ||
      includesPhrase(normalized, "least") ||
      includesPhrase(normalized, "fewest") ||
      includesPhrase(normalized, "top") ||
      includesPhrase(normalized, "leaderboard"));

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
    includesPhrase(normalized, "role trio") ||
    includesPhrase(normalized, "role trios") ||
    includesPhrase(normalized, "lineup") ||
    includesPhrase(normalized, "lineups") ||
    includesPhrase(normalized, "comp") ||
    includesPhrase(normalized, "comps") ||
    includesPhrase(normalized, "composition") ||
    includesPhrase(normalized, "compositions")
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

export function mentionsPlayerIntelligenceContext(normalized: string): boolean {
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

export function mentionsPlayerImpactContext(normalized: string): boolean {
  return (
    includesPhrase(normalized, "player impact") ||
    includesPhrase(normalized, "impact metrics") ||
    includesPhrase(normalized, "consistency") ||
    includesPhrase(normalized, "consistent") ||
    includesPhrase(normalized, "stable") ||
    includesPhrase(normalized, "stability") ||
    includesPhrase(normalized, "steady") ||
    includesPhrase(normalized, "volatile") ||
    includesPhrase(normalized, "volatility") ||
    includesPhrase(normalized, "variance") ||
    includesPhrase(normalized, "standard deviation") ||
    includesPhrase(normalized, "stddev") ||
    includesPhrase(normalized, "swingy") ||
    includesPhrase(normalized, "streaky") ||
    includesPhrase(normalized, "map mvp") ||
    includesPhrase(normalized, "map mvp rate") ||
    includesPhrase(normalized, "first picks per 10") ||
    includesPhrase(normalized, "first pick count per 10") ||
    includesPhrase(normalized, "first deaths per 10") ||
    includesPhrase(normalized, "first death count per 10") ||
    includesPhrase(normalized, "ajax per 10") ||
    includesPhrase(normalized, "ajaxes per 10")
  );
}

export function mentionsPlayerImpactComputedMetricContext(
  normalized: string
): boolean {
  return (
    includesPhrase(normalized, "stable") ||
    includesPhrase(normalized, "stability") ||
    includesPhrase(normalized, "steady") ||
    includesPhrase(normalized, "volatile") ||
    includesPhrase(normalized, "volatility") ||
    includesPhrase(normalized, "map mvp") ||
    includesPhrase(normalized, "kills per ult") ||
    includesPhrase(normalized, "kills per ultimate") ||
    includesPhrase(normalized, "charge ult") ||
    includesPhrase(normalized, "charges ult") ||
    includesPhrase(normalized, "charged ult") ||
    includesPhrase(normalized, "charge ultimate") ||
    includesPhrase(normalized, "charges ultimate") ||
    /\b(?:take|takes|took|taking)\b.*\b(?:use|used)\b.*\b(?:ult|ultimate)\b/.test(
      normalized
    )
  );
}

export function mentionsCalculatedStatContext(normalized: string): boolean {
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
