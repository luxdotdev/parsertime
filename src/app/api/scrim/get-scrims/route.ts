import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums, type Prisma } from "@prisma/client";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const userData = await getUser(session.user.email);
  if (!userData) unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const cursor = searchParams.get("cursor");
  const page = searchParams.get("page");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "15"), 50); // Cap at 50
  const search = searchParams.get("search") ?? "";
  const filter = searchParams.get("filter") ?? "";
  const teamId = searchParams.get("teamId");
  const adminMode = searchParams.get("adminMode") === "true";
  const lastPage = searchParams.get("lastPage") === "true";

  try {
    // Check if user is admin/manager for admin mode
    const isAdmin =
      userData.role === $Enums.UserRole.ADMIN ||
      userData.role === $Enums.UserRole.MANAGER;

    // Build where clause for database filtering
    const whereClause: Prisma.ScrimWhereInput = {};

    // Filter by team if teamId is provided
    if (teamId) {
      whereClause.teamId = parseInt(teamId);
    }

    // Apply search filter at database level
    if (search) {
      if (search.startsWith("team:")) {
        const teamName = search.slice(5);
        whereClause.Team = {
          name: {
            contains: teamName,
            mode: "insensitive",
          },
        };
      } else if (search.startsWith("creator:")) {
        const creatorName = search.slice(8);
        // Find creator IDs that match the name
        const creators = await prisma.user.findMany({
          where: {
            name: {
              contains: creatorName,
              mode: "insensitive",
            },
          },
          select: { id: true },
        });
        const creatorIds = creators.map((c) => c.id);
        whereClause.creatorId = { in: creatorIds };
      } else {
        // General search by scrim name
        whereClause.name = {
          contains: search,
          mode: "insensitive",
        };
      }
    }

    // Determine order by based on filter
    let orderBy: Prisma.ScrimOrderByWithRelationInput = { date: "desc" }; // Default: newest to oldest
    if (filter === "date-asc") {
      orderBy = { date: "asc" };
    } else if (filter === "date-desc") {
      orderBy = { date: "desc" };
    }

    // Get total count for pagination (needed for lastPage calculation)
    let totalCount;
    if (adminMode && isAdmin) {
      totalCount = await prisma.scrim.count({
        where: whereClause,
      });
    } else {
      totalCount = await prisma.scrim.count({
        where: {
          AND: [
            {
              OR: [
                { creatorId: userData.id },
                { Team: { users: { some: { id: userData.id } } } },
              ],
            },
            whereClause,
          ],
        },
      });
    }

    // Calculate skip for last page or specific page if needed
    let skipValue: number | undefined;
    if (lastPage) {
      skipValue = Math.max(0, totalCount - limit);
    } else if (page) {
      const pageNum = parseInt(page);
      skipValue = Math.max(0, (pageNum - 1) * limit);
    }

    // Get scrims with pagination
    let scrims;
    if (adminMode && isAdmin) {
      // Admin mode: get all scrims with pagination
      scrims = await prisma.scrim.findMany({
        where: whereClause,
        take: limit,
        ...(lastPage || page
          ? { skip: skipValue }
          : cursor
            ? {
                skip: 1, // Skip the cursor
                cursor: {
                  id: parseInt(cursor),
                },
              }
            : {}),
        orderBy,
        include: {
          Team: true,
        },
      });
    } else {
      // Regular mode: get user viewable scrims with pagination
      scrims = await prisma.scrim.findMany({
        where: {
          AND: [
            {
              OR: [
                { creatorId: userData.id },
                { Team: { users: { some: { id: userData.id } } } },
              ],
            },
            whereClause,
          ],
        },
        take: limit,
        ...(lastPage || page
          ? { skip: skipValue }
          : cursor
            ? {
                skip: 1, // Skip the cursor
                cursor: {
                  id: parseInt(cursor),
                },
              }
            : {}),
        orderBy,
        include: {
          Team: true,
        },
      });
    }

    // Get creator names for all scrims
    const creatorIds = [...new Set(scrims.map((scrim) => scrim.creatorId))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true },
    });
    const creatorMap = new Map(creators.map((c) => [c.id, c.name]));

    // Transform the data to match the expected format
    const scrimDetails = scrims.map((scrim) => {
      const hasPerms =
        adminMode && isAdmin
          ? true // Admins have permissions on all scrims in admin mode
          : userData.role === $Enums.UserRole.ADMIN ||
            userData.role === $Enums.UserRole.MANAGER ||
            userData.id === scrim.creatorId;

      return {
        id: scrim.id,
        name: scrim.name,
        createdAt: scrim.createdAt,
        updatedAt: scrim.updatedAt,
        date: scrim.date,
        teamId: scrim.teamId ?? 0,
        creatorId: scrim.creatorId,
        guestMode: scrim.guestMode,
        team: scrim.Team?.name ?? "Individual",
        creator: creatorMap.get(scrim.creatorId) ?? "Unknown",
        hasPerms,
      };
    });

    const nextCursor = scrims[scrims.length - 1]?.id;

    // Calculate hasMore based on pagination method
    let hasMore: boolean;
    if (lastPage) {
      hasMore = false;
    } else if (page) {
      const pageNum = parseInt(page);
      const totalPages = Math.ceil(totalCount / limit);
      hasMore = pageNum < totalPages;
    } else {
      hasMore = scrims.length === limit;
    }

    return NextResponse.json({
      scrims: scrimDetails,
      nextCursor: nextCursor?.toString() ?? undefined,
      hasMore,
      totalCount,
    });
  } catch (error) {
    Logger.error("Error fetching scrims:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrims" },
      { status: 500 }
    );
  }
}
