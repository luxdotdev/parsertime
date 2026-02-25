import "server-only";

import prisma from "@/lib/prisma";
import type { MapType } from "@prisma/client";
import { cache } from "react";

export type UnlabeledMatchSummary = {
  id: number;
  team1: string;
  team1FullName: string;
  team2: string;
  team2FullName: string;
  team1Score: number | null;
  team2Score: number | null;
  matchDate: Date;
  tournament: string;
  vodCount: number;
  labeledMaps: number;
  totalMaps: number;
};

export type UnlabeledMatchesResult = {
  matches: UnlabeledMatchSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
};

async function getUnlabeledMatchesFn(
  page: number,
  pageSize: number
): Promise<UnlabeledMatchesResult> {
  const where = {
    NOT: { vods: { equals: "[]" as unknown as undefined } },
    maps: {
      some: {
        OR: [
          { team1Comp: { isEmpty: true } },
          { team2Comp: { isEmpty: true } },
        ],
      },
    },
  };

  const [matches, totalCount] = await Promise.all([
    prisma.scoutingMatch.findMany({
      where,
      include: {
        maps: { select: { id: true, team1Comp: true, team2Comp: true } },
        tournament: { select: { title: true } },
      },
      orderBy: { matchDate: "desc" },
      skip: page * pageSize,
      take: pageSize,
    }),
    prisma.scoutingMatch.count({ where }),
  ]);

  return {
    matches: matches.map((m) => {
      const vods = m.vods as { url: string; platform: string }[];
      const labeledMaps = m.maps.filter(
        (map) => map.team1Comp.length > 0 && map.team2Comp.length > 0
      ).length;

      return {
        id: m.id,
        team1: m.team1,
        team1FullName: m.team1FullName,
        team2: m.team2,
        team2FullName: m.team2FullName,
        team1Score: m.team1Score,
        team2Score: m.team2Score,
        matchDate: m.matchDate,
        tournament: m.tournament.title,
        vodCount: vods.length,
        labeledMaps,
        totalMaps: m.maps.length,
      };
    }),
    totalCount,
    page,
    pageSize,
  };
}

export const getUnlabeledMatches = cache(getUnlabeledMatchesFn);

export type MatchForLabeling = {
  id: number;
  team1: string;
  team1FullName: string;
  team2: string;
  team2FullName: string;
  team1Score: number | null;
  team2Score: number | null;
  matchDate: Date;
  tournament: string;
  vods: { url: string; platform: string }[];
  maps: MatchMapForLabeling[];
};

export type MatchMapForLabeling = {
  id: number;
  gameNumber: number;
  mapType: MapType;
  mapName: string;
  team1Score: string;
  team2Score: string;
  winner: string;
  team1Comp: string[];
  team2Comp: string[];
  heroBans: {
    id: number;
    team: string;
    hero: string;
    banOrder: number;
  }[];
};

async function getMatchForLabelingFn(
  matchId: number
): Promise<MatchForLabeling | null> {
  const match = await prisma.scoutingMatch.findUnique({
    where: { id: matchId },
    include: {
      maps: {
        include: {
          heroBans: {
            select: { id: true, team: true, hero: true, banOrder: true },
            orderBy: { banOrder: "asc" },
          },
        },
        orderBy: { gameNumber: "asc" },
      },
      tournament: { select: { title: true } },
    },
  });

  if (!match) return null;

  const vods = match.vods as { url: string; platform: string }[];

  return {
    id: match.id,
    team1: match.team1,
    team1FullName: match.team1FullName,
    team2: match.team2,
    team2FullName: match.team2FullName,
    team1Score: match.team1Score,
    team2Score: match.team2Score,
    matchDate: match.matchDate,
    tournament: match.tournament.title,
    vods,
    maps: match.maps.map((map) => ({
      id: map.id,
      gameNumber: map.gameNumber,
      mapType: map.mapType,
      mapName: map.mapName,
      team1Score: map.team1Score,
      team2Score: map.team2Score,
      winner: map.winner,
      team1Comp: map.team1Comp,
      team2Comp: map.team2Comp,
      heroBans: map.heroBans,
    })),
  };
}

export const getMatchForLabeling = cache(getMatchForLabelingFn);
