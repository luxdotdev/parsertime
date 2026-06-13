import { AppRuntime } from "@/data/runtime";
import { FaceitTeamScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { auth } from "@/lib/auth";
import { unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export type GetFaceitTeamsResponse = {
  teams: { faceitTeamId: string; name: string; matchCount: number }[];
};

export async function GET() {
  const session = await auth();

  if (!session) {
    unauthorized();
  }

  const teams = await AppRuntime.runPromise(
    FaceitTeamScoutingService.pipe(Effect.flatMap((svc) => svc.getFaceitTeams()))
  );

  return NextResponse.json<GetFaceitTeamsResponse>({
    teams: teams.map((t) => ({ faceitTeamId: t.faceitTeamId, name: t.name, matchCount: t.matchCount })),
  });
}
