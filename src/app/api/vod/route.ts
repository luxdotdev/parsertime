import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import z from "zod";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";

const ALLOWED_DOMAINS = [
  "https://www.youtube.com/",
  "https://youtube.com/",
  "https://youtu.be/",
  "https://www.twitch.tv/",
  "https://twitch.tv/",
];
const VodSchema = z.object({
  mapId: z.number().min(1),
  vodUrl: z
    .string()
    .url()
    .refine((url) => {
      return ALLOWED_DOMAINS.some((domain) => url.startsWith(domain));
    }),
});

export async function POST(req: Request) {
  const session = await auth();

  if (!session) unauthorized();

  const user = await getUser(session.user.email);

  if (!user) {
    Logger.error("User not found for session: ", session.user);
    return new NextResponse("User not found", { status: 404 });
  }

  const json = await req.json();
  const body = VodSchema.safeParse(json);

  if (!body.success) {
    Logger.error("Invalid request body: ", body.error);
    return new NextResponse("Invalid request body", { status: 400 });
  }

  const { mapId, vodUrl } = body.data;

  const updatedVod = await prisma.map.update({
    where: { id: mapId },
    data: { vod: vodUrl },
  });

  return new NextResponse(JSON.stringify(updatedVod), { status: 200 });
}
