import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/data/user-dto";
import { track } from "@vercel/analytics/server";
import {
  deleteUserWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import Logger from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getUser(session.user.email);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await track("User Deleted Account", { email: user.email });

  const wh = deleteUserWebhookConstructor(user);
  await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);

  Logger.log(`User ${user.email} deleted their account`);

  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  return new Response("OK", { status: 200 });
}
