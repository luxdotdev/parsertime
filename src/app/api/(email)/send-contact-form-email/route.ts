import ContactFormEmail from "@/components/email/contact-form";
import Logger from "@/lib/logger";
import { render } from "@react-email/render";
import sendgrid from "@sendgrid/mail";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { NextRequest } from "next/server";

type ContactFormEmailBody = {
  name: string;
  email: string;
  message: string;
};

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req: NextRequest) {
  // Create a new ratelimiter, that allows 5 requests per 1 minute
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(3, "1 m"),
    analytics: true,
  });

  // Limit the requests to 5 per minute per user
  const identifier = req.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.log("Rate limit exceeded for contact form email", identifier);
    return new Response("Rate limit exceeded", {
      status: 429,
    });
  }

  const body = (await req.json()) as ContactFormEmailBody;

  const emailHtml = render(
    ContactFormEmail({
      name: body.name,
      email: body.email,
      message: body.message,
    })
  );

  try {
    await sendgrid.send({
      to: "help@parsertime.app",
      from: "noreply@lux.dev",
      subject: `New message from ${body.name} | Parsertime`,
      html: emailHtml,
    });
  } catch (error) {
    Logger.error("Error sending email", error);

    return new Response("Error sending email", {
      status: 500,
    });
  }

  return new Response("OK", {
    status: 200,
  });
}
