import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    method: "DELETE",
    path: "/api/compare/groups/[id]",
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

    const { id: idParam } = await params;
    const groupId = parseInt(idParam);

    if (isNaN(groupId)) {
      wideEvent.status_code = 400;
      wideEvent.outcome = "invalid_group_id";
      wideEvent.error = { message: "Invalid group ID" };
      return new Response("Invalid group ID", { status: 400 });
    }

    wideEvent.group = { id: groupId };

    const group = await prisma.comparisonGroup.findUnique({
      where: { id: groupId },
      include: {
        team: {
          select: {
            ownerId: true,
            users: {
              where: { id: user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!group) {
      wideEvent.status_code = 404;
      wideEvent.outcome = "group_not_found";
      wideEvent.error = { message: "Comparison group not found" };
      return NextResponse.json(
        {
          success: false,
          error: "Comparison group not found",
        },
        { status: 404 }
      );
    }

    const isOwner = group.createdBy === user.id;
    const isTeamOwner = group.team.ownerId === user.id;
    const isAdmin =
      user.role === $Enums.UserRole.ADMIN ||
      user.role === $Enums.UserRole.MANAGER;
    const isTeamMember = group.team.users.length > 0;

    if (!isOwner && !isTeamOwner && !isAdmin) {
      wideEvent.status_code = 403;
      wideEvent.outcome = "forbidden";
      wideEvent.error = {
        message: "User does not have permission to delete this group",
      };
      wideEvent.permissions = {
        is_owner: isOwner,
        is_team_owner: isTeamOwner,
        is_admin: isAdmin,
        is_team_member: isTeamMember,
      };
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be the group creator, team owner, or admin to delete this group",
        },
        { status: 403 }
      );
    }

    wideEvent.permissions = {
      is_owner: isOwner,
      is_team_owner: isTeamOwner,
      is_admin: isAdmin,
    };

    await prisma.comparisonGroup.delete({
      where: { id: groupId },
    });

    wideEvent.status_code = 200;
    wideEvent.outcome = "success";
    wideEvent.result = {
      deleted_group_id: groupId,
      group_name: group.name,
    };

    return NextResponse.json({
      success: true,
      message: "Comparison group deleted successfully",
    });
  } catch (error) {
    wideEvent.status_code = 500;
    wideEvent.outcome = "error";
    wideEvent.error = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "Error",
    };
    Logger.error("Error deleting comparison group", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete comparison group",
      },
      { status: 500 }
    );
  } finally {
    wideEvent.duration_ms = Date.now() - startTime;
    Logger.info(wideEvent);
  }
}
