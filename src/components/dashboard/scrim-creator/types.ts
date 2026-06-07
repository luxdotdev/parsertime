import type { GetScoutingTeamsResponse } from "@/app/api/scouting/get-teams/route";

export type HeroBan = { hero: string; team: string; banPosition: number };

export type FormValues = {
  name: string;
  team: string;
  date: Date;
  opponentTeamAbbr?: string | null;
  scrimRequestId?: string | null;
};

export type LinkableRequestOption = {
  scrimRequestId: string;
  opponentTeamId: number;
  opponentTeamName: string;
};

export type ScoutingTeam = GetScoutingTeamsResponse["teams"][number];
export type TeamOption = { label: string; value: string };

export const ACCEPTED_FILE_TYPES = ["text/plain"];

export const MAX_FILE_SIZE = 10000000;
