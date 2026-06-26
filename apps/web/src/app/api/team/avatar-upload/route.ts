import { canManageTeam, getCurrentUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit-logs";
import { imageKey, imageProxyPath } from "@/lib/avatar";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/r2";
import { Ratelimit } from "@upstash/ratelimit";
import { track } from "@vercel/analytics/server";
import { kv } from "@vercel/kv";
import { unauthorized } from "next/navigation";
import { after, NextResponse } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) unauthorized();

  const teamId = Number(new URL(request.url).searchParams.get("teamId"));
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }
  if (!(await canManageTeam(teamId, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    key: imageKey("team", String(teamId)),
    body: buffer,
    contentType: "image/png",
  });

  const team = await prisma.team.update({
    where: { id: teamId },
    data: { image: imageProxyPath("team", String(teamId), Date.now()) },
    select: { id: true, name: true, image: true },
  });

  Logger.info("Team avatar uploaded to R2", { teamId, url: team.image });
  await track("Image Upload", { label: "Team Avatar" });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "TEAM_AVATAR_UPDATED",
      target: team.name,
      details: `Updated avatar for team ${team.name}`,
    });
  });

  return NextResponse.json({ url: team.image });
}
