import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import z from "zod";

const VodSchema = z.object({
  mapId: z.number().min(1),
  vodUrl: z.string().url(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await getUser(session.user.email);

    if (!user) {
      Logger.error("User not found for session: ", session);
      throw new Error("User not found");
    }

    const json = await req.json();
    const body = VodSchema.safeParse(json);

    if (!body.success) {
      Logger.error("Invalid request body: ", body.error);
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const { mapId, vodUrl } = body.data;

    // Validate input
    if (!mapId) {
      Logger.error("Missing mapId in request body");
      return new NextResponse("Missing mapId", { status: 400 });
    }

    if (!vodUrl) {
      Logger.error("Invalid or missing vodUrl in request body");
      return new NextResponse("Invalid or missing vodUrl", { status: 400 });
    }

    const updatedVod = await prisma?.map.upsert({
      where: { id: mapId },
      update: { vod: vodUrl },
      create: { id: mapId, vod: vodUrl, name: `Map ${mapId}` },
    });
    return new Response(JSON.stringify(updatedVod), { status: 200 });
  } catch (error) {
    Logger.error("Error in /api/vod route: ", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
