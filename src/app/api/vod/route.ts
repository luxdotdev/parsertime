import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, canEditScrim } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { parseVodUrl } from "@/lib/vods";
import { NextResponse } from "next/server";
import z from "zod";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";

const VodSchema = z.object({
  mapId: z.number().min(1),
  vodUrl: z
    .string()
    .min(1)
    .transform((url, ctx) => {
      const parsedVod = parseVodUrl(url);
      if (!parsedVod) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid VOD URL",
        });
        return z.NEVER;
      }

      return parsedVod.normalizedUrl;
    }),
});

export async function POST(req: Request) {
  const session = await auth();

  if (!session) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

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

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    select: { scrimId: true },
  });
  if (!map?.scrimId) {
    return new NextResponse("Map not found", { status: 404 });
  }
  if (!(await canEditScrim(map.scrimId, user))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const updatedVod = await prisma.map.update({
    where: { id: mapId },
    data: { vod: vodUrl },
  });

  return new NextResponse(JSON.stringify(updatedVod), { status: 200 });
}
