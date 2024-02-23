import Logger from "@/lib/logger";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { auth } from "@/lib/auth";
import { track } from "@vercel/analytics/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authedUser = await prisma.user.findUnique({
    where: { email: session.user.email ?? "" },
  });

  if (!authedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await request.json()) as HandleUploadBody;
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Create a new ratelimiter, that allows 5 requests per 1 minute
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  // Limit the requests to 5 per minute per user
  const identifier = `api/image-upload/${authedUser.id}`;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.log("Rate limit exceeded for user", authedUser.id);
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  Logger.log("Uploading avatar for user", userId);

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
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new Error("User not found");
        }

        return {
          tokenPayload: JSON.stringify({
            userId: user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow

        Logger.log("blob upload completed", blob, tokenPayload);
        await track("Image Upload", { label: "User Avatar" });

        try {
          // Run any logic after the file upload completed
          const { userId } = JSON.parse(tokenPayload as string) as {
            userId: string;
          };

          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (!user) {
            throw new Error("User not found");
          }

          await prisma.user.update({
            where: { id: user?.id },
            data: {
              image: blob.url,
            },
          });
        } catch (error) {
          throw new Error("Could not update user");
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
