import { SendEmailRequest, SES } from "@aws-sdk/client-ses";

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
