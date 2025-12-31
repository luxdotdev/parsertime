import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import {
  newBugReportWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { after, type NextRequest, userAgent } from "next/server";
import { z } from "zod";

const BugReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  email: z.email(),
  url: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ua = userAgent(req);

  const body = BugReportSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const user = await getUser(body.data.email);

  const wh = newBugReportWebhookConstructor(
    body.data.title,
    body.data.description,
    body.data.email,
    body.data.url,
    user?.billingPlan ?? "N/A",
    ua.ua,
    ua.browser,
    ua.os,
    ua.device
  );

  await sendDiscordWebhook(process.env.BUG_REPORT_WEBHOOK_URL, wh);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user?.email ?? "Unknown",
      action: "BUG_REPORT_SUBMITTED",
      target: body.data.title,
      details: `Bug report submitted: ${body.data.title}`,
    });
  });

  return new Response("OK", { status: 200 });
}
