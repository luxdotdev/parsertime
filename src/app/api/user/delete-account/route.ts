import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  deleteUserWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { track } from "@vercel/analytics/server";
import { unauthorized } from "next/navigation";

export async function DELETE() {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) unauthorized();

  await track("User Deleted Account", { email: user.email });

  const wh = deleteUserWebhookConstructor(user);
  await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);

  Logger.log(`User ${user.email} deleted their account`);

  await prisma.user.delete({ where: { id: user.id } });

  return new Response("OK", { status: 200 });
}
