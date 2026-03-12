import { authenticateBotRequest } from "@/lib/bot-auth";
import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import { Logger } from "@/lib/logger";
import type { HeroName } from "@/types/heroes";
import { heroRoleMapping } from "@/types/heroes";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const wideEvent: Record<string, unknown> = {
    route: "/api/bot/leaderboard",
    method: "GET",
    timestamp: new Date().toISOString(),
  };
  const startTime = Date.now();

  try {
    const botAuth = await authenticateBotRequest(request);
    if (!botAuth) {
      wideEvent.outcome = "unauthorized";
      wideEvent.status_code = 401;
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    wideEvent.bot_key_id = botAuth.keyId;
    wideEvent.guild_id = botAuth.guildId;

    const { searchParams } = new URL(request.url);
    const hero = searchParams.get("hero");
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    if (!hero) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: "hero query parameter is required" },
        { status: 400 }
      );
    }

    if (!(hero in heroRoleMapping)) {
      wideEvent.outcome = "bad_request";
      wideEvent.status_code = 400;
      return Response.json(
        { success: false, error: `Invalid hero name: ${hero}` },
        { status: 400 }
      );
    }

    wideEvent.hero = hero;
    wideEvent.limit = limit;

    const leaderboard = await getCompositeSRLeaderboard({
      hero: hero as HeroName,
      limit,
    });

    const role = heroRoleMapping[hero as HeroName];

    wideEvent.result_count = leaderboard.length;
    wideEvent.outcome = "success";
    wideEvent.status_code = 200;

    return Response.json({
      success: true,
      data: { hero, role, leaderboard },
    });
  } catch (error) {
    wideEvent.outcome = "error";
    wideEvent.status_code = 500;
    wideEvent.error = {
      message: (error as Error).message,
      type: (error as Error).name,
    };
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
