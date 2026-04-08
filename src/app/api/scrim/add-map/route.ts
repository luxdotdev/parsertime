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
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "POST /api/scrim/add-map",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();

    const id = req.nextUrl.searchParams.get("id") ?? "";
    event.scrim_id_raw = id;

    const data = (await req.json()) as AddMapRequestData;
    event.has_hero_bans = (data.heroBans?.length ?? 0) > 0;
    event.hero_ban_count = data.heroBans?.length ?? 0;

    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      event.status_code = 401;
      unauthorized();
    }

    event.user_email = session.user.email;

    const scrimId = parseInt(id);
    event.scrim_id = scrimId;
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

    event.team_id = scrim?.teamId;
    event.auto_assign_team_names = scrim?.autoAssignTeamNames ?? false;

    if (scrim?.autoAssignTeamNames && scrim.teamId && scrim.team1Name) {
      event.normalized_teams = true;
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
    const parseDuration = performance.now() - parseStart;
    scrimParsingDuration.record(parseDuration);
    mapAddedCounter.add(1);

    event.parse_duration_ms = Math.round(parseDuration);
    event.outcome = "success";
    event.status_code = 200;

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
    event.outcome = "error";
    event.status_code = 500;
    event.error = {
      message: e instanceof Error ? e.message : String(e),
      type: e instanceof Error ? e.name : "UnknownError",
    };

    if (e instanceof Error) return new Response(e.message, { status: 500 });

    return new Response("Internal Server Error", { status: 500 });
  } finally {
    event.duration_ms = Date.now() - startTime;
    Logger.info(event);
  }
}
