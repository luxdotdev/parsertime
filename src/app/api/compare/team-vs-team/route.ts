import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { TeamComparisonService } from "@/data/team";
import { auth, canViewMaps, canViewTeam, getCurrentUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import type { HeroName } from "@/types/heroes";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);

    const mapIdsParam = searchParams.get("mapIds");
    const teamIdParam = searchParams.get("teamId");
    const heroesParam = searchParams.get("heroes");

    if (!mapIdsParam || !teamIdParam) {
      return NextResponse.json(
        {
          error: "Missing required parameters: mapIds and teamId are required",
        },
        { status: 400 }
      );
    }

    const mapIds = JSON.parse(mapIdsParam) as number[];
    const teamId = parseInt(teamIdParam, 10);

    if (!Array.isArray(mapIds) || mapIds.length === 0) {
      return NextResponse.json(
        { error: "mapIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "teamId must be a valid number" },
        { status: 400 }
      );
    }

    if (
      !(await canViewTeam(teamId, user)) ||
      !(await canViewMaps(mapIds, user))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const heroes = heroesParam
      ? (heroesParam.split(",") as HeroName[])
      : undefined;

    const stats = await AppRuntime.runPromise(
      TeamComparisonService.pipe(
        Effect.flatMap((svc) =>
          svc.getTeamComparisonStats(mapIds, teamId, heroes)
        )
      )
    );

    return NextResponse.json({ data: stats });
  } catch (error) {
    Logger.error("Error fetching team comparison stats:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
