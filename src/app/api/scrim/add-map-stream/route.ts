import { auditLog } from "@/lib/audit-logs";
import { auth, canEditScrim, getCurrentUser } from "@/lib/auth";
import { mapAddedCounter, scrimParsingDuration } from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import prisma from "@/lib/prisma";
import { createNdjsonStream } from "@/lib/progress-stream";
import { normalizeMapForScrim } from "@/lib/team-normalization";
import { track } from "@vercel/analytics/server";
import type { NextRequest } from "next/server";
import type { AddMapRequestData } from "../add-map/route";

/**
 * Streaming variant of POST /api/scrim/add-map. Behaves identically up to the
 * point of insertion, then returns an NDJSON progress stream instead of a flat
 * "OK". The non-streaming route is kept intact as a fallback; reverting this
 * feature is just pointing the client back at it.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "POST /api/scrim/add-map-stream",
    timestamp: new Date().toISOString(),
  };

  const session = await auth();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const data = (await req.json()) as AddMapRequestData;

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const scrimId = parseInt(id);
  if (!Number.isInteger(scrimId)) {
    return new Response("Invalid scrim ID", { status: 400 });
  }
  event.scrim_id = scrimId;

  const user = await getCurrentUser();
  if (!(await canEditScrim(scrimId, user))) {
    return new Response("Forbidden", { status: 403 });
  }

  const scrim = await prisma.scrim.findUnique({
    where: { id: scrimId },
    select: {
      autoAssignTeamNames: true,
      team1Name: true,
      team2Name: true,
      teamId: true,
    },
  });

  let mapData = data.map;
  if (scrim?.autoAssignTeamNames && scrim.teamId && scrim.team1Name) {
    mapData = await normalizeMapForScrim(
      mapData,
      scrim.teamId,
      scrim.team1Name,
      scrim.team2Name
    );
  }

  return createNdjsonStream(async (emit) => {
    try {
      const parseStart = performance.now();
      const result = await createNewMap(
        { map: mapData, scrimId, order: data.order, heroBans: data.heroBans },
        session,
        (completed, total) => emit({ type: "progress", completed, total })
      );
      const parseDuration = performance.now() - parseStart;
      scrimParsingDuration.record(parseDuration);
      mapAddedCounter.add(1);

      emit({ type: "done", mapId: result.mapId });
      event.outcome = "success";
      event.parse_duration_ms = Math.round(parseDuration);

      try {
        await Promise.all([
          track("Create Map", { user: session.user.email }),
          auditLog.createAuditLog({
            userEmail: session.user.email,
            action: "MAP_CREATED",
            target: id,
            details: `Map created: ${id}`,
          }),
        ]);
      } catch {
        // Analytics/audit are best-effort; the map is already persisted.
      }
    } catch (e) {
      event.outcome = "error";
      event.error = e instanceof Error ? e.message : String(e);
      emit({
        type: "error",
        message: e instanceof Error ? e.message : "Internal Server Error",
      });
    } finally {
      event.duration_ms = Date.now() - startTime;
      Logger.info(event);
    }
  });
}
