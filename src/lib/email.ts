import { SES } from "aws-sdk";

type EmailArgs = {
  to: string;
  from: string;
  subject: string;
  html: string;
};

const config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_SES_REGION,
};

export async function sendEmail(args: EmailArgs) {
  // Send email using AWS SES
  const email = {
    Source: args.from,
    Destination: {
      ToAddresses: [args.to],
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
  const res = await ses.sendEmail(email).promise();
  return res;
}
