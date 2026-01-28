import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { HeroName } from "@/types/heroes";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  teamId: z.number().int().positive("Team ID must be positive"),
  playerName: z.string().min(1, "Player name is required"),
  mapIds: z.array(z.number()).min(1, "At least one map must be selected"),
  heroes: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/compare/groups",
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

    const body = await request.json();
    const validatedData = CreateGroupSchema.safeParse(body);

    if (!validatedData.success) {
      const firstError = validatedData.error.issues[0];
      wideEvent.status_code = 400;
      wideEvent.outcome = "validation_error";
      wideEvent.error = {
        message: firstError?.message ?? "Validation failed",
        validation_errors: validatedData.error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      };
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message ?? "Validation failed",
          details: validatedData.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, description, teamId, playerName, mapIds, heroes } =
      validatedData.data;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        users: {
          where: { id: user.id },
        },
      },
    });

    if (!team) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "team_not_found";
      wideEvent.error = { message: "Team not found" };
      return NextResponse.json(
        {
          success: false,
          error: "Team not found",
        },
        { status: 404 }
      );
    }

    if (team.users.length === 0 && team.ownerId !== user.id) {
      wideEvent.status_code = 403;
      wideEvent.outcome = "forbidden";
      wideEvent.error = { message: "User is not a member of this team" };
      return NextResponse.json(
        {
          success: false,
          error: "You must be a member of this team to save comparison groups",
        },
        { status: 403 }
      );
    }

    wideEvent.team = { id: teamId, name: team.name };
    wideEvent.group = {
      name,
      player_name: playerName,
      map_count: mapIds.length,
      hero_count: heroes?.length ?? 0,
    };

    const group = await prisma.comparisonGroup.create({
      data: {
        name,
        description,
        teamId,
        createdBy: user.id,
        playerName,
        mapIds,
        heroes: (heroes as HeroName[]) ?? [],
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    wideEvent.status_code = 201;
    wideEvent.outcome = "success";
    wideEvent.result = {
      group_id: group.id,
    };

    return NextResponse.json(
      {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          playerName: group.playerName,
          heroes: group.heroes,
          mapIds: group.mapIds,
          mapCount: group.mapIds.length,
          createdBy: group.creator.name ?? group.creator.email,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error creating comparison group", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create comparison group",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
