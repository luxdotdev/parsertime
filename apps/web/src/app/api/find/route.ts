import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { TeamSharedDataService } from "@/data/team/shared-data-service";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Data backing for Find (the ⌘K universal search).
 *
 * - `GET /api/find` returns the compact entity index prefetched when the
 *   dialog first opens: the user's teams, their rosters, and the most recent
 *   scrims. This is what makes local-first search feel instant.
 * - `GET /api/find?q=…` covers the long tail: older scrims whose names match
 *   the phrase. The client caches responses per phrase.
 */

export type FindIndexTeam = { id: number; name: string; image: string | null };
export type FindIndexPlayer = { name: string; teamName: string };
export type FindIndexScrim = {
  id: number;
  name: string;
  date: string;
  teamId: number;
  teamName: string | null;
};

export type FindIndexResponse = {
  teams: FindIndexTeam[];
  players: FindIndexPlayer[];
  scrims: FindIndexScrim[];
};

export type FindSearchResponse = {
  scrims: FindIndexScrim[];
};

const INDEX_SCRIM_LIMIT = 50;
const SEARCH_SCRIM_LIMIT = 10;
/** Rosters are cached per team, but keep the fan-out bounded regardless. */
const ROSTER_TEAM_LIMIT = 10;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const viewableScrims = {
    OR: [
      { creatorId: user.id },
      { Team: { users: { some: { id: user.id } } } },
    ],
    tournamentMatch: null,
  };

  try {
    if (q.length > 0) {
      const scrims = await prisma.scrim.findMany({
        where: {
          AND: [viewableScrims, { name: { contains: q, mode: "insensitive" } }],
        },
        orderBy: { date: "desc" },
        take: SEARCH_SCRIM_LIMIT,
        include: { Team: { select: { name: true } } },
      });

      return NextResponse.json({
        scrims: scrims.map(toIndexScrim),
      } satisfies FindSearchResponse);
    }

    const [teams, scrims] = await Promise.all([
      prisma.team.findMany({
        where: {
          OR: [{ ownerId: user.id }, { users: { some: { id: user.id } } }],
          id: { not: 0 },
        },
        orderBy: { id: "asc" },
        select: { id: true, name: true, image: true },
      }),
      prisma.scrim.findMany({
        where: viewableScrims,
        orderBy: { date: "desc" },
        take: INDEX_SCRIM_LIMIT,
        include: { Team: { select: { name: true } } },
      }),
    ]);

    const rosterTeams = teams.slice(0, ROSTER_TEAM_LIMIT);
    const rosters = await Promise.all(
      rosterTeams.map((team) =>
        AppRuntime.runPromise(
          TeamSharedDataService.pipe(
            Effect.flatMap((svc) => svc.getTeamRoster(team.id)),
            Effect.catchAll(() => Effect.succeed([] as string[]))
          )
        )
      )
    );

    const players = new Map<string, FindIndexPlayer>();
    rosterTeams.forEach((team, i) => {
      for (const name of rosters[i]) {
        if (!players.has(name)) {
          players.set(name, { name, teamName: team.name });
        }
      }
    });

    return NextResponse.json({
      teams,
      players: [...players.values()],
      scrims: scrims.map(toIndexScrim),
    } satisfies FindIndexResponse);
  } catch (error) {
    Logger.error("Error building Find index:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}

function toIndexScrim(scrim: {
  id: number;
  name: string;
  date: Date;
  teamId: number | null;
  Team: { name: string } | null;
}): FindIndexScrim {
  return {
    id: scrim.id,
    name: scrim.name,
    date: scrim.date.toISOString(),
    teamId: scrim.teamId ?? 0,
    teamName: scrim.Team?.name ?? null,
  };
}
