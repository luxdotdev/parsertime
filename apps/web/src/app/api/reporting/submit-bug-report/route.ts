import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import {
  newBugReportWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import { after, type NextRequest, userAgent } from "next/server";
import { z } from "zod";

const BugReportSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(4000),
  email: z.email().max(254),
  url: z.string().min(1).max(2048),
});

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  prefix: "ratelimit:bug-report",
});

export async function POST(req: NextRequest) {
  const identifier = ipAddress(req) ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    Logger.warn("Rate limit exceeded for bug report", { ip: identifier });
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const ua = userAgent(req);

  const body = BugReportSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const session = await auth();
  const reporterEmail = session?.user?.email ?? body.data.email;
  const isAuthedReport = Boolean(session?.user?.email);
  const user = isAuthedReport
    ? await AppRuntime.runPromise(
        UserService.pipe(Effect.flatMap((svc) => svc.getUser(reporterEmail)))
      )
    : null;

  const wh = newBugReportWebhookConstructor(
    body.data.title,
    body.data.description,
    reporterEmail,
    body.data.url,
    isAuthedReport ? (user?.billingPlan ?? "N/A") : "N/A",
    ua.ua,
    ua.browser,
    ua.os,
    ua.device
  );

  await sendDiscordWebhook(process.env.BUG_REPORT_WEBHOOK_URL, wh);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: isAuthedReport ? (user?.email ?? reporterEmail) : "Anonymous",
      action: "BUG_REPORT_SUBMITTED",
      target: body.data.title,
      details: `Bug report submitted: ${body.data.title}`,
    });
  });

  return new Response("OK", { status: 200 });
}
