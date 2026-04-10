import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { ComparisonAggregationService } from "@/data/comparison";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import type { HeroName } from "@/types/heroes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const MapIdsSchema = z
  .array(z.number())
  .min(1, "At least one map must be provided");
const PlayerNameSchema = z.string().min(1, "Player name is required");
const HeroesSchema = z.array(z.string()).optional();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/compare/stats",
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

    const mapIdsParam = request.nextUrl.searchParams.get("mapIds");
    const playerName = request.nextUrl.searchParams.get("playerName");
    const heroesParam = request.nextUrl.searchParams.get("heroes");

    if (!mapIdsParam) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "missing_map_ids";
      wideEvent.error = { message: "Map IDs are required" };
      return new Response("Map IDs are required", { status: 400 });
    }

    if (!playerName) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "missing_player_name";
      wideEvent.error = { message: "Player name is required" };
      return new Response("Player name is required", { status: 400 });
    }

    let mapIds: number[];
    try {
      mapIds = JSON.parse(mapIdsParam) as number[];
    } catch {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_map_ids";
      wideEvent.error = { message: "Map IDs must be a valid JSON array" };
      return new Response("Map IDs must be a valid JSON array", {
        status: 400,
      });
    }

    const validMapIds = MapIdsSchema.safeParse(mapIds);
    if (!validMapIds.success) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_map_ids_validation";
      wideEvent.error = {
        message: validMapIds.error.message ?? "Invalid map IDs",
      };
      return new Response(validMapIds.error.message, {
        status: 400,
      });
    }

    const validPlayerName = PlayerNameSchema.safeParse(playerName);
    if (!validPlayerName.success) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_player_name";
      wideEvent.error = { message: "Invalid player name" };
      return new Response("Invalid player name", { status: 400 });
    }

    let heroes: HeroName[] | undefined;
    if (heroesParam) {
      const heroesArray = heroesParam.split(",");
      const validHeroes = HeroesSchema.safeParse(heroesArray);
      if (!validHeroes.success) {
        wideEvent.status_code = 400;
        wideEvent.outcome = "invalid_heroes";
        wideEvent.error = { message: "Invalid heroes parameter" };
        return new Response("Invalid heroes parameter", { status: 400 });
      }
      heroes = heroesArray as HeroName[];
    }

    wideEvent.request_params = {
      player_name: validPlayerName.data,
      map_ids: validMapIds.data,
      map_count: validMapIds.data.length,
      heroes,
      hero_count: heroes?.length ?? 0,
    };

    const comparisonStats = await AppRuntime.runPromise(
      ComparisonAggregationService.pipe(
        Effect.flatMap((svc) =>
          svc.getComparisonStats(validMapIds.data, validPlayerName.data, heroes)
        )
      )
    );

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      map_count: comparisonStats.mapCount,
      player_name: comparisonStats.playerName,
      filtered_heroes: comparisonStats.filteredHeroes,
      has_trends: !!comparisonStats.trends,
      has_hero_breakdown: !!comparisonStats.heroBreakdown,
      total_time_played_seconds: comparisonStats.aggregated.heroTimePlayed,
      improving_metrics_count:
        comparisonStats.trends?.improvingMetrics.length ?? 0,
      declining_metrics_count:
        comparisonStats.trends?.decliningMetrics.length ?? 0,
    };

    return NextResponse.json({
      success: true,
      data: comparisonStats,
    });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error fetching comparison stats", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch comparison statistics",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
