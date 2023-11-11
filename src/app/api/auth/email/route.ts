import { NextRequest, NextResponse } from "next/server";
import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req: NextRequest, res: NextResponse) {
  const email = req.nextUrl.searchParams.get("email");
  const url = req.nextUrl.searchParams.get("url");

  if (!email) {
    return new Response("No email provided", {
      status: 400,
    });
  }

  try {
    await sendgrid.send({
      to: { email },
      from: "noreply@lux.dev",
      subject: `Sign in to Parsertime`,
      html: `
        Please click here to authenticate - ${url}
        `,
    });
  } catch (err: any) {
    console.log(err);
    // Extract error msg
    const { response } = err;

    // Extract response msg
    const { body } = response;

    return new Response(body, {
      status: err.statusCode || 500,
    });
  }

  return new Response("OK", {
    status: 200,
  });
}
