import {
  getDataset,
  getMetric,
  type FilterDef,
} from "@/lib/query-builder/registry";
import { DIMENSION_ALIASES } from "@/lib/query-builder/natural-language-config";
import {
  findAbilityMentions,
  findHeroMentions,
  findMapMentions,
  findUltimateHeroMentions,
  mentionsOverlap,
  type HeroMention,
} from "@/lib/query-builder/natural-language-entities";
import {
  metricKey,
  type DatasetId,
  type MetricRef,
  type QueryFilter,
  type QuerySpec,
} from "@/lib/query-builder/types";
import {
  includesAnyPhrase,
  includesPhrase,
  INTEGER_TOKEN,
  normalize,
  numberFromToken,
} from "@/lib/query-builder/natural-language-text";
import {
  asksBestRosterForEachMap,
  extractComparedPlayers,
  extractLineupPlayerFilters,
  findOpponents,
  findPlayer,
} from "@/lib/query-builder/natural-language-players";
import {
  extractDurationThresholdFilters,
  extractGenericAggregateThresholdFilters,
  extractNumericThresholdFilters,
  extractOpeningKillTimeFilters,
  extractRotationDeathSignalFilters,
  extractSwapCountFilter,
  extractTimePlayedFilter,
  extractUltCountFilter,
  extractWastedUltFilter,
  pickFirstSwapTiming,
} from "@/lib/query-builder/natural-language-thresholds";
import {
  mentionsFightOpeningUltContext,
  mentionsFirstPickAttribution,
  mentionsFirstDeathAttribution,
  asksKillVictim,
  isKillVictimPlayerContext,
  mentionsFightComebackContext,
  mentionsFightComebackRateContext,
  mentionsOurUltSide,
  mentionsEnemyUltSide,
  mentionsUltSideComparison,
  mentionsEnemyRoleMatchupContext,
} from "@/lib/query-builder/natural-language-intent";
import {
  hasNegatedFightContext,
  mentionsWonLostFightUltComparison,
  mentionsNonDryFightAggregateMetric,
  pickTeamfightComparisonDimension,
  hasEnemyFightContext,
  hasFriendlyVictimFightContext,
  pickResultScope,
  pickUltEconomyBucket,
  pickUltImpactScenario,
  pickConfidenceScope,
  mentionsEnemyAbilityContext,
  hasNegatedAbilityUse,
  hasAffirmedAbilityUse,
  mentionsAbilityUseComparison,
  pickFightPhase,
  wantsPrimaryHeroFilter,
  wantsMostPlayedHeroFilter,
  wantsNonPrimaryHeroFilter,
  pickPlayerTrendMetric,
  pickPlayerOutlierStat,
  pickPlayerTargetStat,
  pickPlayerTargetDirection,
  mentionsLowRankingIntent,
  mentionsHighRankingIntent,
  mentionsRankingIntent,
} from "@/lib/query-builder/natural-language-filter-intent";
import { pickDataset } from "@/lib/query-builder/natural-language-dataset";
import { pickMetrics } from "@/lib/query-builder/natural-language-metrics";

type PlannerInput = {
  question: string;
  teamId: number;
};

export type PlannedQuery = {
  spec: QuerySpec;
  summary: string;
};

const DEFAULT_LIMIT = 20;

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
    const kind = includesAnyPhrase(normalized, [
      "swapped from",
      "swap from",
      "swapped off",
      "swap off",
    ])
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
    includesAnyPhrase(normalized, ["against", "vs", "versus", "enemy"])
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

function pickFilters(dataset: DatasetId, question: string): QueryFilter[] {
  const filters: QueryFilter[] = [];
  const explicitHeroMentions = findHeroMentions(question);
  const namedUltimateHeroMentions =
    dataset === "ult_impact" || dataset === "ultimate"
      ? findUltimateHeroMentions(question)
      : [];
  const nonOverlappingHeroMentions =
    namedUltimateHeroMentions.length > 0
      ? explicitHeroMentions.filter((mention) =>
          namedUltimateHeroMentions.every(
            (ultimateMention) => !mentionsOverlap(mention, ultimateMention)
          )
        )
      : explicitHeroMentions;
  const seenHeroes = new Set<string>();
  const heroMentions = [
    ...nonOverlappingHeroMentions,
    ...namedUltimateHeroMentions,
  ].filter((mention) => {
    if (seenHeroes.has(mention.hero)) return false;
    seenHeroes.add(mention.hero);
    return true;
  });
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
    } else if (dataset === "player_outlier") {
      filters.push({ field: "primary_hero", op: "in", value: heroes });
    } else {
      const exactUltCombo =
        dataset === "ult_combo" &&
        heroes.length === 2 &&
        includesAnyPhrase(normalized, [
          "ult combo",
          "ult combos",
          "ultimate combo",
          "ultimate combos",
          "combo",
        ]);

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
    !(
      dataset === "teamfight" && mentionsWonLostFightUltComparison(normalized)
    ) &&
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
    const asksFirstPickRate = includesAnyPhrase(normalized, [
      "first pick rate",
      "opening pick rate",
    ]);
    const asksFirstDeathRate = includesAnyPhrase(normalized, [
      "first death rate",
      "opening death rate",
    ]);
    const asksFirstUltRate = includesAnyPhrase(normalized, [
      "first ult rate",
      "first ultimate rate",
    ]);
    const asksDryFightRate = includesAnyPhrase(normalized, [
      "dry fight rate",
      "dry-fight rate",
      "dry fight reversal rate",
      "dry-fight reversal rate",
      "dry fight comeback rate",
      "dry comeback rate",
    ]);
    const asksReversalRate = mentionsFightComebackRateContext(normalized);

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
    const noDryFight =
      hasNegatedFightContext(normalized, ["dry fight"]) ||
      includesAnyPhrase(normalized, ["non dry", "non-dry"]);
    const noReversal = hasNegatedFightContext(normalized, [
      "reversal",
      "reverse fight",
      "comeback",
      "come back",
      "turn around",
    ]);
    const comparisonDimension = pickTeamfightComparisonDimension(normalized);

    if (enemyFirstPick && !asksFirstPickRate && !asksFirstDeathRate) {
      filters.push({
        field: "first_death",
        op: "eq",
        value: "yes",
      });
    } else if (
      includesPhrase(normalized, "first death") &&
      !asksFirstDeathRate &&
      comparisonDimension !== "first_death"
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
      !enemyFirstPick &&
      comparisonDimension !== "first_pick"
    ) {
      filters.push({
        field: "first_pick",
        op: "eq",
        value: noFirstPick ? "no" : "yes",
      });
    }
    if (
      includesAnyPhrase(normalized, ["dry fight", "dry fights"]) &&
      !asksDryFightRate &&
      !mentionsNonDryFightAggregateMetric(normalized) &&
      comparisonDimension !== "dry_fight"
    ) {
      filters.push({
        field: "dry_fight",
        op: "eq",
        value: noDryFight ? "no" : "yes",
      });
    }
    if (
      includesAnyPhrase(normalized, ["first ult", "first ultimate"]) &&
      !asksFirstUltRate &&
      comparisonDimension !== "first_ult"
    ) {
      filters.push({
        field: "first_ult",
        op: "eq",
        value: enemyFirstUlt || noFirstUlt ? "no" : "yes",
      });
    }
    if (
      (includesAnyPhrase(normalized, ["reversal", "reverse fight"]) ||
        mentionsFightComebackContext(normalized)) &&
      !asksReversalRate
    ) {
      filters.push({
        field: "reversal",
        op: "eq",
        value: noReversal ? "no" : "yes",
      });
    }
    const ultCountFilter = extractUltCountFilter(normalized);
    if (ultCountFilter && comparisonDimension !== "dry_fight")
      filters.push(ultCountFilter);
    const wastedUltFilter = extractWastedUltFilter(normalized);
    if (wastedUltFilter) filters.push(wastedUltFilter);
  }

  if (dataset === "rotation_death") {
    const enemySide = includesAnyPhrase(normalized, [
      "enemy rotation",
      "enemy deaths",
      "enemy caught",
      "enemy caught out",
      "enemy players",
      "enemy heroes",
      "their rotation",
      "their deaths",
      "their players",
      "their heroes",
      "opponent rotation",
      "opponent deaths",
      "opponent players",
      "opponent heroes",
    ]);
    const sideFilter = filterFor(dataset, "side", enemySide ? "enemy" : "us");
    if (sideFilter) filters.push(sideFilter);

    if (
      includesAnyPhrase(normalized, [
        "normal deaths",
        "non rotation",
        "non-rotation",
      ])
    ) {
      const typeFilter = filterFor(dataset, "death_type", "normal");
      if (typeFilter) filters.push(typeFilter);
    }

    if (
      hero &&
      includesAnyPhrase(normalized, [
        "killed by",
        "dying to",
        "died to",
        "against",
      ])
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
            "caught out",
            "caught-out deaths",
            "picked while rotating",
            "picked on rotation",
            "picked before fight",
            "picked before fights",
            "pre fight deaths",
            "pre-fight deaths",
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
            "caught out rate",
            "caught-out death rate",
            "caught out death rate",
          ],
        },
        {
          field: "early_death_rate",
          aliases: [
            "early death rate",
            "early-fight death rate",
            "pre fight death rate",
            "pre-fight death rate",
            "die early",
            "dies early",
            "died early",
            "die early in fights",
            "dies early in fights",
            "early deaths",
            "early fight deaths",
          ],
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
      includesAnyPhrase(normalized, ["compare", "comparison", "versus", "vs"]);

    for (const role of ["Tank", "Damage", "Support"]) {
      const roleWord = normalize(role);
      if (
        includesAnyPhrase(normalized, [
          `${roleWord} heroes`,
          `${roleWord} hero`,
          `enemy ${roleWord}`,
          `enemy ${roleWord} heroes`,
          `enemy ${roleWord} hero`,
          `against ${roleWord}`,
          `versus ${roleWord}`,
          `vs ${roleWord}`,
        ]) ||
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
    const wantsSideComparison = includesAnyPhrase(normalized, [
      "vs",
      "versus",
      "compared to",
      "compare",
    ]);
    if (
      !wantsSideComparison &&
      includesAnyPhrase(normalized, [
        "opponent",
        "opponents",
        "enemy",
        "their team",
        "them",
      ])
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
          aliases: [
            "fight reversal",
            "fight reversal percentage",
            "fight reversal rate",
            "fight comeback",
            "fight comeback rate",
            "comeback rate",
            "comeback percentage",
          ],
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
          aliases: [
            "reversal rate",
            "fight reversal rate",
            "comeback rate",
            "comeback win rate",
            "turnaround rate",
          ],
        },
        {
          field: "dry_fight_reversal_rate",
          aliases: [
            "dry fight reversal rate",
            "dry-fight reversal rate",
            "dry reversal rate",
            "dry fight comeback rate",
            "dry comeback rate",
          ],
        },
        {
          field: "non_dry_fight_reversal_rate",
          aliases: [
            "non dry fight reversal rate",
            "non-dry fight reversal rate",
            "non dry reversal rate",
            "non dry fight comeback rate",
            "non-dry fight comeback rate",
            "non dry comeback rate",
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
            "fight comeback",
            "fight comeback rate",
            "comeback rate",
            "comeback percentage",
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
          aliases: [
            "fight reversal",
            "fight reversal rate",
            "fight comeback",
            "fight comeback rate",
            "comeback rate",
            "comeback percentage",
          ],
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
      includesAnyPhrase(normalized, [
        "improving",
        "improve",
        "improved",
        "trending up",
      ])
    ) {
      filters.push({ field: "direction", op: "in", value: ["improving"] });
    } else if (
      includesAnyPhrase(normalized, [
        "declining",
        "decline",
        "declined",
        "trending down",
      ])
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
        includesAnyPhrase(normalized, [
          `${roleWord} players`,
          `${roleWord}s`,
          `${roleWord} role`,
          `for ${roleWord}`,
          `as ${roleWord}`,
        ])
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
    if (includesAnyPhrase(normalized, ["outlier", "outliers"])) {
      filters.push({ field: "outlier", op: "eq", value: "yes" });
    }
    if (
      includesAnyPhrase(normalized, [
        "above baseline",
        "far above",
        "overperforming",
        "over performing",
        "high",
      ])
    ) {
      filters.push({ field: "direction", op: "in", value: ["high"] });
    } else if (
      includesAnyPhrase(normalized, [
        "below baseline",
        "far below",
        "underperforming",
        "under performing",
        "low",
      ])
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
        includesAnyPhrase(normalized, [
          `${roleWord} players`,
          `${roleWord}s`,
          `${roleWord} role`,
          `for ${roleWord}`,
          `as ${roleWord}`,
        ])
      ) {
        const filter = filterFor(dataset, "role", role);
        if (filter) filters.push(filter);
      }
    }
  }

  if (dataset === "player_target") {
    const neutralTrendIntent = includesAnyPhrase(normalized, [
      "neutral trend",
      "neutral trends",
      "neutral trending",
      "trending neutral",
    ]);

    if (includesPhrase(normalized, "on track")) {
      filters.push({ field: "status", op: "in", value: ["on track"] });
    } else if (includesPhrase(normalized, "off track")) {
      filters.push({ field: "status", op: "in", value: ["off track"] });
    } else if (includesAnyPhrase(normalized, ["no data", "missing data"])) {
      filters.push({ field: "status", op: "in", value: ["no data"] });
    } else if (includesAnyPhrase(normalized, ["complete", "completed"])) {
      filters.push({ field: "status", op: "in", value: ["complete"] });
    } else if (
      includesPhrase(normalized, "stalled") ||
      (includesPhrase(normalized, "neutral") && !neutralTrendIntent)
    ) {
      filters.push({ field: "status", op: "in", value: ["stalled"] });
    }

    if (includesAnyPhrase(normalized, ["toward", "improving toward"])) {
      filters.push({ field: "trending", op: "in", value: ["toward"] });
    } else if (includesAnyPhrase(normalized, ["away", "moving away"])) {
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
      includesAnyPhrase(normalized, [
        "trending up",
        "increasing",
        "rising",
        "more popular",
        "picked more",
        "played more",
        "getting picked more",
        "getting played more",
      ])
    ) {
      filters.push({ field: "trend", op: "in", value: ["increasing"] });
    } else if (
      includesAnyPhrase(normalized, [
        "trending down",
        "declining",
        "falling",
        "falling out of the meta",
        "falling out of meta",
        "less popular",
        "picked less",
        "played less",
        "getting picked less",
        "getting played less",
      ])
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
      includesAnyPhrase(normalized, ["affect", "impact", "compare"]) ||
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
      includesAnyPhrase(normalized, [
        "which heroes",
        "what heroes",
        "show heroes",
        "by hero",
      ])
    ) {
      filters.push({ field: "is_primary", op: "eq", value: "yes" });
    }

    if (
      mostPlayedHeroIntent &&
      includesAnyPhrase(normalized, [
        "which heroes",
        "what heroes",
        "show heroes",
        "by hero",
      ])
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
      includesAnyPhrase(normalized, [
        "banned by us",
        "we ban",
        "we banned",
        "by us",
        "our bans",
        "strong ban",
        "strong bans",
      ])
    ) {
      const sideFilter = filterFor(dataset, "side", "banned by us");
      if (sideFilter) filters.push(sideFilter);
    } else if (
      includesAnyPhrase(normalized, [
        "banned by enemy",
        "enemy ban",
        "enemy bans",
        "opponent ban",
        "opponent bans",
        "banned from us",
        "weak point",
      ])
    ) {
      const sideFilter = filterFor(dataset, "side", "banned by enemy");
      if (sideFilter) filters.push(sideFilter);
    }

    if (includesAnyPhrase(normalized, ["weak point", "weak points"])) {
      filters.push({ field: "tag", op: "eq", value: "weak point" });
    }
    if (includesAnyPhrase(normalized, ["strong ban", "strong bans"])) {
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
      includesAnyPhrase(normalized, [
        "counter ult",
        "counter ultimate",
        "response ult",
        "respond to ult",
        "respond to ultimate",
        "answer ult",
        "answer ultimate",
      ])
    ) {
      filters.push({ field: "type", op: "eq", value: "response" });
    } else if (
      includesAnyPhrase(normalized, [
        "ult combo",
        "ult combos",
        "ultimate combo",
        "ultimate combos",
        "combo win rate",
        "combo winrate",
      ])
    ) {
      filters.push({ field: "type", op: "eq", value: "combo" });
    }

    if (
      hero &&
      includesAnyPhrase(normalized, [
        "enemy ult",
        "enemy ultimate",
        "against",
        "respond to",
      ])
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
            "comp win rate",
            "composition win rate",
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
    } else if (namedUltimateHeroMentions.length > 0) {
      if (
        /\b(?:enemy|their|they|them)\b.*\b(?:use|uses|used|with)\b/.test(
          normalized
        )
      ) {
        filters.push({ field: "side", op: "in", value: ["enemy", "both"] });
      } else if (
        player ||
        includesAnyPhrase(normalized, ["our win rate", "we win"]) ||
        /\b(?:we|our|us)\b/.test(normalized)
      ) {
        filters.push({ field: "side", op: "in", value: ["us", "both"] });
      }
    }

    if (
      !scenario &&
      includesAnyPhrase(normalized, [
        "uncontested ult",
        "uncontested ultimate",
        "not mirrored",
        "without mirror",
      ])
    ) {
      filters.push({ field: "mirrored", op: "eq", value: "no" });
    } else if (
      !scenario &&
      includesAnyPhrase(normalized, [
        "mirror ult",
        "mirror ultimate",
        "mirrored ult",
        "mirrored ultimate",
      ])
    ) {
      filters.push({ field: "mirrored", op: "eq", value: "yes" });
    }

    if (
      !scenario &&
      includesAnyPhrase(normalized, [
        "we first",
        "ours first",
        "our ult first",
        "we ult first",
      ])
    ) {
      filters.push({ field: "first_side", op: "eq", value: "us" });
    } else if (
      !scenario &&
      includesAnyPhrase(normalized, [
        "enemy first",
        "they first",
        "enemy ult first",
        "enemy ults first",
        "they ult first",
      ])
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
    if (mentionsFightOpeningUltContext(normalized)) {
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
            "open fights with ult",
            "opens fights with ult",
            "start fights with ult",
            "starts fights with ult",
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
            "opens fights with ult per map",
            "opens fights with ult per game",
            "opens fights with ult per match",
            "start fights with ult per map",
            "start fights with ult per game",
            "start fights with ult per match",
            "starts fights with ult per map",
            "starts fights with ult per game",
            "starts fights with ult per match",
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
    const wantsCurrentStreak = includesAnyPhrase(normalized, [
      "current",
      "currently winning",
      "currently losing",
      "on a win streak",
      "on a loss streak",
      "on a losing streak",
    ]);
    const wantsLossStreak = includesAnyPhrase(normalized, [
      "loss streak",
      "losing streak",
      "currently losing",
      "on a loss streak",
      "on a losing streak",
    ]);
    const wantsWinStreak = includesAnyPhrase(normalized, [
      "win streak",
      "winning streak",
      "currently winning",
      "on a win streak",
    ]);

    if (wantsCurrentStreak) {
      filters.push({ field: "streak", op: "eq", value: "current streak" });
    } else if (
      includesPhrase(normalized, "longest") &&
      includesAnyPhrase(normalized, ["loss", "losses", "losing"])
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
    if (wantsLossStreak) {
      filters.push({ field: "result", op: "eq", value: "loss" });
    } else if (wantsWinStreak) {
      filters.push({ field: "result", op: "eq", value: "win" });
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
      includesAnyPhrase(normalized, [
        "map type",
        "map types",
        "map mode",
        "map modes",
      ])
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
  if (dataset === "teamfight") {
    const comparisonDimension = pickTeamfightComparisonDimension(normalized);
    if (comparisonDimension) add(comparisonDimension);
  }

  if (
    includesAnyPhrase(normalized, [
      "who",
      "whose",
      "which player",
      "which players",
      "rank player",
      "rank players",
      "player leaderboard",
      "players leaderboard",
    ]) &&
    !hasFilter("player")
  ) {
    add(
      dataset === "opening_kill" && mentionsFirstPickAttribution(normalized)
        ? "attacker"
        : "player"
    );
  }
  if (
    includesAnyPhrase(normalized, [
      "which hero",
      "which heroes",
      "by hero",
      "rank hero",
      "rank heroes",
      "hero leaderboard",
      "heroes leaderboard",
    ]) &&
    !hasFilter("hero") &&
    !hasFilter("our_hero")
  ) {
    if (dataset === "opening_kill" && mentionsFirstPickAttribution(normalized))
      add("attacker_hero");
    else
      add(ds.dimensions.some((d) => d.id === "our_hero") ? "our_hero" : "hero");
  }
  if (
    includesAnyPhrase(normalized, ["which role", "which roles"]) &&
    !hasFilter("role")
  ) {
    add("role");
  }
  if (
    includesAnyPhrase(normalized, [
      "which map",
      "which maps",
      "what map",
      "what maps",
      "by map",
      "by maps",
    ]) &&
    !includesAnyPhrase(normalized, [
      "map type",
      "map types",
      "map mode",
      "map modes",
    ])
  ) {
    add("map");
  }
  if (
    includesAnyPhrase(normalized, [
      "which map type",
      "which map types",
      "what map type",
      "what map types",
    ]) &&
    !hasFilter("map_type")
  ) {
    add("map_type");
  }
  if (
    includesAnyPhrase(normalized, [
      "which opponent",
      "which opponents",
      "what opponent",
      "what opponents",
    ]) &&
    !hasFilter("opponent")
  ) {
    add("opponent");
  }
  if (dataset === "kill" && dims.length === 0) {
    if (
      asksKillVictim(normalized) &&
      includesAnyPhrase(normalized, [
        "which hero",
        "which heroes",
        "what hero",
        "what heroes",
      ])
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
      includesAnyPhrase(normalized, ["who", "which player", "which players"])
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
      includesAnyPhrase(normalized, [
        "which player",
        "which players",
        "who",
        "by player",
      ])
    ) {
      if (!hasFilter("player")) add("player");
    } else if (
      includesAnyPhrase(normalized, ["which hero", "which heroes", "by hero"])
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
    includesAnyPhrase(normalized, [
      "map mode",
      "map modes",
      "map type",
      "map types",
      "by mode",
      "by map mode",
      "by map type",
      "per mode",
      "per map mode",
      "per map type",
    ])
  ) {
    add("map_type");
  }
  if (
    dataset === "map_result" &&
    dims.length === 0 &&
    includesAnyPhrase(normalized, [
      "best map mode",
      "best map type",
      "worst map mode",
      "worst map type",
    ])
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
      includesAnyPhrase(normalized, [
        "map type",
        "map types",
        "map type dependency",
        "map type dependencies",
      ])
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
    const wantsOurHeroes = includesAnyPhrase(normalized, [
      "our heroes",
      "our hero",
      "which heroes",
      "which of our heroes",
      "who on",
    ]);
    const wantsEnemyHeroes = includesAnyPhrase(normalized, [
      "enemy heroes",
      "enemy hero",
      "opponent heroes",
      "opponent hero",
      "against who",
      "against which",
    ]);
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
      includesAnyPhrase(normalized, [
        "swap count",
        "swap counts",
        "swap bucket",
        "swap buckets",
        "how many swaps",
      ])
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
    if (includesAnyPhrase(normalized, ["which map", "which maps", "by map"])) {
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
      includesAnyPhrase(normalized, [
        "which hero",
        "which heroes",
        "best hero",
        "best heroes",
        "by hero",
      ])
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
      includesAnyPhrase(normalized, ["which players", "which player", "who"]))
  ) {
    add("player");
  }
  if (dataset === "player_trend" && dims.length === 0) {
    if (
      hasFilter("player") ||
      includesAnyPhrase(normalized, [
        "what",
        "which metric",
        "which metrics",
        "at",
      ])
    ) {
      add("metric");
    } else if (!hasFilter("player")) {
      add("player");
    }
  }
  if (dataset === "player_outlier" && dims.length === 0) {
    if (
      hasFilter("player") ||
      includesAnyPhrase(normalized, [
        "which stat",
        "which stats",
        "what stat",
        "what stats",
      ])
    ) {
      add("stat");
    } else if (!hasFilter("player")) {
      add("player");
    }
  }
  if (dataset === "player_target" && dims.length === 0) {
    if (
      hasFilter("player") ||
      includesAnyPhrase(normalized, [
        "which stat",
        "which stats",
        "what stat",
        "what stats",
      ])
    ) {
      add("stat");
    } else {
      if (!hasFilter("player")) add("player");
      if (
        includesAnyPhrase(normalized, ["target", "targets", "goal", "goals"]) ||
        hasFilter("stat")
      ) {
        add("stat");
      } else if (
        includesAnyPhrase(normalized, ["status", "on track", "off track"])
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
    (includesAnyPhrase(normalized, ["target", "targets", "goal", "goals"]) ||
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
    if (includesAnyPhrase(normalized, ["weekly", "by week", "over time"])) {
      add("week");
    } else if (includesAnyPhrase(normalized, ["monthly", "by month"])) {
      add("month");
    } else if (includesAnyPhrase(normalized, ["day of week", "by day"])) {
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
      includesAnyPhrase(normalized, ["owns", "ownership", "owned by"])
    ) &&
    !(
      dataset === "player_intelligence" &&
      includesAnyPhrase(normalized, ["z score", "z-score", "composite z score"])
    ) &&
    !(
      dataset === "ability_timing" &&
      includesAnyPhrase(normalized, [
        "when should",
        "when to use",
        "best phase",
      ])
    ) &&
    !(
      dataset === "opening_kill" &&
      (mentionsFirstPickAttribution(normalized) ||
        mentionsFirstDeathAttribution(normalized))
    ) &&
    !(
      dataset === "hero_trend" &&
      includesAnyPhrase(normalized, [
        "trending up",
        "trending down",
        "increasing",
        "declining",
        "rising",
        "falling",
        "picked more",
        "picked less",
        "played more",
        "played less",
        "usage",
        "meta",
      ])
    )
  ) {
    return null;
  }
  const metric = getMetric(dataset, metrics[0].metric);
  const wantsHigh =
    mentionsHighRankingIntent(normalized) ||
    (dataset === "ability_timing" &&
      includesAnyPhrase(normalized, [
        "when should",
        "when to use",
        "best phase",
      ])) ||
    (dataset === "opening_kill" &&
      (mentionsFirstPickAttribution(normalized) ||
        mentionsFirstDeathAttribution(normalized))) ||
    (dataset === "hero_pickrate" &&
      includesAnyPhrase(normalized, ["owns", "ownership", "owned by"])) ||
    (dataset === "player_intelligence" &&
      includesAnyPhrase(normalized, [
        "z score",
        "z-score",
        "composite z score",
      ])) ||
    (dataset === "hero_trend" &&
      includesAnyPhrase(normalized, [
        "rising",
        "increasing",
        "trending up",
        "picked more",
        "played more",
      ]));
  const wantsLow =
    mentionsLowRankingIntent(normalized) ||
    (dataset === "hero_trend" &&
      includesAnyPhrase(normalized, [
        "falling",
        "declining",
        "trending down",
        "picked less",
        "played less",
      ]));
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
