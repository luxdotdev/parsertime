import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export type BotAuthResult = {
  keyId: string;
  guildId: string;
  name: string;
};

export async function authenticateBotRequest(
  request: Request
): Promise<BotAuthResult | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const key = authHeader.slice(7);
  if (!key) {
    return null;
  }

  const botApiKey = await prisma.botApiKey.findUnique({
    where: { key },
  });

  if (!botApiKey || botApiKey.revokedAt) {
    return null;
  }

  return {
    keyId: botApiKey.id,
    guildId: botApiKey.guildId,
    name: botApiKey.name,
  };
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
