import { AppRuntime } from "@/data/runtime";
import { FaceitPlayerScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { auth } from "@/lib/auth";
import { unauthorized } from "next/navigation";
import { NextResponse } from "next/server";

export type GetFaceitPlayersResponse = {
  players: {
    faceitPlayerId: string;
    nickname: string;
    battletag: string | null;
    matchCount: number;
    topFsr: number | null;
  }[];
};

export async function GET() {
  const session = await auth();

  if (!session) {
    unauthorized();
  }

  const players = await AppRuntime.runPromise(
    FaceitPlayerScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitPlayers())
    )
  );

  return NextResponse.json<GetFaceitPlayersResponse>({
    players: players.map((p) => ({
      faceitPlayerId: p.faceitPlayerId,
      nickname: p.nickname,
      battletag: p.battletag,
      matchCount: p.matchCount,
      topFsr: p.topFsr,
    })),
  });
}
