import {
  assessConfidence,
  isSufficientConfidence,
  type ConfidenceMetadata,
} from "@/lib/confidence";
import type { HeroBanIntelligence } from "@/data/hero-ban-intelligence-dto";
import type { MapIntelligence } from "@/data/map-intelligence-dto";
import type { PlayerIntelligence } from "@/data/player-intelligence-dto";
import type { TeamStrengthRating } from "@/data/opponent-strength-dto";

export type InsightCategory =
  | "map_advantage"
  | "map_vulnerability"
  | "ban_exploitation"
  | "ban_defense"
  | "player_highlight"
  | "player_vulnerability"
  | "trend_alert";

export type DataPoint = {
  label: string;
  value: string | number;
  unit?: string;
};

export type Insight = {
  id: string;
  category: InsightCategory;
  /** 1–100. Higher means more actionable. Drives sort order in the report. */
  priority: number;
  headline: string;
  detail: string;
  confidence: ConfidenceMetadata;
  dataPoints: DataPoint[];
  actionItems: string[];
};

export type InsightReport = {
  primary: Insight[];
  secondary: Insight[];
  totalInsights: number;
  overallConfidence: ConfidenceMetadata;
};

export type InsightGenerationParams = {
  mapIntelligence: MapIntelligence | null;
  banIntelligence: HeroBanIntelligence | null;
  playerIntelligence: PlayerIntelligence | null;
  strengthRating: TeamStrengthRating | null;
  opponentAbbr: string;
  hasUserTeamLink: boolean;
};

const MAP_MATCHUP_THRESHOLD_PP = 15;
const TREND_MIN_RECENT_MAPS = 3;
const MAX_PRIMARY_INSIGHTS = 5;

function confidenceBonus(level: ConfidenceMetadata["level"]): number {
  if (level === "high") return 20;
  if (level === "medium") return 10;
  return 0;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function weakerOf(
  a: ConfidenceMetadata,
  b: ConfidenceMetadata
): ConfidenceMetadata {
  const order: ConfidenceMetadata["level"][] = [
    "insufficient",
    "low",
    "medium",
    "high",
  ];
  return order.indexOf(a.level) <= order.indexOf(b.level) ? a : b;
}

function generateMapMatchupInsights(
  mapIntelligence: MapIntelligence
): Insight[] {
  const insights: Insight[] = [];

  const actionableEntries = mapIntelligence.matchupMatrix.filter(
    (entry) =>
      entry.netAdvantage !== null &&
      isSufficientConfidence(entry.userConfidence) &&
      isSufficientConfidence(entry.opponentConfidence)
  );

  for (const entry of actionableEntries) {
    const advantage = entry.netAdvantage!;
    if (Math.abs(advantage) < MAP_MATCHUP_THRESHOLD_PP) continue;

    const combined = weakerOf(entry.userConfidence, entry.opponentConfidence);
    const magnitudeScore = Math.min((Math.abs(advantage) / 50) * 60, 60);
    const priority = Math.round(
      magnitudeScore + confidenceBonus(combined.level) + 10
    );

    if (advantage > 0) {
      insights.push({
        id: `map_advantage_${slugify(entry.mapName)}`,
        category: "map_advantage",
        priority,
        headline: `${entry.mapName} is your best matchup (+${Math.round(advantage)}pp)`,
        detail: `Your team wins ${Math.round(entry.userWinRate!)}% on ${entry.mapName} versus their strength-weighted ${Math.round(entry.opponentStrengthWeightedWR)}% — a ${Math.round(advantage)}pp net edge.`,
        confidence: combined,
        dataPoints: [
          { label: "Your win rate", value: `${Math.round(entry.userWinRate!)}%` },
          {
            label: "Their win rate (weighted)",
            value: `${Math.round(entry.opponentStrengthWeightedWR)}%`,
          },
          { label: "Net advantage", value: `+${Math.round(advantage)}pp` },
          { label: "Opponent maps", value: entry.opponentPlayed, unit: "maps" },
        ],
        actionItems: [`Pick ${entry.mapName} in the map veto`],
      });
    } else {
      insights.push({
        id: `map_vulnerability_${slugify(entry.mapName)}`,
        category: "map_vulnerability",
        priority,
        headline: `Avoid ${entry.mapName} — they have a ${Math.abs(Math.round(advantage))}pp edge`,
        detail: `Your team wins ${Math.round(entry.userWinRate!)}% on ${entry.mapName} versus their strength-weighted ${Math.round(entry.opponentStrengthWeightedWR)}% — they hold a ${Math.abs(Math.round(advantage))}pp advantage.`,
        confidence: combined,
        dataPoints: [
          { label: "Your win rate", value: `${Math.round(entry.userWinRate!)}%` },
          {
            label: "Their win rate (weighted)",
            value: `${Math.round(entry.opponentStrengthWeightedWR)}%`,
          },
          {
            label: "Net disadvantage",
            value: `${Math.round(advantage)}pp`,
          },
          { label: "Opponent maps", value: entry.opponentPlayed, unit: "maps" },
        ],
        actionItems: [`Ban ${entry.mapName} in the map veto`],
      });
    }
  }

  const advantages = insights
    .filter((i) => i.category === "map_advantage")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  const vulnerabilities = insights
    .filter((i) => i.category === "map_vulnerability")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  return [...advantages, ...vulnerabilities];
}

function generateTrendInsights(mapIntelligence: MapIntelligence): Insight[] {
  const insights: Insight[] = [];

  for (const trend of mapIntelligence.trends) {
    if (trend.trend === "stable") continue;
    if (trend.recentPlayed < TREND_MIN_RECENT_MAPS) continue;

    const recentConfidence = assessConfidence(trend.recentPlayed, {
      low: 3,
      medium: 5,
      high: 8,
    });
    if (!isSufficientConfidence(recentConfidence)) continue;

    const magnitudeScore = Math.min((Math.abs(trend.delta) / 30) * 50, 50);
    const priority = Math.round(
      magnitudeScore + confidenceBonus(recentConfidence.level) + 5
    );

    if (trend.trend === "improving") {
      insights.push({
        id: `trend_improving_${slugify(trend.mapName)}`,
        category: "trend_alert",
        priority,
        headline: `Opponent is on a ${trend.mapName} hot streak (+${Math.round(trend.delta)}pp recent)`,
        detail: `Their last ${trend.recentPlayed} maps on ${trend.mapName}: ${Math.round(trend.recentWinRate)}% WR, up from ${Math.round(trend.overallWinRate)}% overall — +${Math.round(trend.delta)}pp improvement in form.`,
        confidence: recentConfidence,
        dataPoints: [
          {
            label: "Recent win rate",
            value: `${Math.round(trend.recentWinRate)}%`,
          },
          {
            label: "Overall win rate",
            value: `${Math.round(trend.overallWinRate)}%`,
          },
          { label: "Trend delta", value: `+${Math.round(trend.delta)}pp` },
          {
            label: "Recent maps",
            value: trend.recentPlayed,
            unit: "maps",
          },
        ],
        actionItems: [
          `Account for their improved ${trend.mapName} form when weighting the veto`,
        ],
      });
    } else {
      insights.push({
        id: `trend_declining_${slugify(trend.mapName)}`,
        category: "trend_alert",
        priority,
        headline: `${trend.mapName} is a soft spot — they're slipping (${Math.round(trend.delta)}pp)`,
        detail: `Their last ${trend.recentPlayed} maps on ${trend.mapName}: ${Math.round(trend.recentWinRate)}% WR, down from ${Math.round(trend.overallWinRate)}% overall — a ${Math.round(trend.delta)}pp decline in form.`,
        confidence: recentConfidence,
        dataPoints: [
          {
            label: "Recent win rate",
            value: `${Math.round(trend.recentWinRate)}%`,
          },
          {
            label: "Overall win rate",
            value: `${Math.round(trend.overallWinRate)}%`,
          },
          { label: "Trend delta", value: `${Math.round(trend.delta)}pp` },
          {
            label: "Recent maps",
            value: trend.recentPlayed,
            unit: "maps",
          },
        ],
        actionItems: [`Consider forcing ${trend.mapName} to exploit their declining form`],
      });
    }
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 2);
}

function generateBanStrategyInsights(
  banIntelligence: HeroBanIntelligence
): Insight[] {
  const insights: Insight[] = [];

  const topDisruption = banIntelligence.banDisruptionRanking
    .filter((d) => isSufficientConfidence(d.confidence))
    .slice(0, 2);

  for (const disruption of topDisruption) {
    const magnitudeScore = Math.min((disruption.disruptionScore / 20) * 60, 60);
    const priority = Math.round(
      magnitudeScore + confidenceBonus(disruption.confidence.level) + 5
    );

    insights.push({
      id: `ban_exploitation_${slugify(disruption.hero)}`,
      category: "ban_exploitation",
      priority,
      headline: `Ban ${disruption.hero} — they drop ${Math.round(disruption.winRateDelta)}pp without it`,
      detail: `${disruption.hero} has the highest disruption score: opponent wins ${Math.round(disruption.winRateDelta)}pp more when it's available versus when banned (${disruption.mapsAvailable} available, ${disruption.mapsBanned} banned).`,
      confidence: disruption.confidence,
      dataPoints: [
        {
          label: "Win rate delta",
          value: `${Math.round(disruption.winRateDelta)}pp`,
        },
        {
          label: "Disruption score",
          value: disruption.disruptionScore.toFixed(1),
        },
        {
          label: "Maps available",
          value: disruption.mapsAvailable,
          unit: "maps",
        },
        {
          label: "Maps banned",
          value: disruption.mapsBanned,
          unit: "maps",
        },
      ],
      actionItems: [`Prioritize banning ${disruption.hero}`],
    });
  }

  const highExposure = banIntelligence.heroExposure
    .filter((e) => e.exposureRisk === "high")
    .slice(0, 2);

  for (const exposure of highExposure) {
    const magnitudeScore = Math.min((exposure.opponentBanRate / 50) * 50, 50);
    const exposureConfidence = assessConfidence(exposure.opponentBanCount);
    const priority = Math.round(
      magnitudeScore + confidenceBonus(exposureConfidence.level) + 10
    );

    insights.push({
      id: `ban_defense_${slugify(exposure.hero)}`,
      category: "ban_defense",
      priority,
      headline: `${exposure.hero} is at high risk — opponent bans it ${Math.round(exposure.opponentBanRate)}% of the time`,
      detail: `Your team plays ${exposure.hero} ${Math.round(exposure.userPlayRate)}% of the time, but the opponent bans it in ${Math.round(exposure.opponentBanRate)}% of their maps. A strong alternative is essential.`,
      confidence: exposureConfidence,
      dataPoints: [
        {
          label: "Your play rate",
          value: `${Math.round(exposure.userPlayRate)}%`,
        },
        {
          label: "Opponent ban rate",
          value: `${Math.round(exposure.opponentBanRate)}%`,
        },
        {
          label: "Opponent ban count",
          value: exposure.opponentBanCount,
          unit: "maps",
        },
      ],
      actionItems: [
        `Prepare a backup hero for ${exposure.hero}`,
        `Review substitution scenarios in scrims`,
      ],
    });
  }

  return insights;
}

function generatePlayerInsights(
  playerIntelligence: PlayerIntelligence
): Insight[] {
  const insights: Insight[] = [];

  if (playerIntelligence.bestPlayer) {
    const bp = playerIntelligence.bestPlayer;
    const playerConfidence = assessConfidence(bp.mapsPlayed);
    const magnitudeScore = Math.min((bp.compositeZScore / 3) * 40, 40);
    const priority = Math.round(
      magnitudeScore +
        confidenceBonus(playerConfidence.level) +
        15 +
        (bp.isTargetedByBans ? 5 : 0)
    );

    const banContext = bp.isTargetedByBans
      ? ` The opponent targets their primary hero in ${Math.round(bp.banTargetRate)}% of matches — protect their pool in the veto.`
      : "";

    insights.push({
      id: `player_highlight_${slugify(bp.playerName)}`,
      category: "player_highlight",
      priority,
      headline: `${bp.playerName} is your standout performer (+${bp.compositeZScore.toFixed(1)}σ on ${bp.primaryHero})`,
      detail: `${bp.playerName} leads the team with a +${bp.compositeZScore.toFixed(1)}σ composite score on ${bp.primaryHero} across ${bp.mapsPlayed} maps.${banContext}`,
      confidence: playerConfidence,
      dataPoints: [
        {
          label: "Composite z-score",
          value: `+${bp.compositeZScore.toFixed(1)}σ`,
        },
        { label: "Primary hero", value: bp.primaryHero },
        { label: "Maps played", value: bp.mapsPlayed, unit: "maps" },
        {
          label: "Opponent ban rate",
          value: `${Math.round(bp.banTargetRate)}%`,
        },
      ],
      actionItems: bp.isTargetedByBans
        ? [
            `Protect ${bp.playerName}'s hero pool in the veto`,
            `Prepare alternatives to ${bp.primaryHero}`,
          ]
        : [`${bp.playerName} is your highest-impact player on ${bp.primaryHero}`],
    });
  }

  const elevatedVulnerabilities = playerIntelligence.vulnerabilities
    .filter((v) => v.riskLevel === "critical" || v.riskLevel === "high")
    .slice(0, 2);

  for (const vuln of elevatedVulnerabilities) {
    const vulnConfidence = assessConfidence(vuln.opponentBanCount);
    const magnitudeScore = Math.min(vuln.vulnerabilityIndex * 50, 50);
    const urgencyBonus = vuln.riskLevel === "critical" ? 20 : 10;
    const priority = Math.round(
      magnitudeScore + confidenceBonus(vulnConfidence.level) + urgencyBonus
    );

    insights.push({
      id: `player_vulnerability_${slugify(vuln.playerName)}`,
      category: "player_vulnerability",
      priority,
      headline: `${vuln.playerName} is ${vuln.riskLevel === "critical" ? "critically" : "highly"} exposed on ${vuln.primaryHero}`,
      detail: `${vuln.playerName}'s primary hero (${vuln.primaryHero}) has a ${vuln.heroDepthDelta.toFixed(1)}σ performance drop to their secondary, and the opponent bans it in ${Math.round(vuln.opponentBanRate)}% of maps.`,
      confidence: vulnConfidence,
      dataPoints: [
        { label: "Primary hero", value: vuln.primaryHero },
        {
          label: "Primary → secondary delta",
          value: `${vuln.heroDepthDelta.toFixed(1)}σ`,
        },
        {
          label: "Opponent ban rate",
          value: `${Math.round(vuln.opponentBanRate)}%`,
        },
        {
          label: "Vulnerability index",
          value: vuln.vulnerabilityIndex.toFixed(2),
        },
      ],
      actionItems: [
        `Build out ${vuln.playerName}'s hero pool beyond ${vuln.primaryHero}`,
        `Monitor opponent ban tendencies closely leading up to the match`,
      ],
    });
  }

  return insights;
}

function computeOverallConfidence(
  insights: Insight[],
  strengthRating: TeamStrengthRating | null
): ConfidenceMetadata {
  const sampleSize =
    strengthRating?.matchesRated ??
    insights.reduce((max, i) => Math.max(max, i.confidence.sampleSize), 0);
  return assessConfidence(sampleSize);
}

function deduplicateInsights(insights: Insight[]): Insight[] {
  const seen = new Set<string>();
  return insights.filter((insight) => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });
}

export function prioritizeInsights(insights: Insight[]): {
  primary: Insight[];
  secondary: Insight[];
} {
  const sorted = [...insights]
    .filter((i) => i.confidence.level !== "insufficient")
    .sort((a, b) => b.priority - a.priority);

  return {
    primary: sorted.slice(0, MAX_PRIMARY_INSIGHTS),
    secondary: sorted.slice(MAX_PRIMARY_INSIGHTS),
  };
}

export function generateInsights(params: InsightGenerationParams): InsightReport {
  const {
    mapIntelligence,
    banIntelligence,
    playerIntelligence,
    strengthRating,
    hasUserTeamLink,
  } = params;

  const allInsights: Insight[] = [];

  if (mapIntelligence) {
    if (hasUserTeamLink && mapIntelligence.matchupMatrix.length > 0) {
      allInsights.push(...generateMapMatchupInsights(mapIntelligence));
    }
    allInsights.push(...generateTrendInsights(mapIntelligence));
  }

  if (banIntelligence) {
    allInsights.push(...generateBanStrategyInsights(banIntelligence));
  }

  if (playerIntelligence) {
    allInsights.push(...generatePlayerInsights(playerIntelligence));
  }

  const deduplicated = deduplicateInsights(allInsights);
  const { primary, secondary } = prioritizeInsights(deduplicated);
  const overallConfidence = computeOverallConfidence(deduplicated, strengthRating);

  return {
    primary,
    secondary,
    totalInsights: deduplicated.length,
    overallConfidence,
  };
}
