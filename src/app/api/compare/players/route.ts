import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { ComparisonAggregationService } from "@/data/comparison";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/compare/players",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session?.user?.email) {
      wideEvent.status_code = 401;
      wideEvent.outcome = "unauthorized";
      wideEvent.error = { message: "No session found" };
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "user_not_found";
      wideEvent.error = { message: "User not found" };
      return new Response("User not found", { status: 404 });
    }

    wideEvent.user = { id: user.id, email: user.email };

    const teamIdParam = request.nextUrl.searchParams.get("teamId");
    if (!teamIdParam) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "missing_team_id";
      wideEvent.error = { message: "Team ID is required" };
      return new Response("Team ID is required", { status: 400 });
    }

    const teamId = parseInt(teamIdParam);
    if (isNaN(teamId)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_team_id";
      wideEvent.error = { message: "Invalid team ID" };
      return new Response("Invalid team ID", { status: 400 });
    }

    wideEvent.team = { id: teamId };

    const mapIdsParam = request.nextUrl.searchParams.get("mapIds");
    let mapIds: number[] | undefined;

    if (mapIdsParam) {
      try {
        mapIds = JSON.parse(mapIdsParam) as number[];
        if (
          !Array.isArray(mapIds) ||
          !mapIds.every((id) => typeof id === "number")
        ) {
          wideEvent.status_code = 400;
          wideEvent.outcome = "invalid_map_ids";
          wideEvent.error = { message: "Map IDs must be an array of numbers" };
          return new Response("Map IDs must be an array of numbers", {
            status: 400,
          });
        }
      } catch {
        wideEvent.status_code = 400;
        wideEvent.outcome = "invalid_map_ids_json";
        wideEvent.error = { message: "Map IDs must be valid JSON" };
        return new Response("Map IDs must be valid JSON", { status: 400 });
      }
    }

    const players = await AppRuntime.runPromise(
      ComparisonAggregationService.pipe(
        Effect.flatMap((svc) => svc.getTeamPlayers(teamId, mapIds))
      )
    );

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      player_count: players.length,
      map_ids: mapIds,
      map_count: mapIds?.length ?? 0,
      filtered: !!mapIds,
    };

    return NextResponse.json({
      success: true,
      players,
    });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error fetching players for comparison", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch players",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
