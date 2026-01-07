import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { track } from "@vercel/analytics/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { kv } from "@vercel/kv";
import { unauthorized } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) unauthorized();

  const userId = await getUser(session.user.email);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await request.json()) as HandleUploadBody;

  const teamId = request.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  // Create a new ratelimiter, that allows 5 requests per 1 minute
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  // Limit the requests to 5 per minute per user
  const identifier = `api/image-upload/${userId.id}`;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.warn(
      `Rate limit exceeded for team: ${teamId} for user: ${userId.id}`
    );
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  Logger.info(`Uploading avatar for team: ${teamId}`);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () =>
        /* clientPayload?: string, */
        {
          // Generate a client token for the browser to upload the file
          // ⚠️ Authenticate and authorize users before generating the token.
          // Otherwise, you're allowing anonymous uploads.
          const team = await prisma.team.findUnique({
            where: { id: parseInt(teamId) },
          });
          if (!team) throw new Error("Team not found");

          return { tokenPayload: JSON.stringify({ teamId: team.id }) };
        },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow

        Logger.info(`blob upload completed: ${blob.url} for team: ${teamId}`);
        await track("Image Upload", { label: "Team Avatar" });

        try {
          // Run any logic after the file upload completed
          const { teamId } = JSON.parse(tokenPayload!) as { teamId: string };

          const team = await prisma.team.findUnique({
            where: { id: parseInt(teamId) },
          });
          if (!team) throw new Error("Team not found");

          await prisma.team.update({
            where: { id: team.id },
            data: { image: blob.url },
          });
        } catch {
          throw new Error("Could not update team");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 400 } // The webhook will retry 5 times waiting for a 200
    );
  }
}
