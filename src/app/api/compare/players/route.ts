import { getTeamPlayers } from "@/data/comparison-dto";
import { getUser } from "@/data/user-dto";
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

    const user = await getUser(session.user.email);
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

    const players = await getTeamPlayers(teamId);

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      player_count: players.length,
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
