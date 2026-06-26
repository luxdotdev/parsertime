import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums, type Prisma } from "@/generated/prisma/browser";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type ParsedPositiveInt =
  | { ok: true; value: number | undefined }
  | { ok: false; response: NextResponse };

function parseOptionalPositiveInt(
  value: string | null,
  name: string
): ParsedPositiveInt {
  if (value === null) return { ok: true, value: undefined };
  if (!/^[1-9]\d*$/.test(value)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `${name} must be a positive integer` },
        { status: 400 }
      ),
    };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `${name} is too large` },
        { status: 400 }
      ),
    };
  }

  return { ok: true, value: parsed };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const userData = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userData) unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const parsedCursor = parseOptionalPositiveInt(
    searchParams.get("cursor"),
    "cursor"
  );
  if (!parsedCursor.ok) return parsedCursor.response;

  const parsedPage = parseOptionalPositiveInt(searchParams.get("page"), "page");
  if (!parsedPage.ok) return parsedPage.response;

  const parsedLimit = parseOptionalPositiveInt(
    searchParams.get("limit"),
    "limit"
  );
  if (!parsedLimit.ok) return parsedLimit.response;

  const parsedTeamId = parseOptionalPositiveInt(
    searchParams.get("teamId"),
    "teamId"
  );
  if (!parsedTeamId.ok) return parsedTeamId.response;

  const cursor = parsedCursor.value;
  const page = parsedPage.value;
  const limit = Math.min(parsedLimit.value ?? 15, 50);
  const search = searchParams.get("search") ?? "";
  const filter = searchParams.get("filter") ?? "";
  const teamId = parsedTeamId.value;
  const adminMode = searchParams.get("adminMode") === "true";
  const lastPage = searchParams.get("lastPage") === "true";

  try {
    // Check if user is admin/manager for admin mode
    const isAdmin =
      userData.role === $Enums.UserRole.ADMIN ||
      userData.role === $Enums.UserRole.MANAGER;

    // Base scope (team + tournament exclusion) without the search filter, so we
    // can cheaply tell "no scrims at all" apart from "no scrims after filters"
    // without a second request from the client.
    // Exclude synthetic scrims created for tournament matches.
    const baseWhere: Prisma.ScrimWhereInput = {
      tournamentMatch: null,
    };

    // Filter by team if teamId is provided
    if (teamId) baseWhere.teamId = teamId;

    // Build where clause for database filtering (base scope + search)
    const whereClause: Prisma.ScrimWhereInput = { ...baseWhere };

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
      skipValue = Math.max(0, (page - 1) * limit);
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
                  id: cursor,
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
                  id: cursor,
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
        teamImage:
          scrim.Team?.image ??
          `https://avatar.vercel.sh/${scrim.Team?.name}.png`,
        creator: creatorMap.get(scrim.creatorId) ?? "Unknown",
        hasPerms,
        opponentTeamAbbr: scrim.opponentTeamAbbr,
      };
    });

    // Distinguish "no scrims at all" (onboarding) from "no scrims after
    // filters" (no-results message). Only pay for the existence check when the
    // filtered page came back empty — if there are results there are scrims.
    let hasAnyScrims = scrimDetails.length > 0;
    if (!hasAnyScrims) {
      const existing = await prisma.scrim.findFirst({
        where:
          adminMode && isAdmin
            ? baseWhere
            : {
                AND: [
                  {
                    OR: [
                      { creatorId: userData.id },
                      { Team: { users: { some: { id: userData.id } } } },
                    ],
                  },
                  baseWhere,
                ],
              },
        select: { id: true },
      });
      hasAnyScrims = existing !== null;
    }

    const nextCursor = scrims[scrims.length - 1]?.id;

    // Calculate hasMore based on pagination method
    let hasMore: boolean;
    if (lastPage) {
      hasMore = false;
    } else if (page) {
      const totalPages = Math.ceil(totalCount / limit);
      hasMore = page < totalPages;
    } else {
      hasMore = scrims.length === limit;
    }

    return NextResponse.json({
      scrims: scrimDetails,
      nextCursor: nextCursor?.toString() ?? undefined,
      hasMore,
      totalCount,
      hasAnyScrims,
    });
  } catch (error) {
    Logger.error("Error fetching scrims:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrims" },
      { status: 500 }
    );
  }
}
