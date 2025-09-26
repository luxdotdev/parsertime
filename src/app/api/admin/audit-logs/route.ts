import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums, type AuditLogAction, type Prisma } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) unauthorized();
  if (user.role !== $Enums.UserRole.ADMIN) forbidden();

  const searchParams = req.nextUrl.searchParams;
  const cursor = searchParams.get("cursor");
  const limit = searchParams.get("limit") ?? "10";
  const parsedLimit = parseInt(limit);
  const userEmailSearch = searchParams.get("userEmail");
  const targetSearch = searchParams.get("target");

  const actionParams = searchParams.getAll("action") as AuditLogAction[];
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const whereClause: Prisma.AuditLogWhereInput = {};

  if (actionParams.length > 0) {
    if (actionParams.length === 1) {
      whereClause.action = actionParams[0];
    } else {
      whereClause.action = { in: actionParams };
    }
  }

  if (userEmailSearch) {
    whereClause.userEmail = {
      contains: userEmailSearch,
      mode: "insensitive",
    };
  }

  if (targetSearch) {
    whereClause.target = {
      contains: targetSearch,
      mode: "insensitive",
    };
  }

  const createdAtFilter: Prisma.DateTimeFilter<"AuditLog"> = {};
  if (startDateParam) {
    const startDate = new Date(startDateParam);
    if (!isNaN(startDate.getTime())) {
      createdAtFilter.gte = startDate;
    }
  }
  if (endDateParam) {
    const endDate = new Date(endDateParam);
    if (!isNaN(endDate.getTime())) {
      createdAtFilter.lte = endDate;
    }
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereClause.createdAt = createdAtFilter;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: whereClause,
    take: parsedLimit,
    ...(cursor
      ? {
          skip: 1, // Skip the cursor
          cursor: {
            id: parseInt(cursor),
          },
        }
      : {}),
    orderBy: {
      createdAt: "desc",
    },
  });

  const nextCursor = auditLogs[auditLogs.length - 1]?.id;

  return NextResponse.json({
    items: auditLogs,
    nextCursor: nextCursor?.toString() ?? undefined,
    hasMore: auditLogs.length === parsedLimit,
  });
}
