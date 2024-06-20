import { getUser } from "@/data/user-dto";
import {
  newBugReportWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { NextRequest, userAgent } from "next/server";

export async function POST(req: NextRequest) {
  const ua = userAgent(req);

  const body = (await req.json()) as {
    title: string;
    description: string;
    email: string;
    url: string;
  };

  const user = await getUser(body.email);

  const wh = newBugReportWebhookConstructor(
    body.title,
    body.description,
    body.email,
    body.url,
    user?.billingPlan ?? "N/A",
    ua.ua,
    ua.browser,
    ua.os,
    ua.device
  );

  await sendDiscordWebhook(process.env.BUG_REPORT_WEBHOOK_URL, wh);

  return new Response("OK", { status: 200 });
}
