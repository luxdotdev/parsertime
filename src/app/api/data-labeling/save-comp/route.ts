import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { dataLabeling } from "@/lib/flags";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const heroNames = Object.keys(heroRoleMapping) as [string, ...string[]];

const CompSchema = z.object({
  mapResultId: z.number().int().positive(),
  team1Comp: z.array(z.enum(heroNames)).length(5),
  team2Comp: z.array(z.enum(heroNames)).length(5),
});

function validateRoleConstraint(heroes: string[]): boolean {
  let tanks = 0;
  let damage = 0;
  let support = 0;

  for (const hero of heroes) {
    const role = heroRoleMapping[hero as HeroName];
    if (role === "Tank") tanks++;
    else if (role === "Damage") damage++;
    else if (role === "Support") support++;
  }

  return tanks === 1 && damage === 2 && support === 2;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/data-labeling/save-comp",
    timestamp: new Date().toISOString(),
  };

  try {
    const enabled = await dataLabeling();
    if (!enabled) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "feature_disabled";
      return new Response("Not found", { status: 404 });
    }

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

    const body = CompSchema.safeParse(await request.json());
    if (!body.success) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "validation_failed";
      wideEvent.error = { message: body.error.message };
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { mapResultId, team1Comp, team2Comp } = body.data;

    wideEvent.request_params = {
      map_result_id: mapResultId,
      team1_comp: team1Comp,
      team2_comp: team2Comp,
    };

    if (!validateRoleConstraint(team1Comp)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_team1_roles";
      wideEvent.error = {
        message: "Team 1 must have exactly 1 Tank, 2 Damage, 2 Support",
      };
      return NextResponse.json(
        {
          success: false,
          error: "Team 1 must have exactly 1 Tank, 2 Damage, 2 Support",
        },
        { status: 400 }
      );
    }

    if (!validateRoleConstraint(team2Comp)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_team2_roles";
      wideEvent.error = {
        message: "Team 2 must have exactly 1 Tank, 2 Damage, 2 Support",
      };
      return NextResponse.json(
        {
          success: false,
          error: "Team 2 must have exactly 1 Tank, 2 Damage, 2 Support",
        },
        { status: 400 }
      );
    }

    const mapResult = await prisma.scoutingMapResult.findUnique({
      where: { id: mapResultId },
      select: { id: true, matchId: true },
    });

    if (!mapResult) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "map_result_not_found";
      wideEvent.error = { message: "Map result not found" };
      return NextResponse.json(
        { success: false, error: "Map result not found" },
        { status: 404 }
      );
    }

    await prisma.scoutingMapResult.update({
      where: { id: mapResultId },
      data: { team1Comp, team2Comp },
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      map_result_id: mapResultId,
      match_id: mapResult.matchId,
      team1_hero_count: team1Comp.length,
      team2_hero_count: team2Comp.length,
    };

    return NextResponse.json({ success: true });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error saving team composition", error);
    return NextResponse.json(
      { success: false, error: "Failed to save team composition" },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
