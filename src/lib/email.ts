import Logger from "@/lib/logger";
import { type SendEmailRequest, SES } from "@aws-sdk/client-ses";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

type EmailArgs = {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo?: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
};

const config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_SES_REGION,
};

export async function sendEmail(args: EmailArgs) {
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  const identifier = args.to;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.log("Rate limit exceeded for email", identifier);
    throw new Error("Rate limit exceeded");
  }

  // Send email using AWS SES
  const email: SendEmailRequest = {
    Source: `lux.dev <${args.from}>`,
    ReplyToAddresses: args.replyTo,
    Destination: {
      ToAddresses: [args.to],
      CcAddresses: args.ccAddresses,
      BccAddresses: args.bccAddresses,
    },
    Message: {
      Subject: {
        Data: args.subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: args.html,
          Charset: "UTF-8",
        },
      },
    },
  };

  const ses = new SES(config);
  const res = await ses.sendEmail(email);
  return res;
}
