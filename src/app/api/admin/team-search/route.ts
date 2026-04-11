import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { $Enums } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    method: "GET",
    path: "/api/admin/team-search",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session) unauthorized();

    const user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
    if (!user) unauthorized();
    if (
      user.role !== $Enums.UserRole.ADMIN &&
      user.role !== $Enums.UserRole.MANAGER
    )
      forbidden();

    event.user = { id: user.id, role: user.role };

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "12"), 50);
    const searchQuery = searchParams.get("search");
    const readonlyFilter = searchParams.get("readonly");
    const createdAfter = searchParams.get("createdAfter");
    const createdBefore = searchParams.get("createdBefore");
    const sort = searchParams.get("sort") ?? "date-desc";

    event.filters = {
      page,
      limit,
      search: searchQuery,
      readonly: readonlyFilter,
      createdAfter,
      createdBefore,
      sort,
    };

    const whereClause: Prisma.TeamWhereInput = {
      AND: [
        searchQuery
          ? {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            }
          : {},
        readonlyFilter && readonlyFilter !== "all"
          ? { readonly: readonlyFilter === "true" }
          : {},
        createdAfter || createdBefore
          ? {
              createdAt: {
                ...(createdAfter && { gte: new Date(createdAfter) }),
                ...(createdBefore && { lte: new Date(createdBefore) }),
              },
            }
          : {},
      ],
    };

    const [teams, totalCount] = await Promise.all([
      prisma.team.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          ownerId: true,
          readonly: true,
          _count: {
            select: {
              users: true,
              managers: true,
              scrims: true,
            },
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: sort === "date-asc" ? "asc" : "desc" },
      }),
      prisma.team.count({ where: whereClause }),
    ]);

    event.result = {
      teams_returned: teams.length,
      total_count: totalCount,
      has_more: page * limit < totalCount,
    };
    event.status_code = 200;
    event.outcome = "success";

    return NextResponse.json({
      items: teams,
      totalCount,
      hasMore: page * limit < totalCount,
    });
  } catch (error) {
    event.status_code = 500;
    event.outcome = "error";
    if (error instanceof Error) {
      event.error = { message: error.message, type: error.name };
    }
    throw error;
  } finally {
    event.duration_ms = Date.now() - startTime;
    Logger.info(event);
  }
}
