import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { mapAddedCounter, scrimParsingDuration } from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import prisma from "@/lib/prisma";
import { normalizeMapForScrim } from "@/lib/team-normalization";
import type { ParserData } from "@/types/parser";
import { track } from "@vercel/analytics/server";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export type AddMapRequestData = {
  map: ParserData;
  heroBans?: {
    hero: string;
    team: string;
    banPosition: number;
  }[];
};

export async function POST(req: NextRequest) {
  const session = await auth();

  const id = req.nextUrl.searchParams.get("id") ?? "";

  const data = (await req.json()) as AddMapRequestData;

  if (!session || !session.user || !session.user.email) {
    Logger.warn("Unauthorized request to add map");
    unauthorized();
  }

  try {
    const scrimId = parseInt(id);
    let mapData = data.map;

    const scrim = await prisma.scrim.findUnique({
      where: { id: scrimId },
      select: {
        autoAssignTeamNames: true,
        team1Name: true,
        team2Name: true,
        teamId: true,
      },
    });

    if (scrim?.autoAssignTeamNames && scrim.teamId && scrim.team1Name) {
      mapData = await normalizeMapForScrim(
        mapData,
        scrim.teamId,
        scrim.team1Name,
        scrim.team2Name
      );
    }

    const parseStart = performance.now();
    await createNewMap(
      {
        map: mapData,
        scrimId,
        heroBans: data.heroBans,
      },
      session
    );
    scrimParsingDuration.record(performance.now() - parseStart);
    mapAddedCounter.add(1);

    after(async () => {
      await Promise.all([
        track("Create Map", { user: session.user.email }),
        auditLog.createAuditLog({
          userEmail: session.user.email,
          action: "MAP_CREATED",
          target: id,
          details: `Map created: ${id}`,
        }),
      ]);
    });

    return new Response("OK", { status: 200 });
  } catch (e: unknown) {
    Logger.error("Error adding map", e);

    if (e instanceof Error) return new Response(e.message, { status: 500 });

    return new Response("Internal Server Error", { status: 500 });
  }
}
