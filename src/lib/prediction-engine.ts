import type { SimulatorContext } from "@/data/team-prediction-dto";
import type { RoleTrio } from "@/data/team-role-stats-dto";
import { mapNameToMapTypeMapping } from "@/types/map";

export type PredictionScenario = {
  enemyBansAgainstUs: string[];
  ourBans: string[];
  selectedMap: string | null;
  ourComposition: string[];
};

export type PredictionBreakdown = {
  baseWinrate: number;
  banImpact: number;
  ourBanImpact: number;
  mapImpact: number;
  compositionImpact: number;
};

export type PredictionResult = {
  estimatedWinrate: number;
  confidence: "low" | "medium" | "high";
  breakdown: PredictionBreakdown;
  warnings: string[];
  topInsight: string | null;
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
): string | null {
  const candidates: { label: string; value: number }[] = [];

  for (const hero of scenario.enemyBansAgainstUs) {
    const delta = ctx.heroBanDeltas[hero];
    if (delta !== undefined) {
      candidates.push({
        label: `${hero} being banned against you hurts by ${Math.abs(delta * 100).toFixed(1)}%`,
        value: Math.abs(delta),
      });
    }
  }

  for (const hero of scenario.ourBans) {
    const delta = ctx.ourBanDeltas[hero];
    if (delta !== undefined && delta > 0) {
      candidates.push({
        label: `Banning ${hero} adds +${(delta * 100).toFixed(1)}% — your strongest ban`,
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
        label: `${scenario.selectedMap} is a ${direction} map for your team (${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%)`,
        value: Math.abs(delta),
      });
    }
  }

  if (breakdown.compositionImpact !== 0) {
    const delta = breakdown.compositionImpact;
    candidates.push({
      label: `Your composition ${delta >= 0 ? "boosts" : "reduces"} your odds by ${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`,
      value: Math.abs(delta),
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.value - a.value);
  return candidates[0].label;
}

export function computePrediction(
  ctx: SimulatorContext,
  scenario: PredictionScenario
): PredictionResult {
  const warnings: string[] = [];
  const activeSampleSizes: number[] = [];

  let banImpact = 0;
  for (const hero of scenario.enemyBansAgainstUs) {
    const delta = ctx.heroBanDeltas[hero];
    if (delta !== undefined) {
      banImpact += delta;
      const samples = ctx.heroBanSampleSizes[hero] ?? 0;
      activeSampleSizes.push(samples);
      if (samples < MIN_SAMPLES_MEDIUM) {
        warnings.push(
          `${hero} has only been banned ${samples} time${samples === 1 ? "" : "s"} — impact estimate may be unreliable`
        );
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
        warnings.push(
          `You've only banned ${hero} ${samples} time${samples === 1 ? "" : "s"} — impact estimate may be unreliable`
        );
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
        warnings.push(
          `Only ${samples} game${samples === 1 ? "" : "s"} on ${scenario.selectedMap} — map impact estimate may be unreliable`
        );
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
          warnings.push(
            `No data for ${scenario.selectedMap} — using ${mapType} mode average instead`
          );
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
        warnings.push(
          `This roster combination has only ${matchingTrio.gamesPlayed} recorded game${matchingTrio.gamesPlayed === 1 ? "" : "s"}`
        );
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

  const raw =
    ctx.baseWinrate + banImpact + ourBanImpact + mapImpact + compositionImpact;
  const estimatedWinrate = clamp(raw, 0, 1);

  const confidence = getConfidence(activeSampleSizes, ctx.totalGames);

  const breakdown: PredictionBreakdown = {
    baseWinrate: ctx.baseWinrate,
    banImpact,
    ourBanImpact,
    mapImpact,
    compositionImpact,
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
