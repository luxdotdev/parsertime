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
  const mentionsPositive = phrases.some(
    (phrase) =>
      includesPhrase(normalized, phrase) ||
      includesPhrase(normalized, `with ${phrase}`) ||
      includesPhrase(normalized, `have ${phrase}`) ||
      includesPhrase(normalized, `get ${phrase}`) ||
      includesPhrase(normalized, `use ${phrase}`)
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
  const enemyHas = (pattern: RegExp) =>
    enemySubject.test(normalized) && pattern.test(normalized);
  const friendlyHas = (pattern: RegExp) =>
    friendlySubject.test(normalized) && pattern.test(normalized);

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
    includesPhrase(normalized, "even ultimate economy") ||
    includesPhrase(normalized, "same ults") ||
    includesPhrase(normalized, "same ultimates") ||
    includesPhrase(normalized, "same number of ults") ||
    includesPhrase(normalized, "same number of ultimates") ||
    includesPhrase(normalized, "equal ults") ||
    includesPhrase(normalized, "equal ultimates") ||
    includesPhrase(normalized, "no ult advantage") ||
    includesPhrase(normalized, "no ultimate advantage") ||
    includesPhrase(normalized, "neither team has ult advantage") ||
    includesPhrase(normalized, "neither team has ultimate advantage")
  ) {
    return "even";
  }
  return null;
}

export function pickUltImpactScenario(normalized: string): string | null {
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

export function pickPlayerTargetStat(normalized: string): string | null {
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

export function pickPlayerTargetDirection(normalized: string): string | null {
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

export function mentionsHighRankingIntent(normalized: string): boolean {
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
    includesPhrase(normalized, "longest") ||
    includesPhrase(normalized, "slowest") ||
    includesPhrase(normalized, "overperforming") ||
    includesPhrase(normalized, "over performing") ||
    includesPhrase(normalized, "underperforming") ||
    includesPhrase(normalized, "under performing") ||
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

export function mentionsRankingIntent(normalized: string): boolean {
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
