import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";
import prisma from "@/lib/prisma";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  type Fight,
} from "@/lib/utils";
import { allHeroes, type AbilityImpact } from "@/types/heroes";
import type { Kill } from "@/generated/prisma/client";

type AbilityEvent = {
  match_time: number;
  player_team: string;
  player_hero: string;
  MapDataId: number | null;
};

type AbilityDef = {
  name: string;
  impact: AbilityImpact;
};

type FightPhase = "pre-fight" | "early" | "mid" | "late" | "cleanup";

type AbilityKey = `${string}|${1 | 2}`;

const PRE_FIGHT_BUFFER = 5;
const CLEANUP_BUFFER = 2;

const heroAbilityLookup = new Map<
  string,
  { ability1: AbilityDef; ability2: AbilityDef }
>();
for (const hero of allHeroes) {
  heroAbilityLookup.set(hero.name, {
    ability1: { name: hero.ability1.name, impact: hero.ability1.impact },
    ability2: { name: hero.ability2.name, impact: hero.ability2.impact },
  });
}

function byMap<T extends { MapDataId: number | null }>(
  rows: T[]
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    if (row.MapDataId == null) continue;
    const bucket = map.get(row.MapDataId);
    if (bucket) bucket.push(row);
    else map.set(row.MapDataId, [row]);
  }
  return map;
}

function isHighImpact(impact: AbilityImpact): boolean {
  return impact === "high" || impact === "critical";
}

function classifyPhase(abilityTime: number, fight: Fight): FightPhase | null {
  const duration = fight.end - fight.start;

  if (
    abilityTime < fight.start - PRE_FIGHT_BUFFER ||
    abilityTime > fight.end + CLEANUP_BUFFER
  ) {
    return null;
  }

  if (abilityTime < fight.start) return "pre-fight";
  if (abilityTime > fight.end) return "cleanup";
  if (duration < 4) return "mid";

  const progress = (abilityTime - fight.start) / duration;
  if (progress <= 0.25) return "early";
  if (progress <= 0.75) return "mid";
  return "late";
}

function assignToFight(
  abilityEvent: AbilityEvent,
  fights: Fight[]
): { fightIndex: number; phase: FightPhase } | null {
  let best: { fightIndex: number; phase: FightPhase; distance: number } | null =
    null;

  for (let i = 0; i < fights.length; i++) {
    const fight = fights[i];
    const phase = classifyPhase(abilityEvent.match_time, fight);
    if (!phase) continue;

    const center = (fight.start + fight.end) / 2;
    const distance = Math.abs(abilityEvent.match_time - center);
    if (!best || distance < best.distance) {
      best = { fightIndex: i, phase, distance };
    }
  }

  return best ? { fightIndex: best.fightIndex, phase: best.phase } : null;
}

function fightWon(fight: Fight, ourTeam: string): boolean {
  let ourKills = 0;
  let enemyKills = 0;

  for (const event of fight.kills) {
    if (event.event_type === ("mercy_rez" as string)) {
      if (event.victim_team === ourTeam)
        enemyKills = Math.max(0, enemyKills - 1);
      else ourKills = Math.max(0, ourKills - 1);
    } else if (event.event_type === "kill") {
      if (event.attacker_team === ourTeam) ourKills++;
      else enemyKills++;
    }
  }

  return ourKills > enemyKills;
}

function abilityKey(hero: string, slot: 1 | 2): AbilityKey {
  return `${hero}|${slot}`;
}

function abilityFromKey(key: AbilityKey): {
  hero: string;
  slot: 1 | 2;
  ability: AbilityDef;
} | null {
  const [hero, slotRaw] = key.split("|");
  const slot = slotRaw === "1" ? 1 : slotRaw === "2" ? 2 : null;
  if (!slot) return null;
  const abilities = heroAbilityLookup.get(hero);
  if (!abilities) return null;
  return {
    hero,
    slot,
    ability: slot === 1 ? abilities.ability1 : abilities.ability2,
  };
}

/**
 * Emit one row per fight/ability/phase where our team used a high-impact or
 * critical cooldown. This exposes the phase timing analysis from scrim/map
 * dashboards to the general query builder, while keeping the final grouping
 * flexible: by phase, ability, hero, map, map type, or scrim.
 */
export async function computeAbilityTiming(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const meta = buildMapMeta(data);
  const inScope = new Set(scrimIds);
  const scopedMapIds = data.mapDataIds.filter((mapDataId) => {
    const m = meta.get(mapDataId);
    return m ? inScope.has(m.scrimId) : false;
  });
  if (scopedMapIds.length === 0) return [];

  const [ability1Events, ability2Events] = await Promise.all([
    prisma.ability1Used.findMany({
      where: { MapDataId: { in: scopedMapIds } },
      select: {
        match_time: true,
        player_team: true,
        player_hero: true,
        MapDataId: true,
      },
      orderBy: [{ MapDataId: "asc" }, { match_time: "asc" }],
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: { in: scopedMapIds } },
      select: {
        match_time: true,
        player_team: true,
        player_hero: true,
        MapDataId: true,
      },
      orderBy: [{ MapDataId: "asc" }, { match_time: "asc" }],
    }),
  ]);

  const killsByMap = byMap<Kill>(data.allKills);
  const rezzesByMap = byMap(data.allRezzes);
  const ability1ByMap = byMap<AbilityEvent>(ability1Events);
  const ability2ByMap = byMap<AbilityEvent>(ability2Events);

  const rows: (ComputedRow & { ability_key: AbilityKey })[] = [];
  const totals = new Map<
    AbilityKey,
    { fights: Set<string>; wins: Set<string> }
  >();

  function rememberTotal(key: AbilityKey, fightId: string, won: boolean) {
    const total = totals.get(key) ?? { fights: new Set(), wins: new Set() };
    total.fights.add(fightId);
    if (won) total.wins.add(fightId);
    totals.set(key, total);
  }

  for (const mapDataId of scopedMapIds) {
    const m = meta.get(mapDataId);
    if (!m?.ourTeam) continue;
    const ourTeam = m.ourTeam;

    const fightEvents = [
      ...(killsByMap.get(mapDataId) ?? []),
      ...(rezzesByMap.get(mapDataId) ?? []).map(mercyRezToKillEvent),
    ].sort((a, b) => a.match_time - b.match_time);
    if (fightEvents.length === 0) continue;

    const fights = groupEventsIntoFights(fightEvents);
    const usedByFight = new Map<number, Map<AbilityKey, Set<FightPhase>>>();

    function processAbilityEvents(events: AbilityEvent[], slot: 1 | 2) {
      for (const event of events) {
        if (event.player_team !== ourTeam) continue;
        const abilities = heroAbilityLookup.get(event.player_hero);
        if (!abilities) continue;
        const ability = slot === 1 ? abilities.ability1 : abilities.ability2;
        if (!isHighImpact(ability.impact)) continue;

        const match = assignToFight(event, fights);
        if (!match) continue;

        const key = abilityKey(event.player_hero, slot);
        const fightUses = usedByFight.get(match.fightIndex) ?? new Map();
        const phases = fightUses.get(key) ?? new Set<FightPhase>();
        phases.add(match.phase);
        fightUses.set(key, phases);
        usedByFight.set(match.fightIndex, fightUses);
      }
    }

    processAbilityEvents(ability1ByMap.get(mapDataId) ?? [], 1);
    processAbilityEvents(ability2ByMap.get(mapDataId) ?? [], 2);

    for (const [fightIndex, fightUses] of usedByFight) {
      const fight = fights[fightIndex];
      const won = fightWon(fight, ourTeam);
      const fightId = `${mapDataId}:${fightIndex}`;

      for (const [key, phases] of fightUses) {
        const abilityInfo = abilityFromKey(key);
        if (!abilityInfo) continue;
        rememberTotal(key, fightId, won);

        for (const phase of phases) {
          rows.push({
            ability_key: key,
            loss: won ? 0 : 1,
            won: won ? 1 : 0,
            result: won ? "win" : "loss",
            hero: abilityInfo.hero,
            ability: abilityInfo.ability.name,
            ability_slot: abilityInfo.slot,
            impact_rating: abilityInfo.ability.impact,
            phase,
            map: m.map,
            map_type: m.mapType,
            scrim: m.scrim,
          });
        }
      }
    }
  }

  return rows.map((row) => {
    const total = totals.get(row.ability_key);
    const overallWinRate =
      total && total.fights.size > 0
        ? (total.wins.size / total.fights.size) * 100
        : 0;
    const wonPct = Number(row.won) * 100;
    const { ability_key: _abilityKey, ...rest } = row;
    return {
      ...rest,
      overall_win_rate: overallWinRate,
      win_rate_delta: wonPct - overallWinRate,
    };
  });
}
