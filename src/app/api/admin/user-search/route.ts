import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { $Enums } from "@prisma/client";
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
  const searchQuery = searchParams.get("search");
  const billingPlan = searchParams.get("billingPlan");
  const joinedAfter = searchParams.get("joinedAfter");
  const joinedBefore = searchParams.get("joinedBefore");

  const whereClause: Prisma.UserWhereInput = {
    AND: [
      // Search by username or email
      searchQuery
        ? {
            OR: [
              {
                name: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
      // Filter by billing plan
      billingPlan
        ? {
            billingPlan: billingPlan as $Enums.BillingPlan,
          }
        : {},
      // Filter by join date range
      joinedAfter || joinedBefore
        ? {
            createdAt: {
              ...(joinedAfter && { gte: new Date(joinedAfter) }),
              ...(joinedBefore && { lte: new Date(joinedBefore) }),
            },
          }
        : {},
    ],
  };

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      billingPlan: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
    take: parsedLimit,
    ...(cursor
      ? {
          skip: 1, // Skip the cursor
          cursor: {
            id: cursor,
          },
        }
      : {}),
  });

  const nextCursor = users[users.length - 1]?.id;

  return NextResponse.json({
    items: users,
    nextCursor: nextCursor ?? null,
    hasMore: users.length === parsedLimit,
  });
}
