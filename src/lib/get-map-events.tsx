import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { groupKillsIntoFights, removeDuplicateRows } from "@/lib/utils";
import type { Kill } from "@prisma/client";

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

export type EventEntry =
  | { kind: "match_start"; time: number }
  | { kind: "match_end"; time: number }
  | { kind: "round_start"; time: number; round: number }
  | { kind: "round_end"; time: number; round: number }
  | {
      kind: "objective_captured";
      time: number;
      team: "team1" | "team2";
      isPointTake: boolean;
    }
  | {
      kind: "swap";
      time: number;
      player: string;
      team: "team1" | "team2";
      fromHero: string;
      toHero: string;
    }
  | {
      kind: "ult_used";
      time: number;
      player: string;
      team: "team1" | "team2";
      hero: string;
      fight: number | null;
    }
  | {
      kind: "ult_kill";
      time: number;
      player: string;
      team: "team1" | "team2";
      hero: string;
      killCount: number;
    }
  | {
      kind: "multikill";
      time: number;
      player: string;
      team: "team1" | "team2";
      hero: string;
      killCount: number;
      fight: number;
    }
  | {
      kind: "ajax";
      time: number;
      player: string;
      team: "team1" | "team2";
      hero: string;
      fight: number;
    };

export type MapEventsData = {
  team1Name: string;
  team2Name: string;
  events: EventEntry[];
  totals: {
    rounds: number;
    fights: number;
    multikills: number;
    ultsUsed: number;
    ultKills: number;
    swaps: number;
    objectives: number;
  };
};

function fightIndexAt(time: number, fights: Fight[]): number | null {
  for (let i = 0; i < fights.length; i++) {
    if (time >= fights[i].start && time <= fights[i].end) return i + 1;
  }
  for (let i = 0; i < fights.length; i++) {
    if (fights[i].end >= time) return i + 1;
  }
  return null;
}

function findMultikills(fights: Fight[]) {
  const out: {
    fightIndex: number;
    player: string;
    team: string;
    hero: string;
    killCount: number;
    time: number;
  }[] = [];

  fights.forEach((fight, fightIndex) => {
    const counter: Record<
      string,
      { times: number[]; team: string; hero: string }
    > = {};
    for (const kill of fight.kills) {
      if (kill.match_time < fight.start || kill.match_time > fight.end) continue;
      const slot = counter[kill.attacker_name] ?? {
        times: [],
        team: kill.attacker_team,
        hero: kill.attacker_hero,
      };
      slot.times.push(kill.match_time);
      counter[kill.attacker_name] = slot;
    }
    for (const [player, info] of Object.entries(counter)) {
      if (info.times.length > 2) {
        out.push({
          fightIndex,
          player,
          team: info.team,
          hero: info.hero,
          killCount: info.times.length,
          time: info.times[0],
        });
      }
    }
  });

  return out;
}

export async function getMapEventsData(
  id: number
): Promise<MapEventsData | null> {
  const mapDataId = await resolveMapDataId(id);
  const [
    matchStart,
    matchEnd,
    roundStarts,
    roundEndRows,
    objectiveCapturedRows,
    kills,
    ultimateStartRows,
    ultimateEndRows,
    heroSwaps,
    lucioKills,
  ] = await Promise.all([
    prisma.matchStart.findFirst({ where: { MapDataId: mapDataId } }),
    prisma.matchEnd.findFirst({ where: { MapDataId: mapDataId } }),
    prisma.roundStart.findMany({ where: { MapDataId: mapDataId } }),
    prisma.roundEnd.findMany({ where: { MapDataId: mapDataId } }),
    prisma.objectiveCaptured.findMany({ where: { MapDataId: mapDataId } }),
    prisma.kill.findMany({ where: { MapDataId: mapDataId } }),
    prisma.ultimateStart.findMany({ where: { MapDataId: mapDataId } }),
    prisma.ultimateEnd.findMany({ where: { MapDataId: mapDataId } }),
    prisma.heroSwap.findMany({
      where: { MapDataId: mapDataId, match_time: { not: 0 } },
    }),
    prisma.kill.findMany({
      where: { MapDataId: mapDataId, victim_hero: "Lúcio" },
    }),
  ]);

  if (!matchStart) return null;

  const team1Name = matchStart.team_1_name;
  const team2Name = matchStart.team_2_name;
  function teamOf(name: string): "team1" | "team2" {
    return name === team1Name ? "team1" : "team2";
  }

  const roundEnds = removeDuplicateRows(roundEndRows);
  const fights = await groupKillsIntoFights(id);

  const objectiveCaptureds = objectiveCapturedRows.filter(
    (e) => e.capturing_team !== "All Teams"
  );

  const ultimateStarts = ultimateStartRows.filter((start, i, arr) => {
    const next = arr[i + 1];
    return next ? next.match_time - start.match_time > 1 : true;
  });

  const ultimateKills = ultimateStartRows.flatMap((start) => {
    const end = ultimateEndRows.find(
      (e) =>
        e.ultimate_id === start.ultimate_id &&
        e.player_name === start.player_name
    );
    if (!end) return [];
    const within = kills.filter(
      (kill) =>
        kill.attacker_name === start.player_name &&
        kill.match_time >= start.match_time &&
        kill.match_time <= end.match_time
    );
    if (within.length === 0) return [];
    return [
      {
        time: start.match_time,
        player: start.player_name,
        team: teamOf(start.player_team),
        hero: start.player_hero,
        killCount: within.length,
      },
    ];
  });

  const multikills = findMultikills(fights);

  const ajaxes: {
    time: number;
    player: string;
    team: "team1" | "team2";
    hero: string;
    fight: number;
  }[] = [];
  for (const kill of lucioKills) {
    const ultEnd = ultimateEndRows.find(
      (e) =>
        e.player_name === kill.victim_name && e.match_time === kill.match_time
    );
    if (!ultEnd) continue;
    ajaxes.push({
      time: ultEnd.match_time,
      player: ultEnd.player_name,
      team: teamOf(ultEnd.player_team),
      hero: ultEnd.player_hero,
      fight: fightIndexAt(ultEnd.match_time, fights) ?? 0,
    });
  }

  const isPointMap =
    matchStart.map_type === "Control" || matchStart.map_type === "Flashpoint";

  const events: EventEntry[] = [
    { kind: "match_start", time: matchStart.match_time },
    ...(matchEnd ? [{ kind: "match_end" as const, time: matchEnd.match_time }] : []),
    ...roundStarts.map((r) => ({
      kind: "round_start" as const,
      time: r.match_time,
      round: r.round_number,
    })),
    ...roundEnds.map((r) => ({
      kind: "round_end" as const,
      time: r.match_time,
      round: r.round_number,
    })),
    ...objectiveCaptureds.map((c) => ({
      kind: "objective_captured" as const,
      time: c.match_time,
      team: teamOf(c.capturing_team),
      isPointTake: isPointMap,
    })),
    ...heroSwaps.map((s) => ({
      kind: "swap" as const,
      time: s.match_time,
      player: s.player_name,
      team: teamOf(s.player_team),
      fromHero: s.previous_hero,
      toHero: s.player_hero,
    })),
    ...ultimateStarts.map((u) => ({
      kind: "ult_used" as const,
      time: u.match_time,
      player: u.player_name,
      team: teamOf(u.player_team),
      hero: u.player_hero,
      fight: fightIndexAt(u.match_time, fights),
    })),
    ...ultimateKills.map((u) => ({
      kind: "ult_kill" as const,
      ...u,
    })),
    ...multikills.map((m) => ({
      kind: "multikill" as const,
      time: m.time,
      player: m.player,
      team: teamOf(m.team),
      hero: m.hero,
      killCount: m.killCount,
      fight: m.fightIndex + 1,
    })),
    ...ajaxes.map((a) => ({ kind: "ajax" as const, ...a })),
  ];

  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return kindPriority(a.kind) - kindPriority(b.kind);
  });

  return {
    team1Name,
    team2Name,
    events,
    totals: {
      rounds: roundStarts.length,
      fights: fights.length,
      multikills: multikills.length,
      ultsUsed: ultimateStarts.length,
      ultKills: ultimateKills.length,
      swaps: heroSwaps.length,
      objectives: objectiveCaptureds.length,
    },
  };
}

function kindPriority(kind: EventEntry["kind"]): number {
  switch (kind) {
    case "match_start":
      return 0;
    case "round_start":
      return 1;
    case "objective_captured":
      return 2;
    case "swap":
      return 3;
    case "ult_used":
      return 4;
    case "ult_kill":
      return 5;
    case "multikill":
      return 6;
    case "ajax":
      return 7;
    case "round_end":
      return 8;
    case "match_end":
      return 9;
  }
}
