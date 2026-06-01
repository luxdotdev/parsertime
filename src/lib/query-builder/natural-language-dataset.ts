import { DATASET_HINTS } from "@/lib/query-builder/natural-language-config";
import {
  findAbility,
  findHeroMentions,
  findMapName,
  findUltimateHeroMentions,
} from "@/lib/query-builder/natural-language-entities";
import {
  mentionsAbilityTimingContext,
  mentionsCalculatedStatContext,
  mentionsEnemyRoleMatchupContext,
  mentionsFightComebackContext,
  mentionsFightContext,
  mentionsFightOpeningUltContext,
  mentionsHeroDiversityContext,
  mentionsHeroPickrateContext,
  mentionsHeroSliceStatContext,
  mentionsHeroTrendContext,
  mentionsMapIntelligenceContext,
  mentionsMapPlaytimeContext,
  mentionsNamedUltimateCountContext,
  mentionsNamedUltimateImpactContext,
  mentionsOpeningKillContext,
  mentionsPlayerImpactComputedMetricContext,
  mentionsPlayerImpactContext,
  mentionsPlayerIntelligenceContext,
  mentionsPlayerMapPerformanceContext,
  mentionsPlayerOutlierContext,
  mentionsPlayerStatMetricContext,
  mentionsPlayerTargetContext,
  mentionsPlayerTrendContext,
  mentionsRawHeroSwapEventContext,
  mentionsRawKillEventContext,
  mentionsRawUltimateEventContext,
  mentionsRolePerformanceContext,
  mentionsRosterContext,
  mentionsRotationDeathContext,
  mentionsStreakContext,
  mentionsTeamPerformanceContext,
  mentionsTeamfightUltContext,
  mentionsTrendContext,
  mentionsUltEconomyContext,
  mentionsUltSideComparison,
} from "@/lib/query-builder/natural-language-intent";
import {
  mentionsRankingIntent,
  mentionsWonLostFightUltComparison,
  pickResultScope,
  pickUltImpactScenario,
} from "@/lib/query-builder/natural-language-filter-intent";
import {
  asksBestRosterForEachMap,
  findPlayer,
} from "@/lib/query-builder/natural-language-players";
import {
  includesAnyPhrase,
  includesPhrase,
  INTEGER_TOKEN,
  normalize,
} from "@/lib/query-builder/natural-language-text";
import type { DatasetId } from "@/lib/query-builder/types";

export function pickDataset(question: string): DatasetId {
  const normalized = normalize(question);
  const mapName = findMapName(question);
  const heroMentions = findHeroMentions(question);
  const namedUltimateHeroMentions = findUltimateHeroMentions(question);
  const player = findPlayer(question, heroMentions[0]?.hero ?? null);
  const mentionsSwap = includesAnyPhrase(normalized, [
    "swap",
    "swaps",
    "swapped",
    "swapping",
  ]);
  const mentionsUlt = includesAnyPhrase(normalized, [
    "ult",
    "ults",
    "ultimate",
    "ultimates",
  ]);
  if (
    mentionsUlt &&
    (includesAnyPhrase(normalized, ["ult impact", "ultimate impact"]) ||
      mentionsUltSideComparison(normalized) ||
      (includesAnyPhrase(normalized, ["which heroes", "which hero"]) &&
        includesAnyPhrase(normalized, ["ult win rate", "ultimate win rate"])))
  ) {
    return "ult_impact";
  }
  if (mentionsRawHeroSwapEventContext(normalized)) {
    return "hero_swap";
  }
  if (mentionsUlt && mentionsRawUltimateEventContext(normalized)) {
    return "ultimate";
  }
  if (mentionsWonLostFightUltComparison(normalized)) {
    return "teamfight";
  }
  if (
    mentionsNamedUltimateCountContext(
      normalized,
      namedUltimateHeroMentions.length > 0
    )
  ) {
    return "ultimate";
  }
  if (
    mentionsNamedUltimateImpactContext(
      normalized,
      namedUltimateHeroMentions.length > 0
    )
  ) {
    return "ult_impact";
  }
  if (mentionsEnemyRoleMatchupContext(normalized)) {
    return "enemy_hero";
  }
  if (
    mentionsSwap &&
    includesAnyPhrase(normalized, [
      "win rate",
      "winrate",
      "wins",
      "losses",
      "lose",
      "lost",
      "maps",
      "per map",
      "swap count",
      "swap counts",
    ])
  ) {
    return "swap_impact";
  }
  if (
    !mentionsUlt &&
    includesAnyPhrase(normalized, [
      "which heroes",
      "which hero",
      "hero wins",
      "hero losses",
    ]) &&
    includesAnyPhrase(normalized, [
      "win rate",
      "winrate",
      "wins",
      "losses",
      "lose",
      "lost",
    ])
  ) {
    return "hero_pool";
  }
  if (
    pickResultScope(normalized) &&
    (heroMentions.length > 0 || player) &&
    includesAnyPhrase(normalized, [
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
      "ultimates",
    ])
  ) {
    return "hero_pool";
  }
  if (mentionsTeamPerformanceContext(normalized)) return "team_performance";
  if (
    mentionsPlayerImpactComputedMetricContext(normalized) &&
    mentionsRankingIntent(normalized)
  ) {
    return "player_impact";
  }
  if (
    mentionsPlayerImpactContext(normalized) &&
    includesAnyPhrase(normalized, [
      "first picks per 10",
      "first pick count per 10",
      "first deaths per 10",
      "first death count per 10",
      "ajax per 10",
      "ajaxes per 10",
    ])
  ) {
    return "player_impact";
  }
  if (
    mentionsFightContext(normalized) &&
    includesAnyPhrase(normalized, ["win rate", "winrate", "wins", "losses"]) &&
    includesAnyPhrase(normalized, [
      "first pick",
      "opening pick",
      "first kill",
      "opening kill",
      "first death",
      "opening death",
      "first ult",
      "first ultimate",
      "opening ult",
      "opening ultimate",
    ])
  ) {
    return "teamfight";
  }
  if (mentionsRawKillEventContext(normalized)) return "kill";
  if (mentionsOpeningKillContext(normalized)) return "opening_kill";
  if (
    mentionsPlayerTrendContext(normalized) ||
    (player &&
      includesAnyPhrase(normalized, [
        "improving",
        "improve",
        "declining",
        "decline",
        "trending up",
        "trending down",
      ]))
  ) {
    return "player_trend";
  }
  if (mentionsPlayerOutlierContext(normalized)) return "player_outlier";
  if (mentionsPlayerTargetContext(normalized)) return "player_target";
  if (mentionsPlayerImpactContext(normalized)) return "player_impact";
  if (
    mentionsFightContext(normalized) &&
    includesAnyPhrase(normalized, [
      "first pick rate",
      "first death rate",
      "first ult rate",
      "first ultimate rate",
      "dry fight rate",
      "reversal rate",
      "ultimate efficiency",
      "ult efficiency",
      "ults in won fights",
      "ults in lost fights",
      "ults per non dry fight",
      "ultimates per non dry fight",
    ])
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
  if (mentionsUlt && mentionsFightOpeningUltContext(normalized)) {
    return "ult_usage";
  }
  if (mentionsHeroSliceStatContext(normalized)) return "hero_pool";
  if (
    mentionsAbilityTimingContext(normalized) ||
    (findAbility(question) &&
      includesAnyPhrase(normalized, [
        "when should",
        "when to use",
        "best phase",
        "by phase",
        "per phase",
      ]))
  ) {
    return "ability_timing";
  }
  if (findAbility(question)) return "ability_impact";

  if (
    mentionsHeroDiversityContext(normalized) &&
    !includesAnyPhrase(normalized, ["who", "which player", "which players"]) &&
    !player
  ) {
    return "hero_diversity";
  }

  if (mentionsPlayerIntelligenceContext(normalized)) {
    return "player_intelligence";
  }

  if (
    includesAnyPhrase(normalized, [
      "duel",
      "duels",
      "1v1",
      "1 v 1",
      "one v one",
      "hero matchup",
    ])
  ) {
    return "duel";
  }

  if (mentionsUltEconomyContext(normalized)) return "ult_economy";

  if (mentionsUlt && pickUltImpactScenario(normalized)) {
    return "ult_impact";
  }

  if (
    mentionsRolePerformanceContext(normalized) &&
    !includesAnyPhrase(normalized, ["which hero", "which heroes"]) &&
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
    includesAnyPhrase(normalized, [
      "duration",
      "fight length",
      "fight duration",
      "teamfight duration",
      "team fight duration",
      "average fight length",
      "average fight duration",
    ])
  ) {
    return "teamfight";
  }

  if (
    mentionsFightContext(normalized) &&
    includesAnyPhrase(normalized, ["win rate", "winrate", "wins", "losses"])
  ) {
    return "teamfight";
  }

  if (
    includesAnyPhrase(normalized, [
      "map mode",
      "map modes",
      "map type",
      "map types",
      "mode win rate",
      "mode winrate",
    ])
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
    !includesAnyPhrase(normalized, ["which hero", "which heroes"]) &&
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
      !includesAnyPhrase(normalized, ["which hero", "which heroes"]) &&
      includesAnyPhrase(normalized, [
        "who",
        "which player",
        "which players",
        "player",
        "players",
        "perform",
        "performance",
      ])
    ) {
      return heroMentions.length > 0 ? "hero_pool" : "player_map_performance";
    }

    if (includesAnyPhrase(normalized, ["which hero", "which heroes"])) {
      return "hero_pool";
    }

    if (mentionsFightContext(normalized)) {
      return "teamfight";
    }

    if (mentionsSwap) {
      return "swap_impact";
    }

    if (
      findHeroMentions(question).length > 0 &&
      includesAnyPhrase(normalized, ["against", "versus", "vs", "enemy"])
    ) {
      return "enemy_hero";
    }

    if (
      includesAnyPhrase(normalized, [
        "win rate",
        "winrate",
        "record",
        "wins",
        "losses",
      ])
    ) {
      return "map_result";
    }
  }

  if (
    includesAnyPhrase(normalized, [
      "which map",
      "which maps",
      "map win",
      "map win rate",
      "map record",
      "match record",
      "record against",
      "record versus",
    ]) &&
    includesAnyPhrase(normalized, ["against", "versus", "vs"])
  ) {
    return "map_result";
  }

  if (
    mentionsUlt &&
    includesAnyPhrase(normalized, [
      "counter ult",
      "counter ultimate",
      "response ult",
      "ult combo",
      "ultimate combo",
    ])
  ) {
    return "ult_combo";
  }

  if (
    mentionsUlt &&
    includesAnyPhrase(normalized, [
      "mirror",
      "mirrored",
      "uncontested",
      "when",
      "impact",
    ])
  ) {
    return "ult_impact";
  }

  const asksPlayerScopedComeback = includesAnyPhrase(normalized, [
    "who",
    "which player",
    "which players",
    "by player",
    "per player",
  ]);
  if (mentionsFightComebackContext(normalized) && asksPlayerScopedComeback) {
    return "calculated_stat";
  }
  if (mentionsFightComebackContext(normalized) && !asksPlayerScopedComeback) {
    return "teamfight";
  }

  if (asksBestRosterForEachMap(normalized)) {
    return "roster_variant";
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
