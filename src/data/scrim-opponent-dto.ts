import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { mapNameToMapTypeMapping } from "@/types/map";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type {
  MapType,
  ObjectiveCaptured,
  PayloadProgress,
  PointProgress,
  RoundEnd,
  MatchStart,
} from "@prisma/client";
import { cache } from "react";
import { findTeamNameForMapInMemory, getTeamRoster } from "./team-shared-data";

type HeroRole = "Tank" | "Damage" | "Support";

export type ScrimMapResult = {
  mapName: string;
  mapType: MapType;
  scrimDate: Date;
  opponentWon: boolean;
  source: "scrim";
};

export type ScrimHeroBan = {
  mapName: string;
  mapType: MapType;
  scrimDate: Date;
  opponentWon: boolean;
  opponentBans: string[];
  source: "scrim";
};

export type ScrimPlayerStat = {
  playerName: string;
  hero: string;
  role: HeroRole;
  timePlayed: number;
  eliminations: number;
  deaths: number;
  source: "scrim";
};

type MapDataRow = {
  id: number;
  mapName: string;
  mapType: MapType | null;
  scrimDate: Date;
};

type ScrimPlayerStatRow = {
  player_name: string;
  player_team: string;
  MapDataId: number | null;
};

/**
 * Fetches all tagged scrims and collects the raw data needed to resolve
 * opponent-side analytics. Returns structured collections ready for
 * per-MapData resolution.
 */
async function fetchTaggedScrimDataFn(
  userTeamId: number,
  opponentAbbr: string
): Promise<{
  mapDataRows: MapDataRow[];
  allPlayerStats: ScrimPlayerStatRow[];
  teamRosterSet: Set<string>;
  matchStartsByMapDataId: Map<number, MatchStart>;
  finalRoundsByMapDataId: Map<number, RoundEnd>;
  capturesByTeam: Map<
    number,
    { team1: ObjectiveCaptured[]; team2: ObjectiveCaptured[] }
  >;
  payloadProgressByTeam: Map<
    number,
    { team1: PayloadProgress[]; team2: PayloadProgress[] }
  >;
  pointProgressByTeam: Map<
    number,
    { team1: PointProgress[]; team2: PointProgress[] }
  >;
  heroBansByMapDataId: Map<number, { team: string; hero: string }[]>;
  fullPlayerStatsByMapDataId: Map<
    number,
    {
      player_name: string;
      player_team: string;
      player_hero: string;
      hero_time_played: number;
      eliminations: number;
      deaths: number;
    }[]
  >;
}> {
  const teamRoster = await getTeamRoster(userTeamId);
  const teamRosterSet = new Set(teamRoster);

  const scrims = await prisma.scrim.findMany({
    where: { teamId: userTeamId, opponentTeamAbbr: opponentAbbr },
    select: {
      date: true,
      maps: {
        select: {
          id: true,
          name: true,
          mapData: { select: { id: true } },
        },
      },
    },
  });

  if (scrims.length === 0) {
    return {
      mapDataRows: [],
      allPlayerStats: [],
      teamRosterSet,
      matchStartsByMapDataId: new Map(),
      finalRoundsByMapDataId: new Map(),
      capturesByTeam: new Map(),
      payloadProgressByTeam: new Map(),
      pointProgressByTeam: new Map(),
      heroBansByMapDataId: new Map(),
      fullPlayerStatsByMapDataId: new Map(),
    };
  }

  const mapDataRows: MapDataRow[] = [];
  const allMapDataIds: number[] = [];

  for (const scrim of scrims) {
    for (const map of scrim.maps) {
      for (const mapData of map.mapData) {
        allMapDataIds.push(mapData.id);
        mapDataRows.push({
          id: mapData.id,
          mapName: map.name,
          mapType:
            mapNameToMapTypeMapping[
              map.name as keyof typeof mapNameToMapTypeMapping
            ] ?? null,
          scrimDate: scrim.date,
        });
      }
    }
  }

  if (allMapDataIds.length === 0) {
    return {
      mapDataRows: [],
      allPlayerStats: [],
      teamRosterSet,
      matchStartsByMapDataId: new Map(),
      finalRoundsByMapDataId: new Map(),
      capturesByTeam: new Map(),
      payloadProgressByTeam: new Map(),
      pointProgressByTeam: new Map(),
      heroBansByMapDataId: new Map(),
      fullPlayerStatsByMapDataId: new Map(),
    };
  }

  const [
    allPlayerStatsFull,
    matchStarts,
    roundEnds,
    captures,
    payloadProgressRows,
    pointProgressRows,
    heroBans,
  ] =
    await Promise.all([
      prisma.playerStat.findMany({
        where: { MapDataId: { in: allMapDataIds } },
        select: {
          player_name: true,
          player_team: true,
          player_hero: true,
          hero_time_played: true,
          eliminations: true,
          deaths: true,
          MapDataId: true,
        },
      }),
      prisma.matchStart.findMany({
        where: { MapDataId: { in: allMapDataIds } },
      }),
      prisma.roundEnd.findMany({
        where: { MapDataId: { in: allMapDataIds } },
        orderBy: { round_number: "desc" },
      }),
      prisma.objectiveCaptured.findMany({
        where: { MapDataId: { in: allMapDataIds } },
        orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
      }),
      prisma.payloadProgress.findMany({
        where: { MapDataId: { in: allMapDataIds } },
        orderBy: [
          { round_number: "asc" },
          { objective_index: "asc" },
          { match_time: "asc" },
        ],
      }),
      prisma.pointProgress.findMany({
        where: { MapDataId: { in: allMapDataIds } },
        orderBy: [
          { round_number: "asc" },
          { objective_index: "asc" },
          { match_time: "asc" },
        ],
      }),
      prisma.heroBan.findMany({
        where: { MapDataId: { in: allMapDataIds } },
        select: { MapDataId: true, team: true, hero: true },
      }),
    ]);

  const allPlayerStats: ScrimPlayerStatRow[] = allPlayerStatsFull.map((s) => ({
    player_name: s.player_name,
    player_team: s.player_team,
    MapDataId: s.MapDataId,
  }));

  const matchStartsByMapDataId = new Map<number, MatchStart>();
  for (const ms of matchStarts) {
    if (ms.MapDataId) matchStartsByMapDataId.set(ms.MapDataId, ms);
  }

  const finalRoundsByMapDataId = new Map<number, RoundEnd>();
  for (const round of roundEnds) {
    if (!round.MapDataId) continue;
    const existing = finalRoundsByMapDataId.get(round.MapDataId);
    if (!existing || round.round_number > existing.round_number) {
      finalRoundsByMapDataId.set(round.MapDataId, round);
    }
  }

  const capturesByTeam = new Map<
    number,
    { team1: ObjectiveCaptured[]; team2: ObjectiveCaptured[] }
  >();
  for (const capture of captures) {
    if (!capture.MapDataId) continue;
    const ms = matchStartsByMapDataId.get(capture.MapDataId);
    if (!ms) continue;
    let entry = capturesByTeam.get(capture.MapDataId);
    if (!entry) {
      entry = { team1: [], team2: [] };
      capturesByTeam.set(capture.MapDataId, entry);
    }
    if (capture.capturing_team === ms.team_1_name) {
      entry.team1.push(capture);
    } else if (capture.capturing_team === ms.team_2_name) {
      entry.team2.push(capture);
    }
  }

  const payloadProgressByTeam = new Map<
    number,
    { team1: PayloadProgress[]; team2: PayloadProgress[] }
  >();
  for (const progressRow of payloadProgressRows) {
    if (!progressRow.MapDataId) continue;
    const ms = matchStartsByMapDataId.get(progressRow.MapDataId);
    if (!ms) continue;
    let entry = payloadProgressByTeam.get(progressRow.MapDataId);
    if (!entry) {
      entry = { team1: [], team2: [] };
      payloadProgressByTeam.set(progressRow.MapDataId, entry);
    }
    if (progressRow.capturing_team === ms.team_1_name) {
      entry.team1.push(progressRow);
    } else if (progressRow.capturing_team === ms.team_2_name) {
      entry.team2.push(progressRow);
    }
  }

  const pointProgressByTeam = new Map<
    number,
    { team1: PointProgress[]; team2: PointProgress[] }
  >();
  for (const progressRow of pointProgressRows) {
    if (!progressRow.MapDataId) continue;
    const ms = matchStartsByMapDataId.get(progressRow.MapDataId);
    if (!ms) continue;
    let entry = pointProgressByTeam.get(progressRow.MapDataId);
    if (!entry) {
      entry = { team1: [], team2: [] };
      pointProgressByTeam.set(progressRow.MapDataId, entry);
    }
    if (progressRow.capturing_team === ms.team_1_name) {
      entry.team1.push(progressRow);
    } else if (progressRow.capturing_team === ms.team_2_name) {
      entry.team2.push(progressRow);
    }
  }

  const heroBansByMapDataId = new Map<
    number,
    { team: string; hero: string }[]
  >();
  for (const ban of heroBans) {
    if (!ban.MapDataId) continue;
    let entry = heroBansByMapDataId.get(ban.MapDataId);
    if (!entry) {
      entry = [];
      heroBansByMapDataId.set(ban.MapDataId, entry);
    }
    entry.push({ team: ban.team, hero: ban.hero });
  }

  const fullPlayerStatsByMapDataId = new Map<
    number,
    {
      player_name: string;
      player_team: string;
      player_hero: string;
      hero_time_played: number;
      eliminations: number;
      deaths: number;
    }[]
  >();
  for (const stat of allPlayerStatsFull) {
    if (!stat.MapDataId) continue;
    let entry = fullPlayerStatsByMapDataId.get(stat.MapDataId);
    if (!entry) {
      entry = [];
      fullPlayerStatsByMapDataId.set(stat.MapDataId, entry);
    }
    entry.push(stat);
  }

  return {
    mapDataRows,
    allPlayerStats,
    teamRosterSet,
    matchStartsByMapDataId,
    finalRoundsByMapDataId,
    capturesByTeam,
    payloadProgressByTeam,
    pointProgressByTeam,
    heroBansByMapDataId,
    fullPlayerStatsByMapDataId,
  };
}

const fetchTaggedScrimData = cache(fetchTaggedScrimDataFn);

/**
 * Determines the opponent's team string for a given MapData record.
 * Returns null if the user team string cannot be resolved.
 */
function resolveOpponentTeamString(
  mapDataId: number,
  allPlayerStats: ScrimPlayerStatRow[],
  teamRosterSet: Set<string>,
  matchStart: MatchStart | undefined
): string | null {
  const userTeamString = findTeamNameForMapInMemory(
    mapDataId,
    allPlayerStats,
    teamRosterSet
  );
  if (!userTeamString || !matchStart) return null;

  const team1 = matchStart.team_1_name;
  const team2 = matchStart.team_2_name;
  if (userTeamString === team1) return team2;
  if (userTeamString === team2) return team1;
  return null;
}

async function getOpponentScrimMapResultsFn(
  userTeamId: number,
  opponentAbbr: string
): Promise<ScrimMapResult[]> {
  const data = await fetchTaggedScrimData(userTeamId, opponentAbbr);
  const {
    mapDataRows,
    allPlayerStats,
    teamRosterSet,
    matchStartsByMapDataId,
    finalRoundsByMapDataId,
    capturesByTeam,
    payloadProgressByTeam,
    pointProgressByTeam,
  } = data;

  const results: ScrimMapResult[] = [];

  for (const row of mapDataRows) {
    const matchStart = matchStartsByMapDataId.get(row.id);
    const userTeamString = findTeamNameForMapInMemory(
      row.id,
      allPlayerStats,
      teamRosterSet
    );
    if (!userTeamString || !matchStart) continue;

    const finalRound = finalRoundsByMapDataId.get(row.id) ?? null;
    const captureEntry = capturesByTeam.get(row.id);
    const payloadProgressEntry = payloadProgressByTeam.get(row.id);
    const pointProgressEntry = pointProgressByTeam.get(row.id);
    const winner = calculateWinner({
      matchDetails: matchStart,
      finalRound,
      team1Captures: captureEntry?.team1 ?? [],
      team2Captures: captureEntry?.team2 ?? [],
      team1PayloadProgress: payloadProgressEntry?.team1 ?? [],
      team2PayloadProgress: payloadProgressEntry?.team2 ?? [],
      team1PointProgress: pointProgressEntry?.team1 ?? [],
      team2PointProgress: pointProgressEntry?.team2 ?? [],
    });

    if (winner === "N/A") continue;

    const mapType = matchStart.map_type ?? row.mapType;
    if (!mapType) continue;

    results.push({
      mapName: row.mapName,
      mapType,
      scrimDate: row.scrimDate,
      opponentWon: winner !== userTeamString,
      source: "scrim",
    });
  }

  return results;
}

export const getOpponentScrimMapResults = cache(getOpponentScrimMapResultsFn);

async function getOpponentScrimHeroBansFn(
  userTeamId: number,
  opponentAbbr: string
): Promise<ScrimHeroBan[]> {
  const data = await fetchTaggedScrimData(userTeamId, opponentAbbr);
  const {
    mapDataRows,
    allPlayerStats,
    teamRosterSet,
    matchStartsByMapDataId,
    finalRoundsByMapDataId,
    capturesByTeam,
    payloadProgressByTeam,
    pointProgressByTeam,
    heroBansByMapDataId,
  } = data;

  const results: ScrimHeroBan[] = [];

  for (const row of mapDataRows) {
    const matchStart = matchStartsByMapDataId.get(row.id);
    const userTeamString = findTeamNameForMapInMemory(
      row.id,
      allPlayerStats,
      teamRosterSet
    );
    if (!userTeamString || !matchStart) continue;

    const opponentTeamString = resolveOpponentTeamString(
      row.id,
      allPlayerStats,
      teamRosterSet,
      matchStart
    );
    if (!opponentTeamString) continue;

    const finalRound = finalRoundsByMapDataId.get(row.id) ?? null;
    const captureEntry = capturesByTeam.get(row.id);
    const payloadProgressEntry = payloadProgressByTeam.get(row.id);
    const pointProgressEntry = pointProgressByTeam.get(row.id);
    const winner = calculateWinner({
      matchDetails: matchStart,
      finalRound,
      team1Captures: captureEntry?.team1 ?? [],
      team2Captures: captureEntry?.team2 ?? [],
      team1PayloadProgress: payloadProgressEntry?.team1 ?? [],
      team2PayloadProgress: payloadProgressEntry?.team2 ?? [],
      team1PointProgress: pointProgressEntry?.team1 ?? [],
      team2PointProgress: pointProgressEntry?.team2 ?? [],
    });

    if (winner === "N/A") continue;

    const mapType = matchStart.map_type ?? row.mapType;
    if (!mapType) continue;

    const bans = heroBansByMapDataId.get(row.id) ?? [];
    const opponentBans = bans
      .filter((b) => b.team === opponentTeamString)
      .map((b) => b.hero);

    results.push({
      mapName: row.mapName,
      mapType,
      scrimDate: row.scrimDate,
      opponentWon: winner !== userTeamString,
      opponentBans,
      source: "scrim",
    });
  }

  return results;
}

export const getOpponentScrimHeroBans = cache(getOpponentScrimHeroBansFn);

async function getOpponentScrimPlayerStatsFn(
  userTeamId: number,
  opponentAbbr: string
): Promise<ScrimPlayerStat[]> {
  const data = await fetchTaggedScrimData(userTeamId, opponentAbbr);
  const {
    mapDataRows,
    allPlayerStats,
    teamRosterSet,
    matchStartsByMapDataId,
    fullPlayerStatsByMapDataId,
  } = data;

  const aggregated = new Map<
    string,
    {
      hero: string;
      role: HeroRole;
      timePlayed: number;
      eliminations: number;
      deaths: number;
    }
  >();

  for (const row of mapDataRows) {
    const matchStart = matchStartsByMapDataId.get(row.id);
    const userTeamString = findTeamNameForMapInMemory(
      row.id,
      allPlayerStats,
      teamRosterSet
    );
    if (!userTeamString || !matchStart) continue;

    const opponentTeamString = resolveOpponentTeamString(
      row.id,
      allPlayerStats,
      teamRosterSet,
      matchStart
    );
    if (!opponentTeamString) continue;

    const stats = fullPlayerStatsByMapDataId.get(row.id) ?? [];
    for (const stat of stats) {
      if (stat.player_team !== opponentTeamString) continue;

      const key = `${stat.player_name}__${stat.player_hero}`;
      const role = heroRoleMapping[stat.player_hero as HeroName] ?? "Damage";
      const existing = aggregated.get(key);
      if (existing) {
        existing.timePlayed += stat.hero_time_played;
        existing.eliminations += stat.eliminations;
        existing.deaths += stat.deaths;
      } else {
        aggregated.set(key, {
          hero: stat.player_hero,
          role,
          timePlayed: stat.hero_time_played,
          eliminations: stat.eliminations,
          deaths: stat.deaths,
        });
      }
    }
  }

  return Array.from(aggregated.entries()).map(([key, value]) => ({
    playerName: key.split("__")[0],
    hero: value.hero,
    role: value.role,
    timePlayed: value.timePlayed,
    eliminations: value.eliminations,
    deaths: value.deaths,
    source: "scrim" as const,
  }));
}

export const getOpponentScrimPlayerStats = cache(getOpponentScrimPlayerStatsFn);
