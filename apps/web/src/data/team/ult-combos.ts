import type { ExtendedTeamData } from "./shared-core";
import { findTeamNameForMapInMemory } from "./shared-core";
import type { UltComboStat, UltCombosAnalysis, UltResponseStat } from "./types";

/**
 * Seconds within which two of our ultimates count as a combo, and within which
 * one of our ults counts as a response to an enemy ult. Matches how coaches
 * talk about a "combo'd" fight; see the design brief.
 */
export const ULT_COMBO_WINDOW_SECONDS = 10;

/**
 * Gap (seconds) without a kill that ends a teamfight. Mirrors
 * `FIGHT_GAP_SECONDS` in {@link "@/lib/utils"} and the fight walk in
 * `processUltImpactAnalysis` so combos and responses are scoped to the same
 * fights the rest of the ultimates tab uses.
 */
const FIGHT_GAP_SECONDS = 15;

type FightEvent = {
  type: "kill" | "mercy_rez" | "ultimate_start";
  match_time: number;
  attacker_team: string;
  attacker_hero: string;
  /** Only present for kills and rezzes; ults have no victim. */
  victim_team?: string;
};

type UltUse = { hero: string; time: number };

function pushToBucket<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}

function withWinrate<T extends { count: number; wins: number }>(stat: T) {
  return {
    ...stat,
    winrate: stat.count > 0 ? (stat.wins / stat.count) * 100 : 0,
  };
}

function emptyAnalysis(totalMaps: number): UltCombosAnalysis {
  return {
    combos: [],
    responses: [],
    enemyHeroes: [],
    responseHeroes: [],
    totalCombos: 0,
    totalResponses: 0,
    totalMaps,
    windowSeconds: ULT_COMBO_WINDOW_SECONDS,
  };
}

/**
 * Computes two-ult combos and counter-ult responses for a team, scoped to
 * teamfights and attributed to fight outcomes.
 *
 * A **combo** is an unordered pair of distinct friendly heroes whose ult
 * activations land within {@link ULT_COMBO_WINDOW_SECONDS} of each other. A
 * **response** is one of our ults used within the window *after* an enemy ult.
 * Both are counted at most once per fight, and the fight's win/loss is the
 * combo's / response's outcome (ties count as losses, matching the rest of the
 * fight analysis).
 */
export function processUltCombos(
  sharedData: ExtendedTeamData
): UltCombosAnalysis {
  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

  if (mapDataIds.length === 0) return emptyAnalysis(0);

  const teamNameByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (teamName) teamNameByMapId.set(mapDataId, teamName);
  }

  const killsByMap = new Map<number, typeof allKills>();
  const rezzesByMap = new Map<number, typeof allRezzes>();
  const ultsByMap = new Map<number, typeof allUltimates>();
  for (const kill of allKills)
    if (kill.MapDataId) pushToBucket(killsByMap, kill.MapDataId, kill);
  for (const rez of allRezzes)
    if (rez.MapDataId) pushToBucket(rezzesByMap, rez.MapDataId, rez);
  for (const ult of allUltimates)
    if (ult.MapDataId) pushToBucket(ultsByMap, ult.MapDataId, ult);

  const comboMap = new Map<string, UltComboStat>();
  const responseMap = new Map<string, UltResponseStat>();
  const enemyTotals = new Map<string, number>();
  const responseTotals = new Map<string, number>();
  let totalCombos = 0;
  let totalResponses = 0;

  for (const mapDataId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapDataId);
    if (!ourTeamName) continue;

    const kills = killsByMap.get(mapDataId) ?? [];
    const rezzes = rezzesByMap.get(mapDataId) ?? [];
    const ults = ultsByMap.get(mapDataId) ?? [];
    if (kills.length === 0 && rezzes.length === 0 && ults.length === 0)
      continue;

    const events: FightEvent[] = [
      ...kills.map((k) => ({
        type: "kill" as const,
        match_time: k.match_time,
        attacker_team: k.attacker_team,
        attacker_hero: k.attacker_hero,
        victim_team: k.victim_team,
      })),
      ...rezzes.map((r) => ({
        type: "mercy_rez" as const,
        match_time: r.match_time,
        attacker_team: r.resurrecter_team,
        attacker_hero: r.resurrecter_hero,
        victim_team: r.resurrectee_team,
      })),
      ...ults.map((u) => ({
        type: "ultimate_start" as const,
        match_time: u.match_time,
        attacker_team: u.player_team,
        attacker_hero: u.player_hero,
      })),
    ];
    events.sort((a, b) => a.match_time - b.match_time);

    // Group into fights on a 15s kill gap.
    const fights: FightEvent[][] = [];
    let current: FightEvent[] | null = null;
    let currentEnd = 0;
    for (const event of events) {
      if (!current || event.match_time - currentEnd > FIGHT_GAP_SECONDS) {
        current = [event];
        fights.push(current);
      } else {
        current.push(event);
      }
      currentEnd = event.match_time;
    }

    for (const fight of fights) {
      let ourKills = 0;
      let enemyKills = 0;
      for (const event of fight) {
        if (event.type === "mercy_rez") {
          if (event.victim_team === ourTeamName)
            enemyKills = Math.max(0, enemyKills - 1);
          else ourKills = Math.max(0, ourKills - 1);
        } else if (event.type === "kill") {
          if (event.attacker_team === ourTeamName) ourKills++;
          else enemyKills++;
        }
      }
      const won = ourKills > enemyKills;

      const ourUlts: UltUse[] = [];
      const enemyUlts: UltUse[] = [];
      for (const event of fight) {
        if (event.type !== "ultimate_start") continue;
        const use: UltUse = {
          hero: event.attacker_hero,
          time: event.match_time,
        };
        if (event.attacker_team === ourTeamName) ourUlts.push(use);
        else enemyUlts.push(use);
      }
      ourUlts.sort((a, b) => a.time - b.time);
      enemyUlts.sort((a, b) => a.time - b.time);

      // Combos: unordered pairs of distinct friendly heroes within the window.
      const seenCombo = new Set<string>();
      for (let i = 0; i < ourUlts.length; i++) {
        for (let j = i + 1; j < ourUlts.length; j++) {
          if (
            Math.abs(ourUlts[i].time - ourUlts[j].time) >
            ULT_COMBO_WINDOW_SECONDS
          )
            continue;
          const h1 = ourUlts[i].hero;
          const h2 = ourUlts[j].hero;
          if (h1 === h2) continue; // e.g. an Echo-duplicated ult; not a combo
          const [heroA, heroB] = h1 < h2 ? [h1, h2] : [h2, h1];
          const key = `${heroA}|${heroB}`;
          if (seenCombo.has(key)) continue;
          seenCombo.add(key);

          let combo = comboMap.get(key);
          if (!combo) {
            combo = { heroA, heroB, count: 0, wins: 0, losses: 0, winrate: 0 };
            comboMap.set(key, combo);
          }
          combo.count++;
          if (won) combo.wins++;
          else combo.losses++;
          totalCombos++;
        }
      }

      // Responses: our ult used within the window AFTER an enemy ult.
      const seenResponse = new Set<string>();
      for (const enemy of enemyUlts) {
        for (const ours of ourUlts) {
          if (ours.time < enemy.time) continue;
          if (ours.time - enemy.time > ULT_COMBO_WINDOW_SECONDS) continue;
          const key = `${enemy.hero}|${ours.hero}`;
          if (seenResponse.has(key)) continue;
          seenResponse.add(key);

          let response = responseMap.get(key);
          if (!response) {
            response = {
              enemyHero: enemy.hero,
              ourHero: ours.hero,
              count: 0,
              wins: 0,
              losses: 0,
              winrate: 0,
            };
            responseMap.set(key, response);
          }
          response.count++;
          if (won) response.wins++;
          else response.losses++;
          totalResponses++;
          enemyTotals.set(enemy.hero, (enemyTotals.get(enemy.hero) ?? 0) + 1);
          responseTotals.set(
            ours.hero,
            (responseTotals.get(ours.hero) ?? 0) + 1
          );
        }
      }
    }
  }

  const combos = [...comboMap.values()]
    .map(withWinrate)
    .sort((a, b) => b.count - a.count || b.winrate - a.winrate);
  const responses = [...responseMap.values()].map(withWinrate);
  const enemyHeroes = [...enemyTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hero]) => hero);
  const responseHeroes = [...responseTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hero]) => hero);

  return {
    combos,
    responses,
    enemyHeroes,
    responseHeroes,
    totalCombos,
    totalResponses,
    totalMaps: mapDataIds.length,
    windowSeconds: ULT_COMBO_WINDOW_SECONDS,
  };
}
