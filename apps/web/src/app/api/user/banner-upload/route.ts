import { getCurrentUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit-logs";
import { canUploadBanner, imageKey, imageProxyPath } from "@/lib/avatar";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { Ratelimit } from "@upstash/ratelimit";
import { track } from "@vercel/analytics/server";
import { kv } from "@vercel/kv";
import { unauthorized } from "next/navigation";
import { after, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (!canUploadBanner(user)) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  if (request.headers.get("content-type") !== "image/png") {
    return NextResponse.json(
      { error: "Only image/png is supported" },
      { status: 415 }
    );
  }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });
  const { success } = await ratelimit.limit(`api/image-upload/${user.id}`);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  await r2.upload({
    key: imageKey("banner", user.id),
    body: buffer,
    contentType: "image/png",
  });

  const url = imageProxyPath("banner", user.id, Date.now());
  await prisma.user.update({
    where: { id: user.id },
    data: { bannerImage: url },
  });

  Logger.info("Banner uploaded to R2", { userId: user.id, url });
  await track("Image Upload", { label: "User Banner" });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "USER_BANNER_UPDATED",
      target: user.email,
      details: `Updated banner for user ${user.email}`,
    });
  });

  return NextResponse.json({ url });
}
