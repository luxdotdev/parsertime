import { getScoutingTeams } from "@/data/scouting-dto";
import { auth } from "@/lib/auth";
import { unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export type GetScoutingTeamsResponse = {
  teams: { abbreviation: string; fullName: string }[];
};

export async function GET() {
  const session = await auth();

  if (!session) {
    unauthorized();
  }

  const scoutingTeams = await getScoutingTeams();

  const teams = scoutingTeams.map((t) => ({
    abbreviation: t.abbreviation,
    fullName: t.fullName,
  }));

  return NextResponse.json<GetScoutingTeamsResponse>({ teams });
}
