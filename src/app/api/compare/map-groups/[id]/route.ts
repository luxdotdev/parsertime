import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { MapGroupService } from "@/data/map";
import { auth, canManageTeam, getCurrentUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateMapGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .optional(),
  description: z.string().max(500, "Description is too long").optional(),
  mapIds: z
    .array(z.number().int().positive())
    .min(1, "At least one map must be selected")
    .optional(),
  category: z.string().max(50, "Category is too long").optional(),
});

function parsePositiveInt(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "PUT",
    path: "/api/compare/map-groups/[id]",
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

    const user = await getCurrentUser();
    if (!user) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "user_not_found";
      wideEvent.error = { message: "User not found" };
      return new Response("User not found", { status: 404 });
    }

    wideEvent.user = { id: user.id, email: user.email };

    const { id: idParam } = await params;
    const groupId = parsePositiveInt(idParam);

    if (!groupId) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_group_id";
      wideEvent.error = { message: "Invalid group ID" };
      return new Response("Invalid group ID", { status: 400 });
    }

    wideEvent.group = { id: groupId };

    const body = await request.json();
    const validatedData = UpdateMapGroupSchema.safeParse(body);

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

    const group = await prisma.mapGroup.findUnique({
      where: { id: groupId },
      include: {
        team: { select: { id: true, ownerId: true } },
      },
    });

    if (!group) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "group_not_found";
      wideEvent.error = { message: "Map group not found" };
      return NextResponse.json(
        {
          success: false,
          error: "Map group not found",
        },
        { status: 404 }
      );
    }

    const canManage = await canManageTeam(group.team.id, user);

    if (!canManage) {
      wideEvent.status_code = 403;
      wideEvent.outcome = "forbidden";
      wideEvent.error = {
        message: "User does not have permission to update this group",
      };
      wideEvent.permissions = {
        can_manage_team: canManage,
      };
      return NextResponse.json(
        {
          success: false,
          error: "You must manage this team to update this group",
        },
        { status: 403 }
      );
    }

    wideEvent.permissions = {
      can_manage_team: canManage,
    };

    const { name, description, mapIds, category } = validatedData.data;
    if (mapIds) {
      const validMaps = await prisma.map.count({
        where: {
          id: { in: mapIds },
          Scrim: { teamId: group.team.id },
        },
      });
      if (validMaps !== new Set(mapIds).size) {
        return NextResponse.json(
          { success: false, error: "Map IDs must belong to the team" },
          { status: 400 }
        );
      }
    }

    const updatedGroup = await AppRuntime.runPromise(
      MapGroupService.pipe(
        Effect.flatMap((svc) =>
          svc.updateMapGroup(groupId, {
            name,
            description,
            mapIds,
            category,
          })
        )
      )
    );

    const groupWithCreator = await prisma.mapGroup.findUnique({
      where: { id: updatedGroup.id },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      group_id: updatedGroup.id,
      group_name: updatedGroup.name,
      map_count: updatedGroup.mapIds.length,
    };

    return NextResponse.json({
      success: true,
      group: {
        id: updatedGroup.id,
        name: updatedGroup.name,
        description: updatedGroup.description,
        category: updatedGroup.category,
        mapIds: updatedGroup.mapIds,
        mapCount: updatedGroup.mapIds.length,
        createdBy:
          groupWithCreator?.creator.name ?? groupWithCreator?.creator.email,
        createdAt: updatedGroup.createdAt,
        updatedAt: updatedGroup.updatedAt,
      },
    });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error updating map group", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update map group",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "DELETE",
    path: "/api/compare/map-groups/[id]",
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

    const user = await getCurrentUser();
    if (!user) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "user_not_found";
      wideEvent.error = { message: "User not found" };
      return new Response("User not found", { status: 404 });
    }

    wideEvent.user = { id: user.id, email: user.email };

    const { id: idParam } = await params;
    const groupId = parsePositiveInt(idParam);

    if (!groupId) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_group_id";
      wideEvent.error = { message: "Invalid group ID" };
      return new Response("Invalid group ID", { status: 400 });
    }

    wideEvent.group = { id: groupId };

    const group = await prisma.mapGroup.findUnique({
      where: { id: groupId },
      include: {
        team: { select: { id: true, ownerId: true } },
      },
    });

    if (!group) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "group_not_found";
      wideEvent.error = { message: "Map group not found" };
      return NextResponse.json(
        {
          success: false,
          error: "Map group not found",
        },
        { status: 404 }
      );
    }

    const canManage = await canManageTeam(group.team.id, user);

    if (!canManage) {
      wideEvent.status_code = 403;
      wideEvent.outcome = "forbidden";
      wideEvent.error = {
        message: "User does not have permission to delete this group",
      };
      wideEvent.permissions = {
        can_manage_team: canManage,
      };
      return NextResponse.json(
        {
          success: false,
          error: "You must manage this team to delete this group",
        },
        { status: 403 }
      );
    }

    wideEvent.permissions = {
      can_manage_team: canManage,
    };

    await AppRuntime.runPromise(
      MapGroupService.pipe(Effect.flatMap((svc) => svc.deleteMapGroup(groupId)))
    );

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      deleted_group_id: groupId,
      group_name: group.name,
    };

    return NextResponse.json({
      success: true,
      message: "Map group deleted successfully",
    });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error deleting map group", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete map group",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
