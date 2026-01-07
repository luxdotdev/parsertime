import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const BannerUpdateSchema = z.object({
  userId: z.string().min(1),
  bannerImage: z.url(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) unauthorized();

  const body = BannerUpdateSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: body.data.userId },
  });
  if (!user) return new Response("Not found", { status: 404 });

  if (user.email !== session.user.email) {
    unauthorized();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { bannerImage: body.data.bannerImage },
  });

  Logger.info(
    `new banner uploaded for user: ${user.email}: ${body.data.bannerImage}`
  );

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "USER_BANNER_UPDATED",
      target: user.email,
      details: `Updated banner for user ${user.email}`,
    });
  });

  return new Response("OK", { status: 200 });
}
