import ContactFormEmail from "@/components/email/contact-form";
import { render } from "@react-email/render";
import sendgrid from "@sendgrid/mail";
import { NextRequest } from "next/server";

type ContactFormEmailBody = {
  name: string;
  email: string;
  message: string;
};

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req: NextRequest) {
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
    console.log(error);

    return new Response("Error sending email", {
      status: 500,
    });
  }

  return new Response("OK", {
    status: 200,
  });
}
