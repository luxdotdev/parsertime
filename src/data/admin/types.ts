import type { MapType, RosterRole } from "@prisma/client";

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

export type RosterPlayerForLabeling = {
  id: number;
  displayName: string;
  role: RosterRole;
};

export type HeroAssignmentForLabeling = {
  heroName: string;
  playerName: string;
  team: string;
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
  heroAssignments: HeroAssignmentForLabeling[];
};

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
  team1Roster: RosterPlayerForLabeling[];
  team2Roster: RosterPlayerForLabeling[];
};
