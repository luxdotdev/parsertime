import { getUserViewableScrims } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const userData = await getUser(session.user.email);
  if (!userData) unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "15"), 50); // Cap at 50
  const search = searchParams.get("search") ?? "";
  const filter = searchParams.get("filter") ?? "";
  const teamId = searchParams.get("teamId");
  const adminMode = searchParams.get("adminMode") === "true";

  try {
    // Check if user is admin/manager for admin mode
    const isAdmin =
      userData.role === $Enums.UserRole.ADMIN ||
      userData.role === $Enums.UserRole.MANAGER;

    // Get scrims based on admin mode
    let allScrims;
    if (adminMode && isAdmin) {
      // Admin mode: get all scrims
      allScrims = await prisma.scrim.findMany();
    } else {
      // Regular mode: get user viewable scrims
      allScrims = await getUserViewableScrims(userData.id);
    }

    // Filter by team if teamId is provided
    const filteredScrims = teamId
      ? allScrims.filter((scrim) => scrim.teamId === parseInt(teamId))
      : allScrims;

    // Get team names and creator names for all scrims in parallel
    const scrimDetails = await Promise.all(
      filteredScrims.map(async (scrim) => {
        const [teamName, creatorName] = await Promise.all([
          prisma.team.findFirst({
            where: { id: scrim.teamId ?? 0 },
          }),
          prisma.user.findFirst({
            where: { id: scrim.creatorId },
          }),
        ]);

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
          team: teamName?.name ?? "No Team",
          creator: creatorName?.name ?? "No Creator",
          hasPerms,
        };
      })
    );

    // Apply search filter
    let searchedScrims = scrimDetails;
    if (search) {
      searchedScrims = scrimDetails.filter((scrim) => {
        if (search.startsWith("team:")) {
          const teamName = search.slice(5).toLowerCase();
          return scrim.team.toLowerCase().includes(teamName);
        }
        if (search.startsWith("creator:")) {
          const creatorName = search.slice(8).toLowerCase();
          return scrim.creator.toLowerCase().includes(creatorName);
        }
        // General search by scrim name
        return scrim.name.toLowerCase().includes(search.toLowerCase());
      });
    }

    // Apply sorting filter
    let sortedScrims = searchedScrims;
    if (filter === "date-asc") {
      sortedScrims = searchedScrims.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } else if (filter === "date-desc") {
      sortedScrims = searchedScrims.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } else {
      // Default sort: newest to oldest
      sortedScrims = searchedScrims.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    // Calculate pagination
    const totalCount = sortedScrims.length;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;
    const paginatedScrims = sortedScrims.slice(offset, offset + limit);

    return NextResponse.json({
      scrims: paginatedScrims,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
    });
  } catch (error) {
    Logger.error("Error fetching scrims:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrims" },
      { status: 500 }
    );
  }
}
