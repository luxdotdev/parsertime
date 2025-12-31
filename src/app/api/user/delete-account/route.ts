import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  deleteUserWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { track } from "@vercel/analytics/server";
import { unauthorized } from "next/navigation";
import { after } from "next/server";

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

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "USER_ACCOUNT_DELETED",
      target: user.email,
      details: `User deleted their account`,
    });
  });

  return new Response("OK", { status: 200 });
}
