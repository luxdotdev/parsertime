import {
  escapeRegExp,
  includesAnyPhrase,
  includesPhrase,
  INTEGER_TOKEN,
  normalize,
} from "@/lib/query-builder/natural-language-text";

export function hasNegatedFightContext(
  normalized: string,
  phrases: string[]
): boolean {
  return phrases.some((phrase) =>
    includesAnyPhrase(normalized, [
      `no ${phrase}`,
      `without ${phrase}`,
      `don t ${phrase}`,
      `do not ${phrase}`,
      `didn t ${phrase}`,
      `did not ${phrase}`,
    ])
  );
}

export function hasComparisonCue(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "compare",
    "comparison",
    "compared to",
    "versus",
    "vs",
    "with and without",
  ]);
}

export function mentionsBooleanFightComparison(
  normalized: string,
  phrases: string[]
): boolean {
  const mentionsPositive = phrases.some((phrase) =>
    includesAnyPhrase(normalized, [
      phrase,
      `with ${phrase}`,
      `have ${phrase}`,
      `get ${phrase}`,
      `use ${phrase}`,
    ])
  );
  if (!mentionsPositive) return false;

  const mentionsNegative =
    hasNegatedFightContext(normalized, phrases) ||
    includesPhrase(normalized, "without it");

  return mentionsNegative && hasComparisonCue(normalized);
}

export function mentionsDryFightComparison(normalized: string): boolean {
  const mentionsDry = includesAnyPhrase(normalized, [
    "dry fight",
    "dry fights",
    "no ults",
    "no ultimates",
    "zero ults",
    "zero ultimates",
    "without ults",
    "without ultimates",
  ]);
  const mentionsNonDry = includesAnyPhrase(normalized, [
    "non dry",
    "non-dry",
    "with ults",
    "with ultimates",
    "use ults",
    "use ultimates",
    "using ults",
    "using ultimates",
  ]);

  return mentionsDry && mentionsNonDry && hasComparisonCue(normalized);
}

export function mentionsWonLostFightUltComparison(normalized: string): boolean {
  const mentionsWonFights = includesAnyPhrase(normalized, [
    "won fights",
    "winning fights",
    "fights won",
  ]);
  const mentionsLostFights = includesAnyPhrase(normalized, [
    "lost fights",
    "losing fights",
    "fights lost",
  ]);
  const mentionsUlt = includesAnyPhrase(normalized, [
    "ult",
    "ults",
    "ultimate",
    "ultimates",
  ]);

  return mentionsWonFights && mentionsLostFights && mentionsUlt;
}

export function mentionsNonDryFightAggregateMetric(
  normalized: string
): boolean {
  return includesAnyPhrase(normalized, [
    "ults per non dry fight",
    "ults per non-dry fight",
    "ultimates per non dry fight",
    "ultimates per non-dry fight",
    "average ults per non dry fight",
    "average ults per non-dry fight",
    "average ultimates per non dry fight",
    "average ultimates per non-dry fight",
  ]);
}

export function pickTeamfightComparisonDimension(
  normalized: string
): string | null {
  if (
    mentionsBooleanFightComparison(normalized, [
      "first pick",
      "get first pick",
      "opening pick",
      "get opening pick",
    ])
  ) {
    return "first_pick";
  }
  if (
    mentionsBooleanFightComparison(normalized, [
      "first death",
      "have first death",
      "opening death",
      "have opening death",
    ])
  ) {
    return "first_death";
  }
  if (
    mentionsBooleanFightComparison(normalized, [
      "first ult",
      "use first ult",
      "get first ult",
      "first ultimate",
      "use first ultimate",
      "get first ultimate",
    ])
  ) {
    return "first_ult";
  }
  if (
    mentionsBooleanFightComparison(normalized, ["dry fight"]) ||
    mentionsDryFightComparison(normalized)
  ) {
    return "dry_fight";
  }
  return null;
}

export function hasEnemyFightContext(
  normalized: string,
  phrases: string[]
): boolean {
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

export function hasFriendlyVictimFightContext(
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

export function pickResultScope(normalized: string): "win" | "loss" | null {
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

export function pickUltEconomyBucket(normalized: string): string | null {
  const enemySubject =
    /\b(?:they|them|their|enemy|enemies|opponent|opponents)\b/;
  const friendlySubject = /\b(?:we|us|our)\b/;
  const ultToken = "(?:ult|ults|ultimate|ultimates)";
  function enemyHas(pattern: RegExp) {
    return enemySubject.test(normalized) && pattern.test(normalized);
  }
  function friendlyHas(pattern: RegExp) {
    return friendlySubject.test(normalized) && pattern.test(normalized);
  }

  const twoUltAdvantage = new RegExp(
    `\\b(?:two|2)\\s+(?:more\\s+)?${ultToken}\\s+(?:advantage|lead)\\b|\\b(?:two|2)\\s+more\\s+${ultToken}\\b|\\b(?:up|ahead)\\b.*\\b(?:two|2)\\b.*\\b${ultToken}\\b|\\b(?:two|2)\\b.*\\b${ultToken}\\b.*\\b(?:up|ahead)\\b`
  );
  const oneUltAdvantage = new RegExp(
    `\\b(?:one|1|an|a)\\s+(?:more\\s+)?${ultToken}\\s+(?:advantage|lead)\\b|\\b(?:one|1)\\s+more\\s+${ultToken}\\b|\\b(?:up|ahead)\\b.*\\b(?:one|1|an|a)\\b.*\\b${ultToken}\\b|\\b(?:one|1|an|a)\\b.*\\b${ultToken}\\b.*\\b(?:up|ahead)\\b`
  );
  const genericUltAdvantage = new RegExp(
    `\\b(?:more\\s+${ultToken}|${ultToken}\\s+advantage|ultimate\\s+advantage|${ultToken}\\s+lead)\\b`
  );
  const twoUltDisadvantage = new RegExp(
    `\\b(?:two|2)\\s+${ultToken}\\s+(?:disadvantage|deficit)\\b|\\b(?:two|2)\\s+fewer\\s+${ultToken}\\b|\\b(?:down|behind)\\b.*\\b(?:two|2)\\b.*\\b${ultToken}\\b|\\b(?:two|2)\\b.*\\b${ultToken}\\b.*\\b(?:down|behind)\\b`
  );
  const oneUltDisadvantage = new RegExp(
    `\\b(?:one|1|an|a)\\s+${ultToken}\\s+(?:disadvantage|deficit)\\b|\\b(?:one|1)\\s+fewer\\s+${ultToken}\\b|\\b(?:down|behind)\\b.*\\b(?:one|1|an|a)\\b.*\\b${ultToken}\\b|\\b(?:one|1|an|a)\\b.*\\b${ultToken}\\b.*\\b(?:down|behind)\\b`
  );
  const genericUltDisadvantage = new RegExp(
    `\\b(?:fewer\\s+${ultToken}|${ultToken}\\s+disadvantage|ultimate\\s+disadvantage|${ultToken}\\s+deficit)\\b`
  );

  if (enemyHas(twoUltAdvantage)) {
    return "2+ behind";
  }
  if (enemyHas(oneUltAdvantage)) {
    return "1 behind";
  }
  if (enemyHas(twoUltDisadvantage)) {
    return "2+ ahead";
  }
  if (enemyHas(oneUltDisadvantage)) {
    return "1 ahead";
  }
  if (friendlyHas(twoUltDisadvantage)) {
    return "2+ behind";
  }
  if (friendlyHas(oneUltDisadvantage)) {
    return "1 behind";
  }
  if (friendlyHas(twoUltAdvantage)) {
    return "2+ ahead";
  }
  if (friendlyHas(oneUltAdvantage)) {
    return "1 ahead";
  }
  if (enemyHas(genericUltAdvantage)) return "1 behind";
  if (enemyHas(genericUltDisadvantage)) return "1 ahead";
  if (friendlyHas(genericUltDisadvantage)) return "1 behind";
  if (friendlyHas(genericUltAdvantage)) return "1 ahead";

  if (
    includesAnyPhrase(normalized, [
      "2 behind",
      "two behind",
      "2 ults behind",
      "two ults behind",
      "2+ behind",
      "negative 2 ult advantage",
      "negative two ult advantage",
      "down by 2",
      "down by two",
      "down by 2 ults",
      "down by two ults",
      "down 2",
      "down two",
    ])
  ) {
    return "2+ behind";
  }
  if (
    includesAnyPhrase(normalized, [
      "1 behind",
      "one behind",
      "1 ult behind",
      "one ult behind",
      "negative 1 ult advantage",
      "negative one ult advantage",
      "down by 1",
      "down by one",
      "down by 1 ult",
      "down by one ult",
      "down 1",
      "down one",
    ])
  ) {
    return "1 behind";
  }
  if (
    includesAnyPhrase(normalized, [
      "2 ahead",
      "two ahead",
      "2 ults ahead",
      "two ults ahead",
      "2+ ahead",
      "plus 2 ult advantage",
      "plus two ult advantage",
      "two ult advantage",
      "2 ult advantage",
      "up by 2",
      "up by two",
      "up by 2 ults",
      "up by two ults",
      "up 2",
      "up two",
    ])
  ) {
    return "2+ ahead";
  }
  if (
    includesAnyPhrase(normalized, [
      "1 ahead",
      "one ahead",
      "1 ult ahead",
      "one ult ahead",
      "an ult ahead",
      "a ult ahead",
      "plus 1 ult advantage",
      "plus one ult advantage",
      "one ult advantage",
      "1 ult advantage",
      "an ult advantage",
      "a one ult advantage",
      "up by 1",
      "up by one",
      "up by 1 ult",
      "up by one ult",
      "up 1",
      "up one",
    ])
  ) {
    return "1 ahead";
  }
  if (
    includesAnyPhrase(normalized, [
      "even ults",
      "even ultimates",
      "even ult economy",
      "even ultimate economy",
      "same ults",
      "same ultimates",
      "same number of ults",
      "same number of ultimates",
      "equal ults",
      "equal ultimates",
      "no ult advantage",
      "no ultimate advantage",
      "neither team has ult advantage",
      "neither team has ultimate advantage",
    ])
  ) {
    return "even";
  }
  return null;
}

export function pickUltImpactScenario(normalized: string): string | null {
  const uncontested = includesAnyPhrase(normalized, [
    "uncontested ult",
    "uncontested ults",
    "uncontested ultimate",
    "uncontested ultimates",
    "not mirrored",
    "without mirror",
  ]);
  const mirror = includesAnyPhrase(normalized, [
    "mirror ult",
    "mirror ults",
    "mirror ultimate",
    "mirror ultimates",
    "mirrored ult",
    "mirrored ults",
    "mirrored ultimate",
    "mirrored ultimates",
  ]);
  const ourUlt =
    includesAnyPhrase(normalized, [
      "we ult",
      "we ults",
      "we use ult",
      "we used ult",
      "our ult",
      "our ultimate",
    ]) ||
    /\bwe\s+(?:use|uses|used)\b.*\b(?:ult|ults|ultimate|ultimates)\b/.test(
      normalized
    );
  const enemyUlt =
    includesAnyPhrase(normalized, [
      "enemy ult",
      "enemy ults",
      "enemy ultimate",
      "enemy ultimates",
      "their ult",
      "their ults",
      "their ultimate",
      "their ultimates",
    ]) ||
    /\b(?:enemy|they|their)\b.*\b(?:use|uses|used|ult|ults|ultimate|ultimates)\b/.test(
      normalized
    );
  const weFirst = includesAnyPhrase(normalized, [
    "we first",
    "ours first",
    "our ult first",
    "we ult first",
    "we use first",
    "we used first",
  ]);
  const enemyFirst = includesAnyPhrase(normalized, [
    "enemy first",
    "they first",
    "theirs first",
    "enemy ult first",
    "enemy ults first",
    "they ult first",
    "they use first",
    "they used first",
  ]);

  if (uncontested && ourUlt) return "we used uncontested";
  if (uncontested && enemyUlt) return "enemy used uncontested";
  if (mirror && weFirst) return "mirror, we first";
  if (mirror && enemyFirst) return "mirror, enemy first";
  return null;
}

export function pickConfidenceScope(normalized: string): string | null {
  if (includesAnyPhrase(normalized, ["high confidence", "confident"])) {
    return "high";
  }
  if (includesPhrase(normalized, "medium confidence")) return "medium";
  if (
    includesAnyPhrase(normalized, [
      "low confidence",
      "thin sample",
      "small sample",
    ])
  ) {
    return "low";
  }
  if (
    includesAnyPhrase(normalized, [
      "insufficient confidence",
      "insufficient sample",
      "not enough data",
      "no confidence",
    ])
  ) {
    return "insufficient";
  }
  return null;
}

export function mentionsEnemyAbilityContext(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "enemy",
    "enemies",
    "opponent",
    "opponents",
    "their",
    "they",
  ]);
}

export function hasNegatedAbilityUse(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "not using",
    "not used",
    "does not use",
    "do not use",
    "did not use",
    "doesn t use",
    "don t use",
    "didn t use",
    "without",
    "no ability",
    "no abilities",
  ]);
}

export function hasAffirmedAbilityUse(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "using",
    "used",
    "uses",
    "we use",
    "they use",
    "enemy use",
    "enemies use",
    "opponent use",
    "opponents use",
    "use ability",
    "use abilities",
    "after use",
    "after they use",
    "after enemy use",
    "after enemies use",
    "after opponent use",
    "after opponents use",
  ]);
}

export function mentionsAbilityUseComparison(normalized: string): boolean {
  if (
    includesAnyPhrase(normalized, [
      "used vs not used",
      "used versus not used",
      "with and without",
    ])
  ) {
    return true;
  }

  const hasComparisonCue = includesAnyPhrase(normalized, [
    "compare",
    "comparison",
    "compared to",
    "versus",
    "vs",
  ]);

  if (!hasComparisonCue) return false;

  if (
    includesPhrase(normalized, "with") &&
    includesPhrase(normalized, "without")
  ) {
    return true;
  }

  return hasAffirmedAbilityUse(normalized) && hasNegatedAbilityUse(normalized);
}

export function pickFightPhase(normalized: string): string | null {
  if (
    includesAnyPhrase(normalized, ["pre fight", "pre-fight", "before fight"])
  ) {
    return "pre-fight";
  }
  if (includesAnyPhrase(normalized, ["early", "early fight"])) {
    return "early";
  }
  if (includesAnyPhrase(normalized, ["mid", "mid fight", "middle"])) {
    return "mid";
  }
  if (includesAnyPhrase(normalized, ["late", "late fight"])) {
    return "late";
  }
  if (includesPhrase(normalized, "cleanup")) return "cleanup";
  return null;
}

export function wantsPrimaryHeroFilter(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "primary hero",
    "primary heroes",
    "best hero",
    "best heroes",
  ]);
}

export function wantsMostPlayedHeroFilter(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "most played hero",
    "most-played hero",
    "most played heroes",
    "most-played heroes",
    "main hero",
    "main heroes",
  ]);
}

export function wantsNonPrimaryHeroFilter(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "non primary",
    "non-primary",
    "not primary",
    "secondary hero",
    "secondary heroes",
  ]);
}

export function pickPlayerTrendMetric(normalized: string): string | null {
  if (includesAnyPhrase(normalized, ["damage taken", "damage taken per 10"])) {
    return "damage_taken_per10";
  }
  if (
    includesAnyPhrase(normalized, [
      "hero damage",
      "damage dealt",
      "damage per 10",
      "damage",
    ])
  ) {
    return "hero_damage_per10";
  }
  if (
    includesAnyPhrase(normalized, [
      "first death",
      "first deaths",
      "opening death",
      "opening deaths",
    ])
  ) {
    return "first_death_percentage";
  }
  if (
    includesAnyPhrase(normalized, [
      "first pick",
      "first picks",
      "opening pick",
      "opening picks",
    ])
  ) {
    return "first_pick_percentage";
  }
  if (includesAnyPhrase(normalized, ["deaths", "death rate"])) {
    return "deaths_per10";
  }
  if (includesAnyPhrase(normalized, ["eliminations", "elims"])) {
    return "eliminations_per10";
  }
  if (includesPhrase(normalized, "mvp")) return "mvp_score";
  if (
    includesAnyPhrase(normalized, [
      "fight reversal",
      "reversal",
      "fight comeback",
      "comeback rate",
      "comeback percentage",
    ])
  ) {
    return "fight_reversal_percentage";
  }
  if (includesAnyPhrase(normalized, ["fleta", "deadlift"])) {
    return "fleta_deadlift_percentage";
  }
  if (includesAnyPhrase(normalized, ["kills per ult", "kills per ultimate"])) {
    return "kills_per_ultimate";
  }
  if (
    includesAnyPhrase(normalized, ["ult charge time", "ultimate charge time"])
  ) {
    return "average_ult_charge_time";
  }
  if (
    includesAnyPhrase(normalized, ["time to use ult", "time to use ultimate"])
  ) {
    return "average_time_to_use_ult";
  }
  if (includesPhrase(normalized, "drought time")) {
    return "average_drought_time";
  }
  if (includesAnyPhrase(normalized, ["duel winrate", "duel win rate"])) {
    return "duel_winrate_percentage";
  }
  return null;
}

export function pickPlayerOutlierStat(normalized: string): string | null {
  if (
    includesAnyPhrase(normalized, ["damage blocked", "mitigation", "mitigated"])
  ) {
    return "damage_blocked";
  }
  if (
    includesAnyPhrase(normalized, ["hero damage", "damage dealt", "damage"])
  ) {
    return "hero_damage_dealt";
  }
  if (includesAnyPhrase(normalized, ["healing", "heals"])) {
    return "healing_dealt";
  }
  if (includesAnyPhrase(normalized, ["deaths", "death"])) {
    return "deaths";
  }
  if (includesAnyPhrase(normalized, ["eliminations", "elims"])) {
    return "eliminations";
  }
  return null;
}

export function pickPlayerTargetStat(normalized: string): string | null {
  if (includesAnyPhrase(normalized, ["damage taken", "taking damage"])) {
    return "damage_taken";
  }
  if (
    includesAnyPhrase(normalized, ["damage blocked", "mitigation", "mitigated"])
  ) {
    return "damage_blocked";
  }
  if (
    includesAnyPhrase(normalized, ["hero damage", "damage dealt", "damage"])
  ) {
    return "hero_damage_dealt";
  }
  if (includesAnyPhrase(normalized, ["healing", "heals"])) {
    return "healing_dealt";
  }
  if (includesAnyPhrase(normalized, ["final blows", "final blow", "finals"])) {
    return "final_blows";
  }
  if (
    includesAnyPhrase(normalized, [
      "ultimates earned",
      "ults earned",
      "ult charge",
    ])
  ) {
    return "ultimates_earned";
  }
  if (includesAnyPhrase(normalized, ["deaths", "death"])) {
    return "deaths";
  }
  if (includesAnyPhrase(normalized, ["eliminations", "elims"])) {
    return "eliminations";
  }
  return null;
}

export function pickPlayerTargetDirection(normalized: string): string | null {
  if (
    includesAnyPhrase(normalized, [
      "increase goal",
      "increase goals",
      "increase target",
      "increase targets",
      "improvement goal",
      "improvement goals",
      "raise target",
      "raise targets",
      "higher target",
      "higher goals",
    ])
  ) {
    return "increase";
  }

  if (
    includesAnyPhrase(normalized, [
      "decrease goal",
      "decrease goals",
      "decrease target",
      "decrease targets",
      "reduction goal",
      "reduction goals",
      "reduce target",
      "reduce targets",
      "reduce goal",
      "reduce goals",
      "lower target",
      "lower targets",
      "lower goal",
      "lower goals",
    ])
  ) {
    return "decrease";
  }

  return null;
}

export function mentionsStandaloneLeast(normalized: string): boolean {
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

export function mentionsLowRankingIntent(normalized: string): boolean {
  return (
    includesAnyPhrase(normalized, [
      "lowest",
      "fewest",
      "bottom",
      "thinnest",
      "fastest",
      "declining",
      "trending down",
    ]) || mentionsStandaloneLeast(normalized)
  );
}

export function mentionsHighRankingIntent(normalized: string): boolean {
  return includesAnyPhrase(normalized, [
    "top",
    "most",
    "highest",
    "leader",
    "leaders",
    "leaderboard",
    "leads",
    "lead in",
    "deepest",
    "longest",
    "slowest",
    "overperforming",
    "over performing",
    "underperforming",
    "under performing",
    "one trick",
    "one-trick",
    "forced off",
    "improving",
    "increasing",
    "trending up",
    "outlier",
    "outliers",
    "far above",
    "far below",
    "consistent",
    "volatile",
    "volatility",
  ]);
}

export function mentionsRankingIntent(normalized: string): boolean {
  return (
    mentionsHighRankingIntent(normalized) ||
    mentionsLowRankingIntent(normalized) ||
    includesAnyPhrase(normalized, [
      "rank",
      "ranked",
      "ranking",
      "best",
      "worst",
    ])
  );
}
