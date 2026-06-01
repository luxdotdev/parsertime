import { getDataset, getMetric } from "@/lib/query-builder/registry";
import {
  DEFAULT_METRIC,
  METRIC_ALIASES,
} from "@/lib/query-builder/natural-language-config";

import {
  mentionsFightComebackRateContext,
  mentionsFirstDeathAttribution,
  mentionsFirstPickAttribution,
  mentionsMapPlaytimeContext,
  mentionsStatVersusPlaytimeContext,
  mentionsWithWithoutBanComparison,
} from "@/lib/query-builder/natural-language-intent";
import {
  mentionsWonLostFightUltComparison,
  pickResultScope,
} from "@/lib/query-builder/natural-language-filter-intent";
import {
  includesAnyPhrase,
  includesPhrase,
  normalize,
} from "@/lib/query-builder/natural-language-text";
import {
  extractRotationDeathSignalFilters,
  extractSwapCountFilter,
  hasAverageRotationSignalIntent,
} from "@/lib/query-builder/natural-language-thresholds";
import {
  metricKey,
  type DatasetId,
  type MetricRef,
} from "@/lib/query-builder/types";

const COUNT_INTENT_PHRASES = ["how many", "number", "count", "total"];
const WIN_RATE_PHRASES = ["win rate", "win rates", "winrate", "winrates"];
const LOSS_INTENT_PHRASES = ["losses", "lost", "lose"];

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
    includesAnyPhrase(normalized, ["average", "avg"]) &&
    metric.allowedAggs.includes("avg")
  ) {
    return "avg";
  }
  if (
    includesAnyPhrase(normalized, [
      "number",
      "total",
      "how many",
      "how often",
      "most",
    ]) &&
    metric.allowedAggs.includes("sum")
  ) {
    return "sum";
  }
  if (metricId === "time_played" && metric.allowedAggs.includes("sum")) {
    return "sum";
  }
  return metric.defaultAgg;
}

function metricAliasCore(alias: string) {
  return normalize(alias)
    .replace(/\bper 10(?: minutes?)?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickPreferredTeamfightMetric(normalized: string): string | null {
  if (
    includesAnyPhrase(normalized, [
      "non dry fight reversal rate",
      "non-dry fight reversal rate",
      "non dry reversal rate",
      "non dry fight comeback rate",
      "non-dry fight comeback rate",
      "non dry comeback rate",
    ])
  ) {
    return "non_dry_fight_reversal_rate";
  }
  if (
    includesAnyPhrase(normalized, [
      "dry fight reversal rate",
      "dry-fight reversal rate",
      "dry reversal rate",
      "dry fight comeback rate",
      "dry comeback rate",
    ])
  ) {
    return "dry_fight_reversal_rate";
  }
  if (mentionsFightComebackRateContext(normalized)) return "reversal_rate";
  if (
    includesAnyPhrase(normalized, [
      "ultimate efficiency",
      "ult efficiency",
      "fight wins per ultimate",
      "fight wins per ult",
    ])
  ) {
    return "ultimate_efficiency";
  }
  return null;
}

function pickPreferredHeroTrendMetric(normalized: string): string | null {
  if (
    includesAnyPhrase(normalized, [
      "pick rate",
      "pickrate",
      "picked",
      "getting picked",
      "usage",
      "meta",
    ])
  ) {
    return "pick_rate_trend";
  }
  if (
    includesAnyPhrase(normalized, [
      "playtime",
      "time played",
      "played",
      "getting played",
    ])
  ) {
    return "playtime_trend";
  }
  return null;
}

export function pickMetrics(dataset: DatasetId, question: string): MetricRef[] {
  const normalized = normalize(question);
  const ds = getDataset(dataset);
  const matches: { ref: MetricRef; aliases: string[] }[] = [];

  for (const metric of ds.metrics) {
    const aliases = [
      metric.id.replace(/_/g, " "),
      metric.label,
      ...(METRIC_ALIASES[metric.id] ?? []),
    ];
    const matchedAliases = aliases.filter((alias) =>
      includesPhrase(normalized, alias)
    );
    if (matchedAliases.length > 0) {
      const agg = pickMetricAgg(dataset, metric.id, question);
      if (agg) matches.push({ ref: { metric: metric.id, agg }, aliases });
    }
  }

  const refs = matches
    .filter(({ aliases }, index) => {
      const matchedAliases = aliases.filter((alias) =>
        includesPhrase(normalized, alias)
      );
      return matchedAliases.some((alias) => {
        const normalizedAlias = metricAliasCore(alias);
        return !matches.some((other, otherIndex) => {
          if (otherIndex === index) return false;
          return other.aliases.some((otherAlias) => {
            const normalizedOtherAlias = metricAliasCore(otherAlias);
            return (
              normalizedOtherAlias.length > normalizedAlias.length &&
              includesPhrase(normalized, otherAlias) &&
              includesPhrase(normalizedOtherAlias, normalizedAlias)
            );
          });
        });
      });
    })
    .map(({ ref }) => ref);

  if (
    dataset === "player_stat" &&
    refs.length === 0 &&
    includesPhrase(normalized, "accuracy")
  ) {
    refs.push({ metric: "weapon_accuracy", agg: "ratio" });
  }

  if (dataset === "teamfight" && includesPhrase(normalized, "wasted ult")) {
    refs.push({ metric: "avg_wasted_ults", agg: "avg" });
  }

  if (dataset === "teamfight") {
    if (
      includesAnyPhrase(normalized, [
        "ults did we use",
        "ultimates did we use",
        "ults we use",
        "ultimates we use",
      ]) &&
      !refs.some((ref) => ref.metric === "ults_used")
    ) {
      refs.push({ metric: "ults_used", agg: "sum" });
    }

    const wantsFightCount = includesAnyPhrase(normalized, [
      "how many fights",
      "number of fights",
      "fight count",
      "count fights",
    ]);
    if (!wantsFightCount && refs.length > 1) {
      for (let i = refs.length - 1; i >= 0; i--) {
        if (refs[i].metric === "fights") refs.splice(i, 1);
      }
    }

    const preferredTeamfightMetric = pickPreferredTeamfightMetric(normalized);
    if (preferredTeamfightMetric) {
      for (let i = refs.length - 1; i >= 0; i--) {
        if (refs[i].metric !== preferredTeamfightMetric) refs.splice(i, 1);
      }
      if (!refs.some((ref) => ref.metric === preferredTeamfightMetric)) {
        const agg = pickMetricAgg(dataset, preferredTeamfightMetric, question);
        if (agg) refs.push({ metric: preferredTeamfightMetric, agg });
      }
    }
    if (mentionsWonLostFightUltComparison(normalized)) {
      for (let i = refs.length - 1; i >= 0; i--) {
        if (
          !["avg_ults_in_won_fights", "avg_ults_in_lost_fights"].includes(
            refs[i].metric
          )
        ) {
          refs.splice(i, 1);
        }
      }
      for (const metric of [
        "avg_ults_in_won_fights",
        "avg_ults_in_lost_fights",
      ]) {
        if (refs.some((ref) => ref.metric === metric)) continue;
        const agg = pickMetricAgg(dataset, metric, question);
        if (agg) refs.push({ metric, agg });
      }
    }
  }

  if (
    dataset === "map_intelligence" &&
    includesAnyPhrase(normalized, [
      "improving",
      "declining",
      "map trend",
      "map trends",
      "trend delta",
    ])
  ) {
    refs.unshift({ metric: "trend_delta", agg: "avg" });
  }

  if (dataset === "opening_kill") {
    if (mentionsFirstPickAttribution(normalized)) {
      refs.unshift({ metric: "first_picks", agg: "sum" });
    } else if (mentionsFirstDeathAttribution(normalized)) {
      refs.unshift({ metric: "first_deaths", agg: "sum" });
    }
  }

  if (dataset === "player_impact") {
    const mentionsSpecificVolatilityMetric = includesAnyPhrase(normalized, [
      "damage volatility",
      "volatile damage",
      "healing volatility",
      "volatile healing",
      "deaths volatility",
      "death volatility",
      "eliminations volatility",
      "elims volatility",
    ]);
    const preferredMetric =
      includesPhrase(normalized, "map mvp") &&
      !includesPhrase(normalized, "map mvp rate") &&
      !includesPhrase(normalized, "map mvp percentage")
        ? "map_mvp_count"
        : !mentionsSpecificVolatilityMetric &&
            includesAnyPhrase(normalized, [
              "least volatile",
              "most volatile",
              "volatile player",
              "volatile players",
              "volatility player",
              "volatility players",
            ])
          ? "all_damage_per10_stddev"
          : includesAnyPhrase(normalized, ["stable", "stability", "steady"])
            ? "consistency_score"
            : /\b(?:take|takes|took|taking)\b.*\b(?:use|used)\b.*\b(?:ult|ultimate)\b/.test(
                  normalized
                )
              ? "average_time_to_use_ult"
              : null;
    if (preferredMetric) {
      for (let i = refs.length - 1; i >= 0; i--) {
        if (refs[i].metric !== preferredMetric) refs.splice(i, 1);
      }
      if (!refs.some((ref) => ref.metric === preferredMetric)) {
        const agg = pickMetricAgg(dataset, preferredMetric, question);
        if (agg) refs.push({ metric: preferredMetric, agg });
      }
    }
  }

  if (refs.length === 0) {
    const fallback = DEFAULT_METRIC[dataset];
    const agg = pickMetricAgg(dataset, fallback, question);
    if (agg) refs.push({ metric: fallback, agg });
  }

  if (
    dataset === "trend" &&
    refs.some((ref) => ref.metric === "win_rate") &&
    !refs.some((ref) => ref.metric === "maps") &&
    includesAnyPhrase(normalized, [
      "last 5 games",
      "last 10 games",
      "last 20 games",
      "recent games",
      "day of week",
      "best day",
      "worst day",
    ])
  ) {
    refs.push({ metric: "maps", agg: "count" });
  }

  const deduped = dedupeMetrics(refs);
  if (
    pickResultScope(normalized) &&
    getDataset(dataset).filters.some((filter) => filter.id === "result")
  ) {
    const hasScopedMetric = deduped.some(
      (ref) => ref.metric !== "wins" && ref.metric !== "losses"
    );
    if (hasScopedMetric) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "wins" || deduped[i].metric === "losses") {
          deduped.splice(i, 1);
        }
      }
    }
  }
  if (dataset === "map_intelligence") {
    const wantsCount = includesAnyPhrase(normalized, COUNT_INTENT_PHRASES);
    const hasWeighted = deduped.some(
      (ref) => ref.metric === "weighted_win_rate"
    );
    const hasTrendDelta = deduped.some((ref) => ref.metric === "trend_delta");
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (!wantsCount && ["maps", "wins", "losses"].includes(deduped[i].metric))
        deduped.splice(i, 1);
      else if (hasWeighted && deduped[i].metric === "win_rate")
        deduped.splice(i, 1);
    }
    if (hasTrendDelta || hasWeighted) {
      const priority = hasTrendDelta ? "trend_delta" : "weighted_win_rate";
      deduped.sort((a, b) =>
        a.metric === priority ? -1 : b.metric === priority ? 1 : 0
      );
    }
  }
  if (dataset === "team_performance") {
    const per10ToRaw: Record<string, string> = {
      eliminations_per10: "eliminations",
      final_blows_per10: "final_blows",
      deaths_per10: "deaths",
      hero_damage_per10: "hero_damage",
      all_damage_per10: "all_damage",
      healing_per10: "healing",
      healing_received_per10: "healing_received",
      damage_taken_per10: "damage_taken",
      damage_blocked_per10: "damage_blocked",
      ults_earned_per10: "ultimates_earned",
      ults_used_per10: "ultimates_used",
      solo_kills_per10: "solo_kills",
      objective_kills_per10: "objective_kills",
      offensive_assists_per10: "offensive_assists",
      defensive_assists_per10: "defensive_assists",
      first_picks_per10: "first_pick_count",
      first_deaths_per10: "first_death_count",
      ajax_per10: "ajax_count",
    };
    const per10Metrics = new Set(
      deduped
        .filter((ref) => ref.metric.endsWith("_per10"))
        .map((ref) => ref.metric)
    );
    if (per10Metrics.size > 0) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        const raw = Array.from(per10Metrics).some(
          (metric) => per10ToRaw[metric] === deduped[i].metric
        );
        if (raw) deduped.splice(i, 1);
      }
      deduped.sort((a, b) =>
        a.metric.endsWith("_per10") ? -1 : b.metric.endsWith("_per10") ? 1 : 0
      );
    }
  }
  if (dataset === "player_impact") {
    const per10ToRaw: Record<string, string> = {
      eliminations_per10: "eliminations",
      final_blows_per10: "final_blows",
      deaths_per10: "deaths",
      hero_damage_per10: "hero_damage",
      all_damage_per10: "all_damage",
      healing_per10: "healing",
      damage_taken_per10: "damage_taken",
      ults_used_per10: "ultimates_used",
      first_picks_per10: "first_pick_count",
      first_deaths_per10: "first_death_count",
      ajax_per10: "ajax_count",
    };
    const per10Metrics = new Set(
      deduped
        .filter((ref) => ref.metric.endsWith("_per10"))
        .map((ref) => ref.metric)
    );
    if (per10Metrics.size > 0) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        const raw = Array.from(per10Metrics).some(
          (metric) => per10ToRaw[metric] === deduped[i].metric
        );
        if (raw) deduped.splice(i, 1);
      }
      deduped.sort((a, b) =>
        a.metric.endsWith("_per10") ? -1 : b.metric.endsWith("_per10") ? 1 : 0
      );
    }
  }
  if (mentionsStatVersusPlaytimeContext(normalized)) {
    const hasTimePlayedMetric = Boolean(getMetric(dataset, "time_played"));
    for (const ref of deduped) {
      if (ref.metric === "time_played" || ref.metric === "maps") continue;
      const metric = getMetric(dataset, ref.metric);
      if (ref.agg === "avg" && metric?.allowedAggs.includes("sum")) {
        ref.agg = "sum";
      }
    }
    const rateableRefs = deduped.filter((ref) => {
      if (ref.metric === "time_played" || ref.metric === "maps") return false;
      return getMetric(dataset, ref.metric)?.allowedAggs.includes("per10");
    });
    for (const ref of rateableRefs) {
      if (
        !deduped.some(
          (candidate) =>
            candidate.metric === ref.metric && candidate.agg === "per10"
        )
      ) {
        deduped.push({ metric: ref.metric, agg: "per10" });
      }
    }
    if (
      hasTimePlayedMetric &&
      !deduped.some((ref) => ref.metric === "time_played")
    ) {
      deduped.push({ metric: "time_played", agg: "sum" });
    }
    if (hasTimePlayedMetric && rateableRefs.length > 0) {
      deduped.sort((a, b) => {
        function priority(ref: MetricRef) {
          return ref.metric === "time_played" ? 1 : ref.agg === "per10" ? 2 : 0;
        }
        return priority(a) - priority(b);
      });
    }
  }
  if (
    dataset === "player_impact" &&
    includesAnyPhrase(normalized, [
      "volatile",
      "volatility",
      "variance",
      "standard deviation",
      "stddev",
    ])
  ) {
    const volatilityMetrics = new Set([
      "eliminations_per10_stddev",
      "deaths_per10_stddev",
      "all_damage_per10_stddev",
      "healing_per10_stddev",
    ]);
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (!volatilityMetrics.has(deduped[i].metric)) deduped.splice(i, 1);
    }
    deduped.sort((a, b) =>
      volatilityMetrics.has(a.metric)
        ? -1
        : volatilityMetrics.has(b.metric)
          ? 1
          : 0
    );
  }
  if (
    dataset === "player_outlier" &&
    includesAnyPhrase(normalized, [
      "outlier",
      "outliers",
      "hero baseline",
      "far above",
      "far below",
      "above baseline",
      "below baseline",
    ])
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "baseline_per10") deduped.splice(i, 1);
    }
    const hasSpecificOutlierMetric = deduped.some((ref) =>
      ["z_score", "percentile", "per10_value"].includes(ref.metric)
    );
    if (hasSpecificOutlierMetric) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "abs_z_score") deduped.splice(i, 1);
      }
    }
    if (
      !hasSpecificOutlierMetric &&
      !deduped.some((ref) => ref.metric === "abs_z_score")
    ) {
      const agg = pickMetricAgg(dataset, "abs_z_score", question);
      if (agg) deduped.unshift({ metric: "abs_z_score", agg });
    }
    deduped.sort((a, b) =>
      a.metric === "abs_z_score" ? -1 : b.metric === "abs_z_score" ? 1 : 0
    );
  }
  if (dataset === "player_target") {
    const hasPrimaryTargetMetric = deduped.some(
      (ref) => !["sample_scrims", "scrim_window"].includes(ref.metric)
    );
    if (hasPrimaryTargetMetric) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (["sample_scrims", "scrim_window"].includes(deduped[i].metric)) {
          deduped.splice(i, 1);
        }
      }
    }
  }
  if (dataset === "role_performance") {
    const per10ToRaw: Record<string, string> = {
      final_blows_per10: "final_blows",
      eliminations_per10: "eliminations",
      assists_per10: "assists",
      deaths_per10: "deaths",
      damage_per10: "hero_damage",
      healing_per10: "healing",
      damage_taken_per10: "damage_taken",
      ults_earned_per10: "ultimates_earned",
      ults_used_per10: "ultimates_used",
    };
    const per10Metrics = new Set(
      deduped
        .filter((ref) => ref.metric.endsWith("_per10"))
        .map((ref) => ref.metric)
    );
    if (per10Metrics.size > 0) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        const raw = Array.from(per10Metrics).some(
          (metric) => per10ToRaw[metric] === deduped[i].metric
        );
        if (raw) deduped.splice(i, 1);
      }
      deduped.sort((a, b) =>
        a.metric.endsWith("_per10") ? -1 : b.metric.endsWith("_per10") ? 1 : 0
      );
    }
  }
  if (
    deduped.some((ref) => ref.metric === "win_rate") &&
    includesAnyPhrase(normalized, WIN_RATE_PHRASES)
  ) {
    deduped.sort((a, b) =>
      a.metric === "win_rate" ? -1 : b.metric === "win_rate" ? 1 : 0
    );
  }
  if (dataset === "opening_kill") {
    const wantsOpeningRanking = includesAnyPhrase(normalized, [
      "most",
      "top",
      "highest",
      "worst",
    ]);
    const priority = wantsOpeningRanking
      ? mentionsFirstPickAttribution(normalized)
        ? "first_picks"
        : mentionsFirstDeathAttribution(normalized)
          ? "first_deaths"
          : null
      : null;
    if (priority) {
      deduped.sort((a, b) =>
        a.metric === priority ? -1 : b.metric === priority ? 1 : 0
      );
    }
  }
  if (
    deduped.some((ref) => ref.metric === "losses") &&
    includesAnyPhrase(normalized, LOSS_INTENT_PHRASES)
  ) {
    deduped.sort((a, b) =>
      a.metric === "losses" ? -1 : b.metric === "losses" ? 1 : 0
    );
  }
  if (
    dataset === "hero_pickrate" &&
    deduped.some((ref) => ref.metric === "ownership_rate") &&
    includesAnyPhrase(normalized, [
      "ownership",
      "owns",
      "owned by",
      "share of hero",
    ])
  ) {
    deduped.sort((a, b) =>
      a.metric === "ownership_rate" ? -1 : b.metric === "ownership_rate" ? 1 : 0
    );
  }
  if (dataset === "hero_trend") {
    const preferredHeroTrendMetric = pickPreferredHeroTrendMetric(normalized);

    if (preferredHeroTrendMetric) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric !== preferredHeroTrendMetric) {
          deduped.splice(i, 1);
        }
      }
      if (!deduped.some((ref) => ref.metric === preferredHeroTrendMetric)) {
        const agg = pickMetricAgg(dataset, preferredHeroTrendMetric, question);
        if (agg) deduped.unshift({ metric: preferredHeroTrendMetric, agg });
      }
    }
  }
  if (
    dataset === "rotation_death" &&
    extractRotationDeathSignalFilters(normalized).length > 0 &&
    !hasAverageRotationSignalIntent(normalized) &&
    deduped.some((ref) => ref.metric === "rotation_deaths")
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (
        deduped[i].metric === "pre_fight_damage" ||
        deduped[i].metric === "kill_distance"
      ) {
        deduped.splice(i, 1);
      }
    }
  }
  if (
    dataset === "rotation_death" &&
    hasAverageRotationSignalIntent(normalized)
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "rotation_deaths" && deduped.length > 1) {
        deduped.splice(i, 1);
      }
    }
    const priority = includesAnyPhrase(normalized, [
      "kill distance",
      "death distance",
    ])
      ? "kill_distance"
      : includesAnyPhrase(normalized, ["pre fight damage", "pre-fight damage"])
        ? "pre_fight_damage"
        : null;
    if (priority) {
      deduped.sort((a, b) =>
        a.metric === priority ? -1 : b.metric === priority ? 1 : 0
      );
    }
  }
  if (
    dataset === "swap_impact" &&
    extractSwapCountFilter(normalized) &&
    deduped.some((ref) => ref.metric === "win_rate")
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "maps") deduped.splice(i, 1);
    }
  }
  if (
    dataset === "rotation_death" &&
    deduped.some((ref) => ref.metric === "rotation_death_rate") &&
    includesAnyPhrase(normalized, ["rate", "percentage", "pct"])
  ) {
    deduped.sort((a, b) =>
      a.metric === "rotation_death_rate"
        ? -1
        : b.metric === "rotation_death_rate"
          ? 1
          : 0
    );
  }
  if (
    dataset === "ban_impact" &&
    includesAnyPhrase(normalized, [
      "weak point",
      "weak points",
      "strong ban",
      "strong bans",
      "impact",
    ])
  ) {
    deduped.sort((a, b) =>
      a.metric === "win_rate_delta" ? -1 : b.metric === "win_rate_delta" ? 1 : 0
    );
  }
  if (
    dataset === "ban_impact" &&
    mentionsWithWithoutBanComparison(normalized)
  ) {
    for (const metric of [
      "win_rate_with",
      "win_rate_without",
      "win_rate_delta",
    ]) {
      const agg = pickMetricAgg(dataset, metric, question);
      if (agg && !deduped.some((ref) => ref.metric === metric)) {
        deduped.push({ metric, agg });
      }
    }
    deduped.sort((a, b) => {
      const priority = ["win_rate_with", "win_rate_without", "win_rate_delta"];
      return priority.indexOf(a.metric) - priority.indexOf(b.metric);
    });
  }
  if (
    dataset === "ult_impact" &&
    !deduped.some((ref) => ref.metric === "win_rate") &&
    includesAnyPhrase(normalized, [
      "what happens",
      "impact",
      "mirror",
      "mirrored",
      "uncontested",
    ])
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
    const wantsWinRate = includesAnyPhrase(normalized, [
      ...WIN_RATE_PHRASES,
      "record",
    ]);
    if (!wantsWinRate) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric !== "playtime") deduped.splice(i, 1);
      }
    }
  }
  if (
    dataset === "map_result" &&
    includesAnyPhrase(normalized, ["best", "worst", "top", "highest", "lowest"])
  ) {
    const wantsCount = includesAnyPhrase(normalized, [
      ...COUNT_INTENT_PHRASES,
      "most maps",
    ]);
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
  if (
    dataset === "ult_usage" &&
    includesAnyPhrase(normalized, ["per map", "per game", "per match"])
  ) {
    const priority = deduped.some(
      (ref) => ref.metric === "fight_openings_per_map"
    )
      ? "fight_openings_per_map"
      : "ults_per_map";
    deduped.sort((a, b) =>
      a.metric === priority ? -1 : b.metric === priority ? 1 : 0
    );
  }
  if (
    dataset === "ult_economy" &&
    deduped.some((ref) => ref.metric === "avg_advantage") &&
    includesAnyPhrase(normalized, [
      "average ult advantage",
      "avg ult advantage",
      "average ultimate advantage",
      "avg ultimate advantage",
      "average ult bank",
      "ult bank advantage",
    ])
  ) {
    deduped.sort((a, b) =>
      a.metric === "avg_advantage" ? -1 : b.metric === "avg_advantage" ? 1 : 0
    );
  }
  if (
    dataset === "streak" &&
    includesAnyPhrase(normalized, ["streak length", "games long", "maps long"])
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "streaks") deduped.splice(i, 1);
    }
    if (!deduped.some((ref) => ref.metric === "length")) {
      const agg = pickMetricAgg(dataset, "length", question);
      if (agg) deduped.unshift({ metric: "length", agg });
    }
  }
  if (
    dataset === "hero_trend" &&
    deduped.some((ref) => ref.metric === "pick_rate_trend")
  ) {
    for (let i = deduped.length - 1; i >= 0; i--) {
      if (deduped[i].metric === "pick_rate") deduped.splice(i, 1);
    }
    deduped.sort((a, b) =>
      a.metric === "pick_rate_trend"
        ? -1
        : b.metric === "pick_rate_trend"
          ? 1
          : 0
    );
  }
  if (dataset === "duel") {
    const wantsDuelSample =
      includesPhrase(normalized, "duels") &&
      includesAnyPhrase(normalized, [
        "at least",
        "minimum",
        "min",
        "more than",
        "over",
        "at most",
        "maximum",
        "under",
      ]);
    const wantsCount =
      includesAnyPhrase(normalized, COUNT_INTENT_PHRASES) || wantsDuelSample;
    const wantsLosses = includesAnyPhrase(normalized, [
      ...LOSS_INTENT_PHRASES,
      "deaths",
      "died",
    ]);
    if (!wantsCount) {
      for (let i = deduped.length - 1; i >= 0; i--) {
        if (deduped[i].metric === "duels") deduped.splice(i, 1);
      }
      if (wantsLosses && !deduped.some((ref) => ref.metric === "losses")) {
        const agg = pickMetricAgg(dataset, "losses", question);
        if (agg) deduped.unshift({ metric: "losses", agg });
      }
      if (!wantsLosses && !deduped.some((ref) => ref.metric === "win_rate")) {
        const agg = pickMetricAgg(dataset, "win_rate", question);
        if (agg) deduped.unshift({ metric: "win_rate", agg });
      }
    }
    if (wantsLosses) {
      deduped.sort((a, b) =>
        a.metric === "losses" ? -1 : b.metric === "losses" ? 1 : 0
      );
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
