import "server-only";

import { processUltCombos } from "@/data/team/ult-combos";
import type { ExtendedTeamData } from "@/data/team/shared-core";
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

function heroMembership(...heroes: (string | null | undefined)[]): string {
  return [...new Set(heroes.filter((hero): hero is string => Boolean(hero)))]
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

/**
 * Emit one summary row per friendly two-ult combo and one per counter-ult
 * response. This reuses the ult-combo dashboard's fight attribution, while the
 * query-builder registry supplies weighted ratio metrics for arbitrary groups.
 */
export async function computeUltCombos(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = scopedTeamData(await getTeamData(teamId), scrimIds);
  const analysis = processUltCombos(data);
  const rows: ComputedRow[] = [];

  for (const combo of analysis.combos) {
    rows.push({
      type: "combo",
      combo: `${combo.heroA} + ${combo.heroB}`,
      hero: heroMembership(combo.heroA, combo.heroB),
      hero_a: combo.heroA,
      hero_b: combo.heroB,
      enemy_hero: null,
      response_hero: null,
      uses: combo.count,
      wins: combo.wins,
      losses: combo.losses,
      win_rate: combo.count > 0 ? combo.wins / combo.count : 0,
      window_seconds: analysis.windowSeconds,
    });
  }

  for (const response of analysis.responses) {
    rows.push({
      type: "response",
      combo: `${response.ourHero} into ${response.enemyHero}`,
      hero: heroMembership(response.ourHero, response.enemyHero),
      hero_a: null,
      hero_b: null,
      enemy_hero: response.enemyHero,
      response_hero: response.ourHero,
      uses: response.count,
      wins: response.wins,
      losses: response.losses,
      win_rate: response.count > 0 ? response.wins / response.count : 0,
      window_seconds: analysis.windowSeconds,
    });
  }

  return rows;
}
