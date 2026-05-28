import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";

function isAuthorizedCronRequest(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("Authorization") === `Bearer ${secret}`);
}

async function deleteExpiredTokens() {
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

export async function DELETE(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return await deleteExpiredTokens();
}

// This is necessary for using Vercel Cron Jobs
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return await deleteExpiredTokens();
}
