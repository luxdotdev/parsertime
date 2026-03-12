import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export function authenticateBotSecret(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  return token.length > 0 && token === process.env.BOT_SECRET;
}

export async function resolveDiscordUser(discordId: string) {
  const account = await prisma.account.findFirst({
    where: {
      provider: "discord",
      providerAccountId: discordId,
    },
    include: {
      user: true,
    },
  });

  return account?.user ?? null;
}

export async function verifyTeamAccess(
  userId: string,
  teamId: number
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === $Enums.UserRole.ADMIN) {
    return true;
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: {
      users: { where: { id: userId }, select: { id: true } },
    },
  });

  return (team?.users?.length ?? 0) > 0;
}
