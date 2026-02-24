import { getAvailableMapsForComparison } from "@/data/comparison-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import type { HeroName } from "@/types/heroes";
import { MapType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/compare/maps",
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

    const user = await getUser(session.user.email);
    if (!user) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "user_not_found";
      wideEvent.error = { message: "User not found" };
      return new Response("User not found", { status: 404 });
    }

    wideEvent.user = { id: user.id, email: user.email };

    const teamIdParam = request.nextUrl.searchParams.get("teamId");
    const playerName = request.nextUrl.searchParams.get("playerName");
    const dateFromParam = request.nextUrl.searchParams.get("dateFrom");
    const dateToParam = request.nextUrl.searchParams.get("dateTo");
    const mapTypeParam = request.nextUrl.searchParams.get("mapType");
    const heroesParam = request.nextUrl.searchParams.get("heroes");

    if (!teamIdParam) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "missing_team_id";
      wideEvent.error = { message: "Team ID is required" };
      return new Response("Team ID is required", { status: 400 });
    }

    if (!playerName) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "missing_player_name";
      wideEvent.error = { message: "Player name is required" };
      return new Response("Player name is required", { status: 400 });
    }

    const teamId = parseInt(teamIdParam);
    if (isNaN(teamId)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_team_id";
      wideEvent.error = { message: "Invalid team ID" };
      return new Response("Invalid team ID", { status: 400 });
    }

    const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
    const dateTo = dateToParam ? new Date(dateToParam) : undefined;

    const mapType =
      mapTypeParam && Object.values(MapType).includes(mapTypeParam as MapType)
        ? (mapTypeParam as MapType)
        : undefined;

    const heroes = heroesParam
      ? (heroesParam.split(",") as HeroName[])
      : undefined;

    wideEvent.team = { id: teamId };
    wideEvent.filters = {
      player_name: playerName,
      date_from: dateFrom?.toISOString(),
      date_to: dateTo?.toISOString(),
      map_type: mapType,
      heroes,
      hero_count: heroes?.length ?? 0,
    };

    const maps = await getAvailableMapsForComparison({
      teamId,
      playerName,
      dateFrom,
      dateTo,
      mapType,
      heroes,
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      map_count: maps.length,
      unique_scrims: new Set(maps.map((m) => m.scrimId)).size,
      map_types: Array.from(new Set(maps.map((m) => m.mapType))),
    };

    return NextResponse.json({
      success: true,
      maps,
    });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error fetching maps for comparison", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch maps",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
