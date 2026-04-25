import type { GetScoutingTeamsResponse } from "@/app/api/scouting/get-teams/route";
import type { ParserData } from "@/types/parser";

export type HeroBan = { hero: string; team: string; banPosition: number };

export type FormValues = {
  name: string;
  team: string;
  date: Date;
  map: ParserData | undefined;
  opponentTeamAbbr?: string | null;
  heroBans: HeroBan[];
};

export type ScoutingTeam = GetScoutingTeamsResponse["teams"][number];
export type TeamOption = { label: string; value: string };

export const ACCEPTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export const MAX_FILE_SIZE = 10000000;
