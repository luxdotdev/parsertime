import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { $Enums } from "@prisma/client";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { forbidden, unauthorized } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) unauthorized();

  const user = await getUser(session.user.email);
  if (!user) unauthorized();
  if (user.role !== $Enums.UserRole.ADMIN) forbidden();

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // eslint-disable-next-line @typescript-eslint/require-await
      onBeforeGenerateToken: async () => {
        return {
          tokenPayload: JSON.stringify({ userId: user.id }),
          maximumSizeInBytes: 150 * 1024 * 1024,
        };
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      onUploadCompleted: async ({ blob }) => {
        Logger.info(`Map image upload completed: ${blob.url}`);
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
