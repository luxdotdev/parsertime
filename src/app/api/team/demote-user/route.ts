import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const DemoteUserSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const authToken = req.headers.get("Authorization");
  const devTokenAuthed = authToken === process.env.DEV_TOKEN;

  if (!session || !session.user || !session.user.email) {
    if (!devTokenAuthed) return new Response("Unauthorized", { status: 401 });
    Logger.log("Authorized with dev token");
  }

  const body = DemoteUserSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const { teamId, userId } = body.data;

  const team = await prisma.team.findFirst({ where: { id: parseInt(teamId) } });
  if (!team) return new Response("Team not found", { status: 404 });

  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const authedUser = await getUser(session?.user?.email);

  if (!authedUser && !devTokenAuthed) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!devTokenAuthed) {
    const managers = await prisma.team.findFirst({
      where: { id: parseInt(teamId) },
      select: { managers: { where: { userId: authedUser?.id } } },
    });

    const isManager = managers?.managers.some(
      (manager) => manager.userId === authedUser?.id
    );

    if (team.ownerId !== authedUser?.id && !isManager) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // demote user to member
  await prisma.teamManager.deleteMany({
    where: { userId: user.id, teamId: team.id },
  });

  return new Response("OK", { status: 200 });
}
