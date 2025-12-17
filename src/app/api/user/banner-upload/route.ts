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

  if (!session?.user) {
    unauthorized();
  }

  const authedUser = await getUser(session.user.email);

  if (!authedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await request.json()) as HandleUploadBody;
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  const identifier = `api/image-upload/${authedUser.id}`;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    Logger.log("Rate limit exceeded for user", authedUser.id);
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  Logger.log("Uploading banner for user", userId);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        return { tokenPayload: JSON.stringify({ userId: user.id }) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        Logger.log("blob upload completed", blob, tokenPayload);
        await track("Image Upload", { label: "User Banner" });

        try {
          const { userId } = JSON.parse(tokenPayload!) as { userId: string };

          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user) throw new Error("User not found");

          await prisma.user.update({
            where: { id: user?.id },
            data: { bannerImage: blob.url },
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
      { status: 400 }
    );
  }
}
