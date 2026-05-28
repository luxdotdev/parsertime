import { auditLog } from "@/lib/audit-logs";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums, type User } from "@prisma/client";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

function canUseBanner(user: Pick<User, "billingPlan" | "role">) {
  return user.billingPlan === $Enums.BillingPlan.PREMIUM || isAdminUser(user);
}

function isExpectedBlobUrl(urlString: string, userId: string) {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith(`/banners/${userId}`)
    );
  } catch {
    return false;
  }
}

const BannerUpdateSchema = z
  .object({
    userId: z.string().min(1),
    bannerImage: z.url(),
  })
  .refine((data) => isExpectedBlobUrl(data.bannerImage, data.userId), {
    message: "Invalid banner image URL",
    path: ["bannerImage"],
  });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) unauthorized();

  const body = BannerUpdateSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request", { status: 400 });
  }

  if (body.data.userId !== user.id) {
    unauthorized();
  }
  if (!canUseBanner(user))
    return new Response("Premium required", { status: 403 });

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
