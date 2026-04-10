import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { createMapGroup } from "@/data/map-group-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateMapGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  teamId: z.number().int().positive("Team ID must be positive"),
  mapIds: z.array(z.number()).min(1, "At least one map must be selected"),
  category: z.string().max(50, "Category is too long").optional(),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "GET",
    path: "/api/compare/map-groups",
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
    const categoryParam = request.nextUrl.searchParams.get("category");

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
    wideEvent.filters = {
      category: categoryParam,
    };

    const groups = await prisma.mapGroup.findMany({
      where: {
        teamId,
        ...(categoryParam ? { category: categoryParam } : {}),
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedGroups = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      category: group.category,
      mapIds: group.mapIds,
      mapCount: group.mapIds.length,
      createdBy: group.creator.name ?? group.creator.email,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      group_count: formattedGroups.length,
      filtered_by_category: !!categoryParam,
    };

    return NextResponse.json({
      success: true,
      groups: formattedGroups,
    });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error fetching map groups", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch map groups",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "POST",
    path: "/api/compare/map-groups",
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

    const body = await request.json();
    const validatedData = CreateMapGroupSchema.safeParse(body);

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

    const { name, description, teamId, mapIds, category } = validatedData.data;

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
          error: "You must be a member of this team to create map groups",
        },
        { status: 403 }
      );
    }

    wideEvent.team = { id: teamId, name: team.name };
    wideEvent.group = {
      name,
      map_count: mapIds.length,
      category,
    };

    const group = await createMapGroup({
      name,
      description,
      teamId,
      mapIds,
      category,
      createdBy: user.id,
    });

    const groupWithCreator = await prisma.mapGroup.findUnique({
      where: { id: group.id },
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
          category: group.category,
          mapIds: group.mapIds,
          mapCount: group.mapIds.length,
          createdBy:
            groupWithCreator?.creator.name ?? groupWithCreator?.creator.email,
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
    Logger.error("Error creating map group", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create map group",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
