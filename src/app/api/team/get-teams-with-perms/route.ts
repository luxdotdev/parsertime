import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { unauthorized } from "next/navigation";

export async function GET() {
  const session = await auth();

  if (!session) {
    Logger.warn("Unauthorized request to get teams API");
    unauthorized();
  }

  const userId = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  // find teams where the user is the owner or a manager
  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { ownerId: userId?.id },
        {
          users: {
            some: {
              id: userId?.id,
              role: { in: [$Enums.UserRole.MANAGER, $Enums.UserRole.ADMIN] },
            },
          },
        },
        { managers: { some: { userId: userId?.id } } },
      ],
      id: { not: 0 },
    },
  });

  const teamResponse = {
    teams: teams
      .filter((team) => !team.readonly)
      .map((team) => {
        return {
          id: team.id,
          name: team.name,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          ownerId: team.ownerId,
          image: team.image,
          readonly: team.readonly,
        };
      }),
  };

  return new Response(JSON.stringify(teamResponse), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
