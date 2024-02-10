import Logger from "@/lib/logger";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const teamId = request.nextUrl.searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  // Create a new ratelimiter, that allows 5 requests per 1 minute
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  // Limit the requests to 5 per minute per team
  const identifier = teamId;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname: string
        /* clientPayload?: string, */
      ) => {
        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
        const team = await prisma.team.findUnique({
          where: { id: parseInt(teamId) },
        });

        if (!team) {
          throw new Error("Team not found");
        }

        return {
          tokenPayload: JSON.stringify({
            teamId: team.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow

        Logger.log("blob upload completed", blob, tokenPayload);

        try {
          // Run any logic after the file upload completed
          const { teamId } = JSON.parse(tokenPayload as string) as {
            teamId: string;
          };

          const team = await prisma.team.findUnique({
            where: { id: parseInt(teamId) },
          });

          if (!team) {
            throw new Error("Team not found");
          }

          await prisma.team.update({
            where: { id: team.id },
            data: {
              image: blob.url,
            },
          });
        } catch (error) {
          throw new Error("Could not update team");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 } // The webhook will retry 5 times waiting for a 200
    );
  }
}
