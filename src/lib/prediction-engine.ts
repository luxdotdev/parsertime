import type { SimulatorContext } from "@/data/team/types";
import type { RoleTrio } from "@/data/team/types";
import { mapNameToMapTypeMapping } from "@/types/map";

export type PredictionScenario = {
  enemyBansAgainstUs: string[];
  ourBans: string[];
  selectedMap: string | null;
  ourComposition: string[];
  enemyComposition: string[];
};

export type PredictionBreakdown = {
  baseWinrate: number;
  banImpact: number;
  ourBanImpact: number;
  mapImpact: number;
  compositionImpact: number;
  enemyCompositionImpact: number;
};

export type PredictionResult = {
  estimatedWinrate: number;
  confidence: "low" | "medium" | "high";
  breakdown: PredictionBreakdown;
  warnings: PredictionMessage[];
  topInsight: PredictionMessage | null;
};

export type PredictionMessage =
  | {
      key: "warnings.enemyBanLowSample";
      values: { hero: string; samples: number };
    }
  | {
      key: "warnings.ourBanLowSample";
      values: { hero: string; samples: number };
    }
  | {
      key: "warnings.mapLowSample";
      values: { map: string; samples: number };
    }
  | {
      key: "warnings.mapModeFallback";
      values: { map: string; mapType: string };
    }
  | {
      key: "warnings.rosterLowSample";
      values: { games: number };
    }
  | {
      key: "warnings.enemyHeroLowSample";
      values: { hero: string; samples: number };
    }
  | {
      key: "insights.enemyBanHurts";
      values: { hero: string; delta: string };
    }
  | {
      key: "insights.ourBanHelps";
      values: { hero: string; delta: string };
    }
  | {
      key: "insights.mapStrength";
      values: { map: string; direction: "strong" | "weak"; delta: string };
    }
  | {
      key: "insights.compositionImpact";
      values: { direction: "boosts" | "reduces"; delta: string };
    }
  | {
      key: "insights.enemyCompositionImpact";
      values: { direction: "favors" | "challenges"; delta: string };
    };

const MIN_SAMPLES_HIGH = 5;
const MIN_SAMPLES_MEDIUM = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function matchesTrio(composition: string[], trio: RoleTrio): boolean {
  const trioPlayers = new Set([
    trio.tank,
    trio.dps1,
    trio.dps2,
    trio.support1,
    trio.support2,
  ]);
  const compSet = new Set(composition);
  if (compSet.size !== 5) return false;
  for (const player of trioPlayers) {
    if (!compSet.has(player)) return false;
  }
  return true;
}

function getConfidence(
  sampleSizes: number[],
  totalGames: number
): "low" | "medium" | "high" {
  if (totalGames < MIN_SAMPLES_MEDIUM) return "low";
  const minSample = sampleSizes.length > 0 ? Math.min(...sampleSizes) : 0;
  if (sampleSizes.length === 0) return "high";
  if (minSample >= MIN_SAMPLES_HIGH) return "high";
  if (minSample >= MIN_SAMPLES_MEDIUM) return "medium";
  return "low";
}

function buildTopInsight(
  breakdown: PredictionBreakdown,
  scenario: PredictionScenario,
  ctx: SimulatorContext
): PredictionMessage | null {
  const candidates: { message: PredictionMessage; value: number }[] = [];

  for (const hero of scenario.enemyBansAgainstUs) {
    const delta = ctx.heroBanDeltas[hero];
    if (delta !== undefined && delta > 0) {
      candidates.push({
        message: {
          key: "insights.enemyBanHurts",
          values: { hero, delta: (delta * 100).toFixed(1) },
        },
        value: delta,
      });
    }
  }

  for (const hero of scenario.ourBans) {
    const delta = ctx.ourBanDeltas[hero];
    if (delta !== undefined && delta > 0) {
      candidates.push({
        message: {
          key: "insights.ourBanHelps",
          values: { hero, delta: (delta * 100).toFixed(1) },
        },
        value: Math.abs(delta),
      });
    }
  }

  if (
    scenario.selectedMap &&
    ctx.mapWinrates[scenario.selectedMap] !== undefined
  ) {
    const delta = breakdown.mapImpact;
    if (Math.abs(delta) >= 0.05) {
      const direction = delta >= 0 ? "strong" : "weak";
      candidates.push({
        message: {
          key: "insights.mapStrength",
          values: {
            map: scenario.selectedMap,
            direction,
            delta: `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}`,
          },
        },
        value: Math.abs(delta),
      });
    }
  }

  if (breakdown.compositionImpact !== 0) {
    const delta = breakdown.compositionImpact;
    candidates.push({
      message: {
        key: "insights.compositionImpact",
        values: {
          direction: delta >= 0 ? "boosts" : "reduces",
          delta: `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}`,
        },
      },
      value: Math.abs(delta),
    });
  }

  if (breakdown.enemyCompositionImpact !== 0) {
    const delta = breakdown.enemyCompositionImpact;
    candidates.push({
      message: {
        key: "insights.enemyCompositionImpact",
        values: {
          direction: delta >= 0 ? "favors" : "challenges",
          delta: `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}`,
        },
      },
      value: Math.abs(delta),
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.value - a.value);
  return candidates[0].message;
}

export function computePrediction(
  ctx: SimulatorContext,
  scenario: PredictionScenario
): PredictionResult {
  const warnings: PredictionMessage[] = [];
  const activeSampleSizes: number[] = [];

  let banImpact = 0;
  for (const hero of scenario.enemyBansAgainstUs) {
    const delta = ctx.heroBanDeltas[hero];
    if (delta !== undefined) {
      banImpact -= delta;
      const samples = ctx.heroBanSampleSizes[hero] ?? 0;
      activeSampleSizes.push(samples);
      if (samples < MIN_SAMPLES_MEDIUM) {
        warnings.push({
          key: "warnings.enemyBanLowSample",
          values: { hero, samples },
        });
      }
    }
  }

  let ourBanImpact = 0;
  for (const hero of scenario.ourBans) {
    const delta = ctx.ourBanDeltas[hero];
    if (delta !== undefined) {
      ourBanImpact += delta;
      const samples = ctx.ourBanSampleSizes[hero] ?? 0;
      activeSampleSizes.push(samples);
      if (samples < MIN_SAMPLES_MEDIUM) {
        warnings.push({
          key: "warnings.ourBanLowSample",
          values: { hero, samples },
        });
      }
    }
  }

  let mapImpact = 0;
  if (scenario.selectedMap) {
    const mapWinrate = ctx.mapWinrates[scenario.selectedMap];
    if (mapWinrate !== undefined) {
      mapImpact = mapWinrate - ctx.baseWinrate;
      const samples = ctx.mapSampleSizes[scenario.selectedMap] ?? 0;
      activeSampleSizes.push(samples);
      if (samples < MIN_SAMPLES_MEDIUM) {
        warnings.push({
          key: "warnings.mapLowSample",
          values: { map: scenario.selectedMap, samples },
        });
      }
    } else {
      const mapType =
        mapNameToMapTypeMapping[
          scenario.selectedMap as keyof typeof mapNameToMapTypeMapping
        ];
      if (mapType) {
        const modeWinrate = ctx.mapModeWinrates[mapType];
        if (modeWinrate !== undefined) {
          mapImpact = modeWinrate - ctx.baseWinrate;
          warnings.push({
            key: "warnings.mapModeFallback",
            values: { map: scenario.selectedMap, mapType },
          });
        }
      }
    }
  }

  let compositionImpact = 0;
  if (scenario.ourComposition.length === 5) {
    const matchingTrio = ctx.roleTrioWinrates.find((trio) =>
      matchesTrio(scenario.ourComposition, trio)
    );

    if (matchingTrio) {
      compositionImpact = matchingTrio.winrate / 100 - ctx.baseWinrate;
      activeSampleSizes.push(matchingTrio.gamesPlayed);
      if (matchingTrio.gamesPlayed < MIN_SAMPLES_MEDIUM) {
        warnings.push({
          key: "warnings.rosterLowSample",
          values: { games: matchingTrio.gamesPlayed },
        });
      }
    } else {
      let heroImpactSum = 0;
      let heroCount = 0;
      for (const hero of scenario.ourComposition) {
        const heroWinrate = ctx.heroPoolWinrates[hero];
        if (heroWinrate !== undefined) {
          heroImpactSum += heroWinrate - ctx.baseWinrate;
          heroCount++;
          activeSampleSizes.push(ctx.heroPoolSampleSizes[hero] ?? 0);
        }
      }
      if (heroCount > 0) {
        compositionImpact = heroImpactSum / heroCount;
      }
    }
  } else if (scenario.ourComposition.length > 0) {
    let heroImpactSum = 0;
    let heroCount = 0;
    for (const hero of scenario.ourComposition) {
      const heroWinrate = ctx.heroPoolWinrates[hero];
      if (heroWinrate !== undefined) {
        heroImpactSum += heroWinrate - ctx.baseWinrate;
        heroCount++;
        activeSampleSizes.push(ctx.heroPoolSampleSizes[hero] ?? 0);
      }
    }
    if (heroCount > 0) {
      compositionImpact = heroImpactSum / heroCount;
    }
  }

  let enemyCompositionImpact = 0;
  if (scenario.enemyComposition.length > 0) {
    let heroImpactSum = 0;
    let heroCount = 0;
    for (const hero of scenario.enemyComposition) {
      const winrateVsHero = ctx.enemyHeroWinrates[hero];
      if (winrateVsHero !== undefined) {
        heroImpactSum += winrateVsHero - ctx.baseWinrate;
        heroCount++;
        activeSampleSizes.push(ctx.enemyHeroSampleSizes[hero] ?? 0);
        const samples = ctx.enemyHeroSampleSizes[hero] ?? 0;
        if (samples < MIN_SAMPLES_MEDIUM) {
          warnings.push({
            key: "warnings.enemyHeroLowSample",
            values: { hero, samples },
          });
        }
      }
    }
    if (heroCount > 0) {
      enemyCompositionImpact = heroImpactSum / heroCount;
    }
  }

  const raw =
    ctx.baseWinrate +
    banImpact +
    ourBanImpact +
    mapImpact +
    compositionImpact +
    enemyCompositionImpact;
  const estimatedWinrate = clamp(raw, 0, 1);

  const confidence = getConfidence(activeSampleSizes, ctx.totalGames);

  const breakdown: PredictionBreakdown = {
    baseWinrate: ctx.baseWinrate,
    banImpact,
    ourBanImpact,
    mapImpact,
    compositionImpact,
    enemyCompositionImpact,
  };

  const topInsight = buildTopInsight(breakdown, scenario, ctx);

  return {
    estimatedWinrate,
    confidence,
    breakdown,
    warnings,
    topInsight,
  };
}
