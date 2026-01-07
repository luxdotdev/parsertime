import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function DELETE() {
  const now = new Date();
  const tokens = await prisma.teamInviteToken.findMany({
    where: { expires: { lt: now } },
  });

  Logger.info(
    `Deleting ${tokens.length} expired token${tokens.length === 1 ? "" : "s"}: ${tokens.map((token) => token.id).join(", ")}`
  );

  for (const token of tokens) {
    Logger.info(`Deleting expired token: ${token.id}`);
    await prisma.teamInviteToken.delete({ where: { id: token.id } });
  }

  return new Response("OK", { status: 200 });
}

// This is necessary for using Vercel Cron Jobs
export async function GET() {
  return await DELETE();
}
