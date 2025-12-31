import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const UpdateBattletagSchema = z.object({
  battletag: z
    .string()
    .min(2, {
      message: "Battletag must be at least 2 characters.",
    })
    .max(12, {
      message: "Battletag must not be longer than 12 characters.",
    })
    .trim()
    .regex(/^(?!.*?:).*$/),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) unauthorized();

  const body = UpdateBattletagSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid battletag supplied", { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { battletag: body.data.battletag },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: session.user.email,
      action: "USER_BATTLETAG_UPDATED",
      target: session.user.email,
      details: `Updated battletag for user ${session.user.email} to ${body.data.battletag}`,
    });
  });

  return new Response("OK", { status: 200 });
}
