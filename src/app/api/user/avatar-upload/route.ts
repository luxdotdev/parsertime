import { getCurrentUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { track } from "@vercel/analytics/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { kv } from "@vercel/kv";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const userId = request.nextUrl.searchParams.get("userId");

  if (body.type === "blob.generate-client-token" && !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  Logger.info("Handling avatar upload request", {
    userId: userId ?? "callback",
    type: body.type,
  });

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // pathname: string
        /* clientPayload?: string, */
        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
        const authedUser = await getCurrentUser();
        if (!authedUser) throw new Error("Unauthorized");
        if (authedUser.id !== userId) throw new Error("Forbidden");
        if (pathname !== `avatars/${authedUser.id}.png`) {
          throw new Error("Invalid upload path");
        }

        const ratelimit = new Ratelimit({
          redis: kv,
          limiter: Ratelimit.slidingWindow(5, "1 m"),
          analytics: true,
        });
        const { success } = await ratelimit.limit(
          `api/image-upload/${authedUser.id}`
        );
        if (!success) throw new Error("Rate limit exceeded");

        return {
          tokenPayload: JSON.stringify({ userId: authedUser.id }),
          allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
          maximumSizeInBytes: 5 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow

        try {
          // Run any logic after the file upload completed
          const { userId } = JSON.parse(tokenPayload ?? "{}") as {
            userId?: string;
          };
          if (!userId) throw new Error("Missing token payload userId");

          Logger.info("Avatar blob upload completed", {
            blobUrl: blob.url,
            userId,
          });
          await track("Image Upload", { label: "User Avatar" });

          await prisma.user.update({
            where: { id: userId },
            data: { image: blob.url },
          });
        } catch {
          throw new Error("Could not update user");
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
