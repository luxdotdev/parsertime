import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { unauthorized } from "next/dist/client/components/navigation";

type VodRequestBody = {
  mapId: number;
  vodUrl: string;
};
export async function POST(req: Request) {
  const session = await auth();
  if (!session) unauthorized();

  const user = await getUser(session.user?.email);

  if (!user) {
    Logger.error("User not found for session: ", session);
    throw new Error("User not found");
  }

  const body = (await req.json()) as VodRequestBody;
  const { mapId, vodUrl } = body;

  // Validate input
  if (!mapId) {
    Logger.error("Missing mapId in request body");
    return new Response("Missing mapId", { status: 400 });
  }

  if (!vodUrl) {
    Logger.error("Invalid or missing vodUrl in request body");
    return new Response("Invalid or missing vodUrl", { status: 400 });
  }

  const updatedVod = await prisma?.map.upsert({
    where: { id: mapId },
    update: { vod: vodUrl },
    create: { id: mapId, vod: vodUrl, name: `Map ${mapId}` },
  });
  return new Response(JSON.stringify(updatedVod), { status: 200 });
}
