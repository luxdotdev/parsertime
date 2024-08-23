import { getUser } from "@/data/user-dto";
import {
  newBugReportWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { NextRequest, userAgent } from "next/server";
import { z } from "zod";

const BugReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  email: z.string().email(),
  url: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ua = userAgent(req);

  const body = BugReportSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request", { status: 400 });
  }

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

  return new Response("OK", { status: 200 });
}
