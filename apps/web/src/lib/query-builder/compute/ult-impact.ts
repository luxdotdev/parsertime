import "server-only";

import { processUltImpactAnalysis } from "@/data/team/ult-service";
import type { ExtendedTeamData } from "@/data/team/shared-core";
import type { ScenarioStats } from "@/data/team/types";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";

function scopedTeamData(
  data: ExtendedTeamData,
  scrimIds: number[]
): ExtendedTeamData {
  const inScope = new Set(scrimIds);
  const mapDataRecords = data.mapDataRecords.filter(
    (record) => record.Scrim && inScope.has(record.Scrim.id)
  );
  const scopedMapIds = new Set(mapDataRecords.map((record) => record.id));

  function hasScopedMap(row: { MapDataId: number | null }): boolean {
    return row.MapDataId != null && scopedMapIds.has(row.MapDataId);
  }

  return {
    ...data,
    mapDataRecords,
    mapDataIds: data.mapDataIds.filter((id) => scopedMapIds.has(id)),
    allPlayerStats: data.allPlayerStats.filter(hasScopedMap),
    matchStarts: data.matchStarts.filter(hasScopedMap),
    finalRounds: data.finalRounds.filter(hasScopedMap),
    captures: data.captures.filter(hasScopedMap),
    payloadProgresses: data.payloadProgresses.filter(hasScopedMap),
    pointProgresses: data.pointProgresses.filter(hasScopedMap),
    allKills: data.allKills.filter(hasScopedMap),
    allRezzes: data.allRezzes.filter(hasScopedMap),
    allUltimates: data.allUltimates.filter(hasScopedMap),
  };
}

type ScenarioShape = {
  key:
    | "uncontestedOurs"
    | "uncontestedTheirs"
    | "mirrorOursFirst"
    | "mirrorTheirsFirst";
  label: string;
  side: "us" | "enemy" | "both";
  mirrored: "yes" | "no";
  firstSide: "us" | "enemy";
};

const SCENARIOS: ScenarioShape[] = [
  {
    key: "uncontestedOurs",
    label: "we used uncontested",
    side: "us",
    mirrored: "no",
    firstSide: "us",
  },
  {
    key: "uncontestedTheirs",
    label: "enemy used uncontested",
    side: "enemy",
    mirrored: "no",
    firstSide: "enemy",
  },
  {
    key: "mirrorOursFirst",
    label: "mirror, we first",
    side: "both",
    mirrored: "yes",
    firstSide: "us",
  },
  {
    key: "mirrorTheirsFirst",
    label: "mirror, enemy first",
    side: "both",
    mirrored: "yes",
    firstSide: "enemy",
  },
];

function rowFor(
  hero: string,
  scenario: ScenarioShape,
  stats: ScenarioStats
): ComputedRow {
  return {
    hero,
    scenario: scenario.label,
    side: scenario.side,
    mirrored: scenario.mirrored,
    first_side: scenario.firstSide,
    fights: stats.fights,
    wins: stats.wins,
    losses: stats.losses,
    win_rate: stats.fights > 0 ? stats.wins / stats.fights : 0,
  };
}

/**
 * Emit one summary row per hero/ult-use scenario from the same fight-scoped
 * ultimate impact model used by the team dashboard.
 */
export async function computeUltImpact(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = scopedTeamData(await getTeamData(teamId), scrimIds);
  const analysis = processUltImpactAnalysis(data);
  const rows: ComputedRow[] = [];

  for (const hero of analysis.availableHeroes) {
    const heroImpact = analysis.byHero[hero];
    if (!heroImpact) continue;
    for (const scenario of SCENARIOS) {
      const stats = heroImpact.scenarios[scenario.key];
      if (stats.fights === 0) continue;
      rows.push(rowFor(hero, scenario, stats));
    }
  }

  return rows;
}
