import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";
import prisma from "@/lib/prisma";
import { heroAbilityMapping } from "@/types/heroes";
import type { HeroName } from "@/types/heroes";

type FightEvent = {
  event_type: string;
  match_time: number;
  attacker_team: string;
  attacker_hero: string;
  victim_team?: string;
  victim_hero?: string;
};

type Fight = { events: FightEvent[]; start: number; end: number };

type AbilityEvent = {
  match_time: number;
  player_team: string;
  player_hero: string;
  MapDataId: number | null;
};

const ABILITY_PRE_BUFFER = 5;
const ABILITY_POST_BUFFER = 2;

function groupFightEvents(events: FightEvent[]): Fight[] {
  const fights: Fight[] = [];
  let currentFight: Fight | null = null;

  for (const event of events.sort((a, b) => a.match_time - b.match_time)) {
    if (!currentFight || event.match_time - currentFight.end > 15) {
      currentFight = {
        events: [event],
        start: event.match_time,
        end: event.match_time,
      };
      fights.push(currentFight);
    } else {
      currentFight.events.push(event);
      currentFight.end = event.match_time;
    }
  }

  return fights;
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

function scenario(side: "us" | "enemy", used: boolean): string {
  if (side === "us") return used ? "used by us" : "not used by us";
  return used ? "used by enemy" : "not used by enemy";
}

/**
 * Emit one row per fight/hero/ability scenario. This is the row-level form of
 * the team ability-impact card: ability use within a small fight window is
 * correlated with whether our team won the fight, then the generic computed
 * aggregator can compare win rates for used vs not-used, us vs enemy, etc.
 */
export async function computeAbilityImpact(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
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
      orderBy: { match_time: "asc" },
    }),
    prisma.ability2Used.findMany({
      where: { MapDataId: { in: scopedMapIds } },
      select: {
        match_time: true,
        player_team: true,
        player_hero: true,
        MapDataId: true,
      },
      orderBy: { match_time: "asc" },
    }),
  ]);

  const killsByMap = byMap(data.allKills);
  const rezzesByMap = byMap(data.allRezzes);
  const ability1ByMap = byMap<AbilityEvent>(ability1Events);
  const ability2ByMap = byMap<AbilityEvent>(ability2Events);

  const rows: ComputedRow[] = [];
  for (const mapDataId of scopedMapIds) {
    const m = meta.get(mapDataId);
    if (!m?.ourTeam) continue;
    const ourTeam = m.ourTeam;
    const mapType = m.mapType;
    const scrim = m.scrim;

    const fightEvents: FightEvent[] = [
      ...(killsByMap.get(mapDataId) ?? []).map((kill) => ({
        event_type: kill.event_type,
        match_time: kill.match_time,
        attacker_team: kill.attacker_team,
        attacker_hero: kill.attacker_hero,
        victim_team: kill.victim_team,
        victim_hero: kill.victim_hero,
      })),
      ...(rezzesByMap.get(mapDataId) ?? []).map((rez) => ({
        event_type: "mercy_rez",
        match_time: rez.match_time,
        attacker_team: rez.resurrecter_team,
        attacker_hero: rez.resurrecter_hero,
        victim_team: rez.resurrectee_team,
        victim_hero: rez.resurrectee_hero,
      })),
    ];
    if (fightEvents.length === 0) continue;

    const ability1s = ability1ByMap.get(mapDataId) ?? [];
    const ability2s = ability2ByMap.get(mapDataId) ?? [];

    for (const fight of groupFightEvents(fightEvents)) {
      let ourKills = 0;
      let enemyKills = 0;
      const heroPresence = new Map<
        string,
        { ourTeam: boolean; enemyTeam: boolean }
      >();

      function markPresence(hero: string, team: string) {
        const presence = heroPresence.get(hero) ?? {
          ourTeam: false,
          enemyTeam: false,
        };
        if (team === ourTeam) presence.ourTeam = true;
        else presence.enemyTeam = true;
        heroPresence.set(hero, presence);
      }

      for (const event of fight.events) {
        if (event.event_type === "mercy_rez") {
          if (event.victim_team === ourTeam)
            enemyKills = Math.max(0, enemyKills - 1);
          else ourKills = Math.max(0, ourKills - 1);
        } else if (event.event_type === "kill") {
          if (event.attacker_team === ourTeam) ourKills++;
          else enemyKills++;
        }

        markPresence(event.attacker_hero, event.attacker_team);
        if (event.victim_hero && event.victim_team) {
          markPresence(event.victim_hero, event.victim_team);
        }
      }

      const windowStart = fight.start - ABILITY_PRE_BUFFER;
      const windowEnd = fight.end + ABILITY_POST_BUFFER;
      const fightAbility1s = ability1s.filter(
        (ability) =>
          ability.match_time >= windowStart && ability.match_time <= windowEnd
      );
      const fightAbility2s = ability2s.filter(
        (ability) =>
          ability.match_time >= windowStart && ability.match_time <= windowEnd
      );

      const used = {
        our1: new Set<string>(),
        our2: new Set<string>(),
        enemy1: new Set<string>(),
        enemy2: new Set<string>(),
      };

      function markAbilityUse(ability: AbilityEvent, slot: 1 | 2) {
        markPresence(ability.player_hero, ability.player_team);
        if (ability.player_team === ourTeam) {
          (slot === 1 ? used.our1 : used.our2).add(ability.player_hero);
        } else {
          (slot === 1 ? used.enemy1 : used.enemy2).add(ability.player_hero);
        }
      }

      for (const ability of fightAbility1s) markAbilityUse(ability, 1);
      for (const ability of fightAbility2s) markAbilityUse(ability, 2);

      const won = ourKills > enemyKills;
      for (const [hero, presence] of heroPresence) {
        const abilities = heroAbilityMapping[hero as HeroName];
        if (!abilities) continue;

        for (const slot of [1, 2] as const) {
          const abilityName =
            slot === 1 ? abilities.ability1Name : abilities.ability2Name;

          if (presence.ourTeam) {
            const didUse = (slot === 1 ? used.our1 : used.our2).has(hero);
            rows.push({
              won: won ? 1 : 0,
              result: won ? "win" : "loss",
              hero,
              ability: abilityName,
              ability_slot: slot,
              side: "us",
              used: didUse ? "yes" : "no",
              scenario: scenario("us", didUse),
              map_type: mapType,
              scrim,
            });
          }

          if (presence.enemyTeam) {
            const didUse = (slot === 1 ? used.enemy1 : used.enemy2).has(hero);
            rows.push({
              won: won ? 1 : 0,
              result: won ? "win" : "loss",
              hero,
              ability: abilityName,
              ability_slot: slot,
              side: "enemy",
              used: didUse ? "yes" : "no",
              scenario: scenario("enemy", didUse),
              map_type: mapType,
              scrim,
            });
          }
        }
      }
    }
  }

  return rows;
}
