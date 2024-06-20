import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { NextRequest } from "next/server";

type CreateTeamRequestData = {
  name: string;
  users: { id: string }[];
};

export async function POST(request: NextRequest) {
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  // Limit the requests to 5 per minute per user
  const identifier = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.log("Rate limit exceeded for creating a team", identifier);
    return new Response("Rate limit exceeded", {
      status: 429,
    });
  }

  const session = await auth();

  const userId = await getUser(session?.user?.email);

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const permission = await new Permission("create-team").check();
  if (!permission) {
    return new Response("Unauthorized", { status: 401 });
  }

  const numberOfTeams = await prisma.team.count({
    where: {
      ownerId: userId.id,
    },
  });

  switch (userId.billingPlan) {
    case "FREE":
      if (numberOfTeams >= 2) {
        return new Response(
          "You have hit the limit of teams that your account can create.  Please upgrade your plan or contact support.",
          { status: 403 }
        );
      }
      break;
    case "BASIC":
      if (numberOfTeams >= 5) {
        return new Response(
          "You have hit the limit of teams that your account can create.  Please upgrade your plan or contact support.",
          { status: 403 }
        );
      }
      break;
    case "PREMIUM":
      if (numberOfTeams >= 10) {
        return new Response(
          "You have hit the limit of teams that your account can create.  Please upgrade your plan or contact support.",
          { status: 403 }
        );
      }
      break;
    default:
      if (userId.role !== "ADMIN")
        return new Response("Unauthorized", { status: 401 });
      break;
  }

  const req = (await request.json()) as CreateTeamRequestData;

  if (!session) {
    Logger.warn("Unauthorized request to create team API");

    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const usersById = await prisma.user.findMany({
    where: {
      id: {
        in: req.users?.map((user: { id: string }) => user.id) ?? [],
      },
      AND: {
        id: userId?.id,
        role: "ADMIN",
      },
    },
  });

  const team = await prisma.team.create({
    data: {
      name: req.name,
      updatedAt: new Date(),
      users: {
        connect: [
          ...usersById.map((user) => {
            return {
              id: user.id,
            };
          }),
        ],
      },
      ownerId: userId.id ?? "",
    },
  });

  await prisma.user.update({
    where: {
      id: userId.id ?? "",
    },
    data: {
      teams: {
        connect: [
          {
            id: team.id,
          },
        ],
      },
    },
  });

  return new Response("Success", {
    status: 200,
  });
}
